import { Injectable, Logger } from '@nestjs/common';
import { SupabaseAdminService } from '../integrations/supabase-admin.service';
import { PendingSmsRegistry } from './pending-sms.registry';
import { TwilioSmsService } from './twilio-sms.service';

export interface MissedMedicationSmsPayload {
  checklistItemId: string;
  groupId: string;
  medicationName: string;
  doseSummary: string;
  minutesOverdue: number;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * When a missed-medication push is dispatched, schedules fallback SMS (CC-101).
 * Cancels automatically when a checklist row moves to Given / Skipped (CC-102).
 */
@Injectable()
export class MissedMedicationSmsCoordinator {
  private readonly logger = new Logger(MissedMedicationSmsCoordinator.name);

  constructor(
    private readonly registry: PendingSmsRegistry,
    private readonly twilio: TwilioSmsService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  /** Call from the push notification pipeline once an alert is sent. */
  scheduleAfterPushDispatched(payload: MissedMedicationSmsPayload): void {
    const { minutesOverdue } = payload;

    this.registry.schedule(payload.checklistItemId, TEN_MINUTES_MS, () => {
      void this.dispatchNow(payload, minutesOverdue);
    });
  }

  cancelBecauseAcknowledged(checklistItemId: string): void {
    this.registry.cancel(checklistItemId, 'acknowledged');
  }

  private async dispatchNow(payload: MissedMedicationSmsPayload, minutesOverdue: number): Promise<void> {
    if (!this.twilio.isConfigured()) {
      this.logger.warn('twilio_not_configured skip_missed_med_sms');
      return;
    }

    if (!this.supabaseAdmin.isEnabled()) {
      this.logger.warn('supabase_admin_missing skip_missed_med_sms');
      return;
    }

    const recipients = await this.supabaseAdmin.listSmsRecipientPhonesForGroup(payload.groupId);
    if (recipients.length === 0) {
      this.logger.log(`missed_med_sms_no_recipients groupId=${payload.groupId}`);
      return;
    }

    const salutation = await this.supabaseAdmin.getPatientSmsSalutation(payload.groupId);
    const body = [
      `${salutation}: ${payload.medicationName} (${payload.doseSummary})`,
      `~${minutesOverdue} min overdue.`,
      `Open CareCircle to record or skip.`,
    ].join(' ');

    for (const to of recipients) {
      const res = await this.twilio.sendSms(to, body);
      if ('error' in res) {
        this.logger.warn(`missed_med_sms_send_failed checklistItemId=${payload.checklistItemId}`);
      }
    }
  }
}
