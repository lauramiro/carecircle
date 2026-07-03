import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PushDispatchService } from '../alerts/push-dispatch.service';
import { AlertRepository } from '../integrations/repositories/alert.repository';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { MedicationLowStockAlertService } from './medication-low-stock-alert.service';

@Injectable()
export class ChecklistAckAlertSubscriber
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ChecklistAckAlertSubscriber.name);
  private channel: ReturnType<
    ReturnType<SupabaseAdminClient['getClient']>['channel']
  > | null = null;

  constructor(
    private readonly supabase: SupabaseAdminClient,
    private readonly alertRepo: AlertRepository,
    private readonly pushDispatch: PushDispatchService,
    private readonly lowStockAlerts: MedicationLowStockAlertService,
  ) {}

  onModuleInit(): void {
    if (!this.supabase.isEnabled()) return;

    try {
      const client = this.supabase.getClient();
      this.channel = client
        .channel('checklist_items_ack')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'checklist_items' },
          (payload) => {
            void this.handleUpdate(payload.new);
          },
        )
        .subscribe((status) => {
          this.logger.log(`realtime_subscriber status=${status}`);
        });
    } catch (err) {
      this.logger.warn('realtime_subscriber_init_failed', err);
    }
  }

  onModuleDestroy(): void {
    if (this.channel) {
      void this.supabase.getClient().removeChannel(this.channel);
      this.channel = null;
    }
  }

  private async handleUpdate(row: Record<string, unknown>): Promise<void> {
    const status = row.status as string | undefined;
    if (status !== 'given' && status !== 'skipped') return;

    const itemId = row.id as string | undefined;
    if (!itemId) return;

    const reason = status === 'given' ? 'marked_given' : 'marked_skipped';

    try {
      await this.alertRepo.cancelOpenAlert(itemId, reason);
      this.logger.log(`alert_cancelled itemId=${itemId} reason=${reason}`);

      const alert = await this.alertRepo.findCancelledAlertByItemId(itemId);
      if (alert) {
        const actorIds = new Set<string>(
          [
            row.given_by_carer_id as string | null,
            row.given_by_user_id as string | null,
          ].filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
        );

        const recipientIds = alert.push_recipient_user_ids.filter(
          (id) => !actorIds.has(id),
        );

        if (recipientIds.length > 0) {
          await this.pushDispatch.sendDismissToUsers(
            recipientIds,
            itemId,
            alert.group_id,
          );
          this.logger.log(
            `dismiss_push_sent itemId=${itemId} recipients=${recipientIds.length}`,
          );
        } else {
          this.logger.log(
            `dismiss_push_skipped itemId=${itemId} reason=no_other_recipients`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`alert_cancel_or_dismiss_failed itemId=${itemId}`, err);
    }

    if (status === 'given') {
      const medicationId = row.medication_id as string | undefined;
      const groupId = row.group_id as string | undefined;
      if (medicationId && groupId) {
        try {
          await this.lowStockAlerts.maybeSendLowStockAlert({
            medicationId,
            groupId,
          });
        } catch (err) {
          this.logger.warn(`low_stock_alert_failed itemId=${itemId}`, err);
        }
      }
    }
  }
}
