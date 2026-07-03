import { addDays, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { MedicationRecord } from '../integrations/types';

export interface SlotMedication {
  id: string;
  status: string;
  scheduleType: string | null;
  startDate: string;
  endDate: string | null;
  perpetual: boolean;
  totalDoses: number | null;
  specificTimes: string[] | null;
  intervalHours: number | null;
  daysOfWeek: number[] | null;
  dayOfMonth: number | null;
}

export interface DoseSlot {
  localDate: string;
  scheduledTime: string;
  scheduledAt: Date;
  windowStart: string;
  windowEnd: string;
}

export type ScheduleLogComparisonStatus =
  | 'on_time'
  | 'late'
  | 'skipped'
  | 'already_given'
  | 'missing';

export interface ScheduleLogInput {
  checklistItemId: string;
  scheduledAt: Date;
  windowStart: string;
  windowEnd: string;
  status: 'due' | 'given' | 'overdue' | 'skipped' | 'archived';
  givenAt: Date | null;
}

export interface ScheduleLogComparison {
  checklistItemId: string;
  status: ScheduleLogComparisonStatus;
  minutesLate: number;
}

export function medicationRecordToSlotMed(
  med: MedicationRecord,
): SlotMedication {
  return {
    id: med.id,
    status: med.status,
    scheduleType: med.schedule_type,
    startDate: med.start_date,
    endDate: med.end_date,
    perpetual: med.perpetual,
    totalDoses: med.total_doses,
    specificTimes: normalizeTimes(med.specific_times),
    intervalHours: med.interval_hours,
    daysOfWeek: med.days_of_week,
    dayOfMonth: med.day_of_month,
  };
}

export function normalizeDayOfWeek(day: number): number {
  return day === 7 ? 0 : day;
}

export function normalizeTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + (m || 0);
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function sortTimes(times: string[]): string[] {
  return normalizeTimes(times).sort(
    (a, b) => timeToMinutes(a) - timeToMinutes(b),
  );
}

export function normalizeTimes(times: string[] | null | undefined): string[] {
  if (!times?.length) return [];
  return times.map(normalizeTime);
}

function parseLocalDateInTimezone(dateStr: string, timezone: string): Date {
  return toZonedTime(`${dateStr}T12:00:00`, timezone);
}

function formatLocalDate(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), 'yyyy-MM-dd');
}

function isWithinDateRange(med: SlotMedication, localDate: string): boolean {
  if (localDate < med.startDate) return false;
  if (med.endDate && localDate > med.endDate) return false;
  return true;
}

function expandIntervalTimes(
  startTime: string,
  intervalHours: number,
): string[] {
  const times: string[] = [];
  let minutes = timeToMinutes(startTime);
  const endOfDay = 24 * 60;

  while (minutes < endOfDay) {
    times.push(formatMinutesAsTime(minutes));
    minutes += intervalHours * 60;
  }

  return times;
}

export function isMedicationScheduledOnDate(
  med: SlotMedication,
  localDate: string,
  timezone: string,
): boolean {
  if (med.status !== 'active') return false;
  if (!med.scheduleType || med.scheduleType === 'as_needed') return false;
  if (!isWithinDateRange(med, localDate)) return false;

  const date = parseLocalDateInTimezone(localDate, timezone);
  const jsDay = toZonedTime(date, timezone).getDay();

  switch (med.scheduleType) {
    case 'daily':
      return true;
    case 'weekly':
      return (med.daysOfWeek ?? []).map(normalizeDayOfWeek).includes(jsDay);
    case 'biweekly': {
      const start = parseLocalDateInTimezone(med.startDate, timezone);
      const current = parseLocalDateInTimezone(localDate, timezone);
      const diffDays = Math.floor(
        (current.getTime() - start.getTime()) / 86400000,
      );
      return diffDays >= 0 && diffDays % 14 === 0;
    }
    case 'monthly':
      return (
        toZonedTime(
          parseLocalDateInTimezone(localDate, timezone),
          timezone,
        ).getDate() === med.dayOfMonth
      );
    default:
      return false;
  }
}

