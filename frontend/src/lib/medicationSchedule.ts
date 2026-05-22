import type { Medication } from '../api/medications/medications.types';
import { parseLocalDateString } from './dates';
import { formatMinutesAsTime, sortTimes, timeToMinutes } from './time';

export function normalizeDayOfWeek(day: number): number {
  return day === 7 ? 0 : day;
}

function dateOnly(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDateStr(dateStr: string): Date {
  return dateOnly(parseLocalDateString(dateStr));
}

function isWithinDateRange(med: Medication, date: Date): boolean {
  const day = dateOnly(date);
  const start = parseDateStr(med.startDate);
  if (day < start) return false;
  if (med.endDate && day > parseDateStr(med.endDate)) return false;
  return true;
}

function expandIntervalTimes(startTime: string, intervalHours: number): string[] {
  const times: string[] = [];
  let minutes = timeToMinutes(startTime);
  const endOfDay = 24 * 60;

  while (minutes < endOfDay) {
    times.push(formatMinutesAsTime(minutes));
    minutes += intervalHours * 60;
  }

  return times;
}

export function isMedicationScheduledOnDate(med: Medication, date: Date): boolean {
  if (med.status !== 'active') return false;
  if (!med.scheduleType || med.scheduleType === 'as_needed') return false;
  if (!isWithinDateRange(med, date)) return false;

  const jsDay = dateOnly(date).getDay();

  switch (med.scheduleType) {
    case 'daily':
      return true;
    case 'weekly':
      return (med.daysOfWeek ?? []).map(normalizeDayOfWeek).includes(jsDay);
    case 'biweekly': {
      const start = parseDateStr(med.startDate);
      const diffDays = Math.floor((dateOnly(date).getTime() - start.getTime()) / 86400000);
      return diffDays >= 0 && diffDays % 14 === 0;
    }
    case 'monthly':
      return dateOnly(date).getDate() === med.dayOfMonth;
    default:
      return false;
  }
}

export function computeDoseTimesForDate(med: Medication, date: Date): string[] {
  if (!isMedicationScheduledOnDate(med, date)) return [];

  if (med.scheduleType === 'daily' && med.intervalHours) {
    const start = med.specificTimes?.[0] ?? '08:00';
    return sortTimes(expandIntervalTimes(start, med.intervalHours));
  }

  return sortTimes(med.specificTimes ?? []);
}

export function deriveWindowBounds(scheduledTime: string): {
  window_start: string;
  window_end: string;
} {
  const minutes = timeToMinutes(scheduledTime);
  return {
    window_start: formatMinutesAsTime(Math.max(0, minutes - 30)),
    window_end: formatMinutesAsTime(Math.min(24 * 60 - 1, minutes + 30)),
  };
}
