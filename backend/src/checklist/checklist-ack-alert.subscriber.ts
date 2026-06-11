import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AlertRepository } from '../integrations/repositories/alert.repository';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';

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

    try {
      await this.alertRepo.cancelOpenAlert(itemId, 'acknowledged');
      this.logger.log(`alert_cancelled itemId=${itemId} reason=acknowledged`);
    } catch (err) {
      this.logger.warn(`alert_cancel_failed itemId=${itemId}`, err);
    }
  }
}
