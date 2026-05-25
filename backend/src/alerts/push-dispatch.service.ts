import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import { AppConfigService } from '../config/app-config.service';
import { PushSubscriptionRepository } from '../integrations/repositories/push-subscription.repository';
import type { MissedMedicationAlertRecord } from '../integrations/types';

export interface PushDispatchResult {
  log: Array<{ userId: string; subscriptionId: string; success: boolean; statusCode?: number; error?: string }>;
  allFailed: boolean;
}

export interface GenericPushPayload {
  title: string;
  body: string;
  url: string;
}

@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);
  private vapidConfigured = false;

  constructor(
    private readonly pushSubRepo: PushSubscriptionRepository,
    private readonly appConfig: AppConfigService,
  ) {
    this.configureVapid();
  }

  private configureVapid(): void {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = this.appConfig.config;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
      this.logger.warn('VAPID keys not configured; Web Push disabled');
      return;
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    this.vapidConfigured = true;
  }

  async dispatch(alert: MissedMedicationAlertRecord): Promise<PushDispatchResult> {
    const log: PushDispatchResult['log'] = [];
    const subscriptions = await this.pushSubRepo.findByUserIds(alert.push_recipient_user_ids);

    if (!this.vapidConfigured || subscriptions.length === 0) {
      for (const userId of alert.push_recipient_user_ids) {
        log.push({
          userId,
          subscriptionId: 'none',
          success: false,
          error: 'no_subscription',
        });
      }
      return { log, allFailed: true };
    }

    let successCount = 0;
    for (const sub of subscriptions) {
      if (sub.platform !== 'web_push' || !sub.p256dh || !sub.auth) {
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          error: 'unsupported_platform',
        });
        continue;
      }

      try {
        const result = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: 'Missed medication',
            body: alert.push_body,
            data: { url: alert.deep_link_url },
          }),
        );
        successCount++;
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: true,
          statusCode: result.statusCode,
        });
      } catch (err: unknown) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode: unknown }).statusCode)
            : undefined;
        const message = err instanceof Error ? err.message : 'push_failed';
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          statusCode,
          error: message,
        });
        this.logger.warn(`push_failed subscriptionId=${sub.id} status=${statusCode ?? 'unknown'}`);
      }
    }

    return { log, allFailed: successCount === 0 };
  }

  async sendToUsers(userIds: string[], payload: GenericPushPayload): Promise<void> {
    if (!this.vapidConfigured) {
      this.logger.warn('sendToUsers_skipped: VAPID not configured');
      return;
    }
    if (userIds.length === 0) return;

    const subscriptions = await this.pushSubRepo.findByUserIds(userIds);
    if (subscriptions.length === 0) {
      this.logger.warn(`sendToUsers_no_subscriptions userIds=${userIds.join(',')}`);
      return;
    }
    await Promise.all(
      subscriptions.map(async (sub) => {
        if (sub.platform !== 'web_push' || !sub.p256dh || !sub.auth) return;
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: payload.title, body: payload.body, data: { url: payload.url } }),
          );
        } catch (err: unknown) {
          const statusCode =
            typeof err === 'object' && err !== null && 'statusCode' in err
              ? Number((err as { statusCode: unknown }).statusCode)
              : undefined;
          this.logger.warn(`push_failed sub=${sub.id} status=${statusCode ?? 'unknown'}`);
        }
      }),
    );
  }
}
