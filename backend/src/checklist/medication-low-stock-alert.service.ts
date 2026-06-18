import { Injectable, Logger } from '@nestjs/common';
import { PushDispatchService } from '../alerts/push-dispatch.service';
import { CareGroupRepository } from '../integrations/repositories/care-group.repository';
import { MedicationRepository } from '../integrations/repositories/medication.repository';
import type { MedicationRecord } from '../integrations/types';

function countTimes(med: MedicationRecord): number {
  return Math.max(1, med.specific_times?.length ?? 0);
}

function getIntervalDoseCount(
  startTime: string | null | undefined,
  intervalHours: number,
): number {
  const [hoursText, minutesText] = (startTime ?? '08:00').split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const startMinutes =
    Number.isFinite(hours) && Number.isFinite(minutes)
      ? Math.max(0, Math.min(23 * 60 + 59, hours * 60 + minutes))
      : 8 * 60;
  return Math.max(
    1,
    Math.floor(((24 * 60 - 1) - startMinutes) / (intervalHours * 60)) + 1,
  );
}

export function getDailyDoseCount(med: MedicationRecord): number {
  if (!med.schedule_type || med.schedule_type === 'as_needed') return 0;

  if (med.schedule_type === 'daily') {
    if (med.interval_hours && med.interval_hours > 0) {
      return getIntervalDoseCount(med.specific_times?.[0], med.interval_hours);
    }
    return countTimes(med);
  }

  if (med.schedule_type === 'weekly') {
    return (Math.max(1, med.days_of_week?.length ?? 0) * countTimes(med)) / 7;
  }

  if (med.schedule_type === 'biweekly') {
    return countTimes(med) / 14;
  }

  if (med.schedule_type === 'monthly' && med.day_of_month != null) {
    return countTimes(med) / 30;
  }

  return 0;
}

@Injectable()
export class MedicationLowStockAlertService {
  private readonly logger = new Logger(MedicationLowStockAlertService.name);

  constructor(
    private readonly medicationRepo: MedicationRepository,
    private readonly careGroupRepo: CareGroupRepository,
    private readonly pushDispatch: PushDispatchService,
  ) {}

  async runPendingLowStockAlerts(limit = 100): Promise<void> {
    const candidates =
      await this.medicationRepo.findPendingLowStockAlertCandidates(limit);

    for (const med of candidates) {
      try {
        const groupCtx = await this.careGroupRepo.getGroupContextByPatientId(
          med.patient_id,
        );
        if (!groupCtx) continue;
        await this.maybeSendLowStockAlert({
          medicationId: med.id,
          groupId: groupCtx.groupId,
        });
      } catch (err) {
        this.logger.warn(`low_stock_candidate_failed medicationId=${med.id}`, err);
      }
    }
  }

  async maybeSendLowStockAlert(params: {
    medicationId: string;
    groupId: string;
  }): Promise<void> {
    const med = await this.medicationRepo.findById(params.medicationId);
    if (!med || med.quantity_on_hand == null) return;

    const dailyDoseCount = getDailyDoseCount(med);
    if (dailyDoseCount <= 0) return;

    const thresholdDays = med.low_stock_alert_threshold_days ?? 7;
    const daysRemaining = med.quantity_on_hand / dailyDoseCount;
    if (daysRemaining >= thresholdDays) return;

    const sentAt = new Date().toISOString();
    const primaryCarerIds = await this.careGroupRepo.listActivePrimaryCarerIds(
      params.groupId,
    );
    if (primaryCarerIds.length === 0) {
      this.logger.warn(`low_stock_no_primary_carer medicationId=${med.id}`);
      return;
    }

    const marked = await this.medicationRepo.markLowStockAlertSent(
      med.id,
      sentAt,
    );
    if (!marked) return;

    const roundedDays =
      daysRemaining < 1 ? '<1' : Math.max(1, Math.floor(daysRemaining)).toString();

    try {
      const result = await this.pushDispatch.sendToUsers(primaryCarerIds, {
        title: 'Medication stock low',
        body: `${med.medication_name} has ${med.quantity_on_hand} doses remaining, about ${roundedDays} day${roundedDays === '1' ? '' : 's'} of stock.`,
        url: `/groups/${params.groupId}/medications`,
      });

      if (result.allFailed) {
        await this.medicationRepo.clearLowStockAlertSent(med.id, sentAt);
        this.logger.warn(`low_stock_push_all_failed medicationId=${med.id}`);
      }
    } catch (err) {
      await this.medicationRepo.clearLowStockAlertSent(med.id, sentAt);
      throw err;
    }
  }
}
