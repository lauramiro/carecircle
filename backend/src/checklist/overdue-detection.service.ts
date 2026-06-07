import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AlertRepository } from '../integrations/repositories/alert.repository';
import { CareGroupRepository } from '../integrations/repositories/care-group.repository';
import { ChecklistRepository } from '../integrations/repositories/checklist.repository';
import { PushDispatchService } from '../alerts/push-dispatch.service';
import {
  buildDeepLinkUrl,
  buildDoseSummary,
  localDateFromScheduledAt,
  minutesOverdue,
} from './slot-computation';

@Injectable()
export class OverdueDetectionService {
  private readonly logger = new Logger(OverdueDetectionService.name);

  constructor(
    private readonly checklistRepo: ChecklistRepository,
    private readonly careGroupRepo: CareGroupRepository,
    private readonly alertRepo: AlertRepository,
    private readonly pushDispatch: PushDispatchService,
    private readonly appConfig: AppConfigService,
  ) {}

  async runTick(): Promise<void> {
    const items = await this.checklistRepo.findDueItemsPastThreshold(50);
    const now = new Date();

    for (const item of items) {
      try {
        await this.processItem(item.id, now);
      } catch (err) {
        this.logger.warn(`overdue_item_failed itemId=${item.id}`, err);
      }
    }
  }

  private async processItem(itemId: string, now: Date): Promise<void> {
    const item = await this.checklistRepo.findById(itemId);
    if (!item || item.status !== 'due' || !item.scheduled_at) return;

    const scheduledAt = new Date(item.scheduled_at);
    if (scheduledAt.getTime() + 30 * 60 * 1000 > now.getTime()) return;

    const overdueAt = new Date(
      scheduledAt.getTime() + 30 * 60 * 1000,
    ).toISOString();
    const marked = await this.checklistRepo.markOverdue(itemId, overdueAt);
    if (!marked) return;

    const groupId = item.group_id;
    if (!groupId) return;

    const groupCtx = await this.careGroupRepo.getGroupContext(groupId);
    if (!groupCtx) return;

    const overdueMin = minutesOverdue(scheduledAt, now);
    const doseSummary = buildDoseSummary(item.dose, item.dosage_unit);
    const medName = item.medication_name ?? 'Medication';
    const pushBody = `${medName} ${doseSummary} is ${overdueMin} minutes overdue`;
    const smsBody = `${groupCtx.patientFirstName}: ${medName} (${doseSummary}) ~${overdueMin} min overdue. Open CareCircle to record or skip.`;

    const localDate = localDateFromScheduledAt(
      scheduledAt,
      item.timezone ?? groupCtx.preferredTimezone,
    );
    const frontendUrl =
      this.appConfig.config.FRONTEND_PUBLIC_URL ?? 'http://localhost:5173';
    const deepLink = buildDeepLinkUrl(frontendUrl, groupId, localDate, itemId);

    const { groupMembersIds, groupMembersPhoneNumbers } =
      await this.careGroupRepo.listActiveGroupMembers(groupId);

    const alert = await this.alertRepo.insertAlert({
      checklist_item_id: itemId,
      group_id: groupId,
      patient_id: item.patient_id ?? groupCtx.patientId,
      medication_id: item.medication_id,
      patient_first_name: groupCtx.patientFirstName,
      medication_name: medName,
      dose_summary: doseSummary,
      minutes_overdue: overdueMin,
      scheduled_at: item.scheduled_at,
      push_body: pushBody,
      sms_body: smsBody,
      deep_link_url: deepLink,
      push_recipient_user_ids: groupMembersIds,
      sms_phone_numbers: groupMembersPhoneNumbers,
      status: 'pending_push',
    });

    if (!alert) return;

    const pushResult = await this.pushDispatch.dispatch(alert);
    const pushSentAt = new Date().toISOString();
    const smsDelayMs = this.appConfig.smsFallbackDelayMinutes * 60 * 1000;
    const smsDueAt = new Date(Date.now() + smsDelayMs).toISOString();

    await this.alertRepo.updateAfterPush(alert.id, {
      pushSentAt,
      smsDueAt,
      status: pushResult.allFailed ? 'push_failed' : 'push_sent',
      pushDeliveryLog: pushResult.log,
    });

    this.logger.log(
      `overdue_alert_created itemId=${itemId} alertId=${alert.id}`,
    );
  }
}