export function computeDoseTimesForDate(
  med: SlotMedication,
  localDate: string,
  timezone: string,
): string[] {
  if (!isMedicationScheduledOnDate(med, localDate, timezone)) return [];

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

export function zonedDateTimeToUtc(
  localDate: string,
  time: string,
  timezone: string,
): Date {
  return fromZonedTime(`${localDate}T${normalizeTime(time)}:00`, timezone);
}

function estimateDosesPerDay(med: SlotMedication, timezone: string): number {
  const today = formatLocalDate(new Date(), timezone);
  return computeDoseTimesForDate(med, today, timezone).length || 1;
}

function computeLastEligibleDate(
  med: SlotMedication,
  timezone: string,
): string | null {
  if (med.perpetual) return null;
  if (med.endDate) return med.endDate;
  if (med.totalDoses == null) return null;

  let slotsFound = 0;
  let cursor = med.startDate;
  const maxDays = 365 * 5;

  for (let i = 0; i < maxDays && slotsFound < med.totalDoses; i++) {
    const times = computeDoseTimesForDate(med, cursor, timezone);
    slotsFound += times.length;
    if (slotsFound >= med.totalDoses) return cursor;
    const next = addDays(parseLocalDateInTimezone(cursor, timezone), 1);
    cursor = formatLocalDate(next, timezone);
  }

  return cursor;
}

export function enumerateFutureDoseSlots(
  med: SlotMedication,
  timezone: string,
  afterInstant: Date,
  cursorAt: Date | null,
): DoseSlot[] {
  if (med.scheduleType === 'as_needed' || med.status !== 'active') return [];

  const now = afterInstant;
  const todayLocal = formatLocalDate(now, timezone);
  const startLocal = med.startDate > todayLocal ? med.startDate : todayLocal;

  const lastDate = computeLastEligibleDate(med, timezone);
  const slots: DoseSlot[] = [];
  let cursor = startLocal;
  let totalEnumerated = 0;
  const maxDays = 365 * 10;

  for (let dayOffset = 0; dayOffset < maxDays; dayOffset++) {
    if (lastDate && cursor > lastDate) break;

    const times = computeDoseTimesForDate(med, cursor, timezone);
    for (const scheduledTime of times) {
      const normalizedTime = normalizeTime(scheduledTime);
      const scheduledAt = zonedDateTimeToUtc(cursor, normalizedTime, timezone);
      if (cursorAt && scheduledAt <= cursorAt) continue;

      if (med.totalDoses != null) {
        totalEnumerated++;
        if (totalEnumerated > med.totalDoses) return slots;
      }

      const bounds = deriveWindowBounds(normalizedTime);
      slots.push({
        localDate: cursor,
        scheduledTime: normalizedTime,
        scheduledAt,
        windowStart: bounds.window_start,
        windowEnd: bounds.window_end,
      });
    }

    const next = addDays(parseLocalDateInTimezone(cursor, timezone), 1);
    cursor = formatLocalDate(next, timezone);
    if (med.perpetual && !lastDate && dayOffset > maxDays - 2) break;
  }

  return slots;
}

export function needsHorizonExtension(
  med: SlotMedication,
  futureDueCount: number,
  timezone: string,
): boolean {
  if (!med.perpetual && med.endDate == null && med.totalDoses == null)
    return false;
  const dosesPerDay = estimateDosesPerDay(med, timezone);
  return futureDueCount < 14 * dosesPerDay;
}

export function buildDoseSummary(
  dose: number | null,
  unit: string | null,
): string {
  if (dose == null) return unit ?? '';
  return `${dose} ${unit ?? 'mg'}`.trim();
}

export function compareScheduleToLog(
  input: ScheduleLogInput,
): ScheduleLogComparison {
  if (input.status === 'skipped') {
    return {
      checklistItemId: input.checklistItemId,
      status: 'skipped',
      minutesLate: 0,
    };
  }

  if (input.status === 'given' && !input.givenAt) {
    return {
      checklistItemId: input.checklistItemId,
      status: 'already_given',
      minutesLate: 0,
    };
  }

  if (!input.givenAt) {
    return {
      checklistItemId: input.checklistItemId,
      status: 'missing',
      minutesLate: 0,
    };
  }

  const windowEnd = zonedDateTimeToUtc(
    input.scheduledAt.toISOString().slice(0, 10),
    input.windowEnd,
    'UTC',
  );
  const minutesLate = Math.max(
    0,
    Math.floor((input.givenAt.getTime() - windowEnd.getTime()) / 60000),
  );

  return {
    checklistItemId: input.checklistItemId,
    status: minutesLate > 0 ? 'late' : 'on_time',
    minutesLate,
  };
}

export function minutesOverdue(scheduledAt: Date, now: Date): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - scheduledAt.getTime()) / 60000) - 30,
  );
}

export function buildDeepLinkUrl(
  frontendBaseUrl: string,
  groupId: string,
  localDate: string,
  checklistItemId: string,
): string {
  const base = frontendBaseUrl.replace(/\/$/, '');
  return `${base}/groups/${groupId}/checklist?date=${localDate}&item=${checklistItemId}`;
}

export function localDateFromScheduledAt(
  scheduledAt: Date,
  timezone: string,
): string {
  return format(toZonedTime(scheduledAt, timezone), 'yyyy-MM-dd');
}
