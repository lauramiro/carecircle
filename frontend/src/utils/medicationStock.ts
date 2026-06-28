import type { Medication } from '../api/medications/medications.types';

function countTimes(med: Medication): number {
  return Math.max(1, med.specificTimes?.length ?? 0);
}

function getIntervalDoseCount(startTime: string | null | undefined, intervalHours: number): number {
  const [hoursText, minutesText] = (startTime ?? '08:00').split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const startMinutes =
    Number.isFinite(hours) && Number.isFinite(minutes)
      ? Math.max(0, Math.min(23 * 60 + 59, hours * 60 + minutes))
      : 8 * 60;
  return Math.max(1, Math.floor(((24 * 60 - 1) - startMinutes) / (intervalHours * 60)) + 1);
}

export function getDailyDoseCount(med: Medication): number {
  if (!med.scheduleType || med.scheduleType === 'as_needed') return 0;

  if (med.scheduleType === 'daily') {
    if (med.intervalHours && med.intervalHours > 0) {
      return getIntervalDoseCount(med.specificTimes?.[0], med.intervalHours);
    }
    return countTimes(med);
  }

  if (med.scheduleType === 'weekly') {
    return (Math.max(1, med.daysOfWeek?.length ?? 0) * countTimes(med)) / 7;
  }

  if (med.scheduleType === 'biweekly') {
    return countTimes(med) / 14;
  }

  if (med.scheduleType === 'monthly' && med.dayOfMonth != null) {
    return countTimes(med) / 30;
  }

  return 0;
}

export function getEstimatedDaysRemaining(med: Medication): number | null {
  if (med.quantityOnHand == null) return null;
  const dailyDoseCount = getDailyDoseCount(med);
  if (dailyDoseCount <= 0) return null;
  return med.quantityOnHand / dailyDoseCount;
}

export function isLowStockMedication(med: Medication): boolean {
  const daysRemaining = getEstimatedDaysRemaining(med);
  return daysRemaining !== null && daysRemaining < med.lowStockAlertThresholdDays;
}

export function formatDaysRemaining(daysRemaining: number | null): string {
  if (daysRemaining === null) return 'Not estimated';
  if (daysRemaining < 1) return '<1 day';
  if (Number.isInteger(daysRemaining)) return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
  return `${daysRemaining.toFixed(1)} days`;
}
