import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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
            void this.handleUpdate(payload.new as Record<string, unknown>);
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

    // Map the exact checklist action to a descriptive cancellation reason.
    const reason = status === 'given' ? 'marked_given' : 'marked_skipped';

    try {
      await this.alertRepo.cancelOpenAlert(itemId, reason);
      this.logger.log(`alert_cancelled itemId=${itemId} reason=${reason}`);
    } catch (err) {
      this.logger.warn(`alert_cancel_failed itemId=${itemId}`, err);
      return; // If DB cancel failed, do not attempt the dismiss push.
    }

    // Determine the acting user so we can exclude their devices from the dismiss push.
    // The checklist_items table exposes given_by_carer_id and given_by_user_id;
    // we union both to be safe, then filter from the recipient list.
    const actorIds = new Set<string>(
      [
        row.given_by_carer_id as string | null,
        row.given_by_user_id as string | null,
      ].filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    try {
      const alert = await this.alertRepo.findCancelledAlertByItemId(itemId);
      if (!alert) {
        // No alert row found (e.g. item was never overdue). Nothing to dismiss.
        return;
      }

      const recipientIds = alert.push_recipient_user_ids.filter(
        (id) => !actorIds.has(id),
      );

      if (recipientIds.length === 0) {
        this.logger.log(`dismiss_push_skipped itemId=${itemId} reason=no_other_recipients`);
        return;
      }

      await this.pushDispatch.sendDismissToUsers(recipientIds, itemId, alert.group_id);
      this.logger.log(
        `dismiss_push_sent itemId=${itemId} recipients=${recipientIds.length}`,
      );
    } catch (err) {
      // Dismiss push failure is non-fatal — the DB row is already cancelled,
      // which prevents SMS escalation. The UI will also self-correct via Supabase Realtime.
      this.logger.warn(`dismiss_push_failed itemId=${itemId}`, err);
    }

    if (status !== 'given') return;

    const medicationId = row.medication_id as string | undefined;
    const groupId = row.group_id as string | undefined;
    if (!medicationId || !groupId) return;

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
