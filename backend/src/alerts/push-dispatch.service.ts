import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import webpush from 'web-push';
import * as admin from 'firebase-admin';
import { AppConfigService } from '../config/app-config.service';
import { PushSubscriptionRepository } from '../integrations/repositories/push-subscription.repository';
import type { MissedMedicationAlertRecord } from '../integrations/types';

export interface PushDispatchResult {
  log: Array<{
    userId: string;
    subscriptionId: string;
    success: boolean;
    statusCode?: number;
    error?: string;
  }>;
  allFailed: boolean;
}

export interface GenericPushPayload {
  title: string;
  body: string;
  url: string;
}

@Injectable()
export class PushDispatchService implements OnModuleInit {
  private readonly logger = new Logger(PushDispatchService.name);
  private vapidConfigured = false;
  private firebaseConfigured = false;

  constructor(
    private readonly pushSubRepo: PushSubscriptionRepository,
    private readonly appConfig: AppConfigService,
  ) {}

  onModuleInit() {
    this.configureVapid();
    this.configureFirebase();
  }

  private configureVapid(): void {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } =
      this.appConfig.config;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
      this.logger.warn('VAPID keys not configured; Web Push disabled');
      return;
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    this.vapidConfigured = true;
  }

  private configureFirebase(): void {
    const { FIREBASE_SERVICE_ACCOUNT_PATH } = process.env;
    if (FIREBASE_SERVICE_ACCOUNT_PATH) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT_PATH),
        });
      }
      this.firebaseConfigured = true;
    } else {
      this.logger.warn('Firebase Admin SDK not configured; FCM disabled');
    }
  }

  async dispatch(
    alert: MissedMedicationAlertRecord,
  ): Promise<PushDispatchResult> {
    const log: PushDispatchResult['log'] = [];
    const subscriptions = await this.pushSubRepo.findByUserIds(
      alert.push_recipient_user_ids,
    );

    if (
      (!this.vapidConfigured && !this.firebaseConfigured) ||
      subscriptions.length === 0
    ) {
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
      if (sub.platform === 'fcm' && !this.firebaseConfigured) {
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          error: 'fcm_not_configured',
        });
        continue;
      }
      if (
        sub.platform === 'web_push' &&
        (!this.vapidConfigured || !sub.p256dh || !sub.auth)
      ) {
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          error: 'unsupported_platform',
        });
        continue;
      }

      try {
        let statusCode: number | undefined;
        if (sub.platform === 'fcm') {
          await admin.messaging().send({
            token: sub.endpoint,
            notification: { title: 'Missed medication', body: alert.push_body },
            // checklistItemId allows the service worker to tag the notification
            // so it can be targeted for silent dismissal later.
            data: {
              url: alert.deep_link_url,
              checklistItemId: alert.checklist_item_id,
            },
          });
          statusCode = 200;
        } else {
          const result = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
            },
            JSON.stringify({
              title: 'Missed medication',
              body: alert.push_body,
              // tag is used by the service worker for getNotifications({ tag })
              tag: alert.checklist_item_id,
              data: { url: alert.deep_link_url },
            }),
          );
          statusCode = result.statusCode;
        }
        successCount++;
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: true,
          statusCode,
        });
      } catch (err: unknown) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number(err.statusCode)
            : undefined;
        const message = err instanceof Error ? err.message : 'push_failed';
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          statusCode,
          error: message,
        });
        this.logger.warn(
          `push_failed subscriptionId=${sub.id} status=${statusCode ?? 'unknown'} platform=${sub.platform} message=${message}`,
        );
      }
    }

    return { log, allFailed: successCount === 0 };
  }

  async sendToUsers(
    userIds: string[],
    payload: GenericPushPayload,
  ): Promise<PushDispatchResult> {
    const log: PushDispatchResult['log'] = [];

    if (userIds.length === 0) return { log, allFailed: true };

    if (!this.vapidConfigured && !this.firebaseConfigured) {
      this.logger.warn('sendToUsers_skipped: Push not configured');
      for (const userId of userIds) {
        log.push({
          userId,
          subscriptionId: 'none',
          success: false,
          error: 'push_not_configured',
        });
      }
      return { log, allFailed: true };
    }

    const subscriptions = await this.pushSubRepo.findByUserIds(userIds);
    if (subscriptions.length === 0) {
      this.logger.warn(
        `sendToUsers_no_subscriptions userIds=${userIds.join(',')}`,
      );
      for (const userId of userIds) {
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
      if (sub.platform === 'fcm' && !this.firebaseConfigured) {
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          error: 'fcm_not_configured',
        });
        continue;
      }
      if (
        sub.platform === 'web_push' &&
        (!this.vapidConfigured || !sub.p256dh || !sub.auth)
      ) {
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          error: 'unsupported_platform',
        });
        continue;
      }

      try {
        let statusCode: number | undefined;
        if (sub.platform === 'fcm') {
          await admin.messaging().send({
            token: sub.endpoint,
            notification: { title: payload.title, body: payload.body },
            data: { url: payload.url },
          });
          statusCode = 200;
        } else {
          const result = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              data: { url: payload.url },
            }),
          );
          statusCode = result.statusCode;
        }
        successCount++;
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: true,
          statusCode,
        });
      } catch (err: unknown) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number(err.statusCode)
            : undefined;
        const message = err instanceof Error ? err.message : 'push_failed';
        log.push({
          userId: sub.user_id,
          subscriptionId: sub.id,
          success: false,
          statusCode,
          error: message,
        });
        this.logger.warn(
          `push_failed sub=${sub.id} status=${statusCode ?? 'unknown'} platform=${sub.platform} message=${message}`,
        );
      }
    }

    return { log, allFailed: successCount === 0 };
  }

  /**
   * Sends a silent "dismiss" push to all subscriptions for the given users.
   * The payload carries no `notification` object — the service worker intercepts
   * it, calls getNotifications({ tag: checklistItemId }), and closes any matching
   * notification without ever showing a new banner.
   *
   * TTL is intentionally short (300 s) so that a push-server-queued dismissal
   * doesn't arrive on a device that comes back online hours later.
   */
  async sendDismissToUsers(
    userIds: string[],
    checklistItemId: string,
    groupId: string,
  ): Promise<void> {
    if (!this.vapidConfigured && !this.firebaseConfigured) {
      this.logger.warn('sendDismissToUsers_skipped: Push not configured');
      return;
    }
    if (userIds.length === 0) return;

    const subscriptions = await this.pushSubRepo.findByUserIds(userIds);
    if (subscriptions.length === 0) {
      this.logger.warn(
        `sendDismissToUsers_no_subscriptions userIds=${userIds.join(',')}`,
      );
      return;
    }

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          if (sub.platform === 'fcm' && this.firebaseConfigured) {
            // Data-only FCM message — no notification field means no banner is shown.
            await admin.messaging().send({
              token: sub.endpoint,
              data: {
                type: 'dismiss_alert',
                checklistItemId,
                groupId,
              },
              android: { priority: 'high' },
              apns: { payload: { aps: { contentAvailable: true } } },
            });
          } else if (
            sub.platform === 'web_push' &&
            this.vapidConfigured &&
            sub.p256dh &&
            sub.auth
          ) {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify({
                type: 'dismiss_alert',
                checklistItemId,
                groupId,
              }),
              { TTL: 300 }, // 5-minute TTL — enough for brief network drops
            );
          }
        } catch (err: unknown) {
          const statusCode =
            typeof err === 'object' && err !== null && 'statusCode' in err
              ? Number(err.statusCode)
              : undefined;
          this.logger.warn(
            `dismiss_push_failed sub=${sub.id} status=${statusCode ?? 'unknown'} err=${err instanceof Error ? err.message : 'Unknown'}`,
          );
        }
      }),
    );
  }
}
