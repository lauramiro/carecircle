import { describe, expect, it } from 'vitest';
import {
  compareScheduleToLog,
  computeDoseTimesForDate,
  deriveWindowBounds,
  enumerateFutureDoseSlots,
  isMedicationScheduledOnDate,
  medicationRecordToSlotMed,
  minutesOverdue,
  needsHorizonExtension,
  buildDeepLinkUrl,
  buildDoseSummary,
  normalizeDayOfWeek,
  sortTimes,
  type SlotMedication,
} from './slot-computation';
import type { MedicationRecord } from '../integrations/types';

function makeMed(overrides: Partial<SlotMedication> = {}): SlotMedication {
  return {
    id: 'med-1',
    status: 'active',
    scheduleType: 'daily',
    startDate: '2025-01-01',
    endDate: null,
    perpetual: true,
    totalDoses: null,
    specificTimes: ['08:00'],
    intervalHours: null,
    daysOfWeek: null,
    dayOfMonth: null,
    ...overrides,
  };
}

function makeRecord(
  overrides: Partial<MedicationRecord> = {},
): MedicationRecord {
  return {
    id: 'med-1',
    patient_id: 'p1',
    medication_name: 'Test Med',
    dose: 10,
    unit: 'mg',
    schedule_type: 'daily',
    specific_times: ['08:00'],
    interval_hours: null,
    days_of_week: null,
    day_of_month: null,
    start_date: '2025-01-01',
    end_date: null,
    status: 'active',
    perpetual: true,
    total_doses: null,
    materialization_cursor_at: null,
    ...overrides,
  };
}

const TZ = 'UTC';

describe('slot-computation', () => {
  it('sortTimes sorts chronologically', () => {
    expect(sortTimes(['20:00', '08:00', '00:00'])).toEqual([
      '00:00',
      '08:00',
      '20:00',
    ]);
  });

  it('normalizeDayOfWeek maps 7 to Sunday', () => {
    expect(normalizeDayOfWeek(7)).toBe(0);
  });

  it('computeDoseTimesForDate returns multiple times for twice daily', () => {
    const med = makeMed({ specificTimes: ['08:00', '20:00'] });
    expect(computeDoseTimesForDate(med, '2025-05-21', TZ)).toEqual([
      '08:00',
      '20:00',
    ]);
  });

  it('computeDoseTimesForDate expands interval schedule', () => {
    const med = makeMed({ intervalHours: 6, specificTimes: ['08:00'] });
    expect(computeDoseTimesForDate(med, '2025-05-21', TZ)).toEqual([
      '08:00',
      '14:00',
      '20:00',
    ]);
  });

  it('weekly schedule only on matching day', () => {
    const med = makeMed({
      scheduleType: 'weekly',
      daysOfWeek: [1],
      specificTimes: ['08:00'],
    });
    expect(computeDoseTimesForDate(med, '2025-05-19', TZ)).toEqual(['08:00']);
    expect(computeDoseTimesForDate(med, '2025-05-20', TZ)).toEqual([]);
  });

  it('biweekly schedule every 14 days from start', () => {
    const med = makeMed({
      scheduleType: 'biweekly',
      startDate: '2025-05-01',
      specificTimes: ['09:00'],
    });
    expect(computeDoseTimesForDate(med, '2025-05-01', TZ)).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, '2025-05-15', TZ)).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, '2025-05-08', TZ)).toEqual([]);
  });

  it('monthly schedule on day_of_month', () => {
    const med = makeMed({
      scheduleType: 'monthly',
      dayOfMonth: 15,
      specificTimes: ['09:00'],
    });
    expect(computeDoseTimesForDate(med, '2025-05-15', TZ)).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, '2025-05-16', TZ)).toEqual([]);
  });

  it('monthly schedule falls back to month end when day_of_month exceeds month length', () => {
    const med = makeMed({
      scheduleType: 'monthly',
      dayOfMonth: 31,
      specificTimes: ['09:00'],
    });
    expect(computeDoseTimesForDate(med, '2025-04-30', TZ)).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, '2025-04-29', TZ)).toEqual([]);
    expect(computeDoseTimesForDate(med, '2025-03-31', TZ)).toEqual(['09:00']);
  });

  it('excludes paused and as_needed medications', () => {
    expect(
      isMedicationScheduledOnDate(
        makeMed({ status: 'paused' }),
        '2025-05-21',
        TZ,
      ),
    ).toBe(false);
    expect(
      isMedicationScheduledOnDate(
        makeMed({ scheduleType: 'as_needed' }),
        '2025-05-21',
        TZ,
      ),
    ).toBe(false);
  });

  it('respects start_date and end_date bounds', () => {
    const med = makeMed({
      startDate: '2025-05-10',
      endDate: '2025-05-20',
      perpetual: false,
    });
    expect(isMedicationScheduledOnDate(med, '2025-05-09', TZ)).toBe(false);
    expect(isMedicationScheduledOnDate(med, '2025-05-21', TZ)).toBe(false);
    expect(isMedicationScheduledOnDate(med, '2025-05-15', TZ)).toBe(true);
  });

  it('deriveWindowBounds offsets ±30 minutes', () => {
    expect(deriveWindowBounds('08:00')).toEqual({
      window_start: '07:30',
      window_end: '08:30',
    });
  });

  it('minutesOverdue uses 30-minute grace after scheduled_at', () => {
    const scheduled = new Date('2025-05-21T08:00:00Z');
    expect(minutesOverdue(scheduled, new Date('2025-05-21T08:29:00Z'))).toBe(0);
    expect(minutesOverdue(scheduled, new Date('2025-05-21T08:31:00Z'))).toBe(1);
    expect(minutesOverdue(scheduled, new Date('2025-05-21T09:02:00Z'))).toBe(
      32,
    );
  });

  it('enumerateFutureDoseSlots skips past slots', () => {
    const med = makeMed({ specificTimes: ['08:00', '20:00'] });
    const now = new Date('2025-05-21T12:00:00Z');
    const slots = enumerateFutureDoseSlots(med, TZ, now, null);
    expect(slots.every((s) => s.scheduledAt > now)).toBe(true);
    expect(slots[0]?.scheduledTime).toBe('20:00');
  });

  it('medicationRecordToSlotMed maps fields', () => {
    const slot = medicationRecordToSlotMed(
      makeRecord({ perpetual: false, total_doses: 10 }),
    );
    expect(slot.perpetual).toBe(false);
    expect(slot.totalDoses).toBe(10);
  });

  it('normalizes Postgres time values (HH:MM:SS) to HH:MM for checklist columns', () => {
    const med = makeMed({
      specificTimes: ['08:00:00', '21:00:00'],
    });
    expect(computeDoseTimesForDate(med, '2025-05-21', TZ)).toEqual([
      '08:00',
      '21:00',
    ]);
  });

  it('computeDoseTimesForDate supports 1-hour interval schedules', () => {
    const med = makeMed({ intervalHours: 1, specificTimes: ['06:00'] });
    const times = computeDoseTimesForDate(med, '2025-05-21', TZ);
    expect(times[0]).toBe('06:00');
    expect(times[times.length - 1]).toBe('23:00');
    expect(times).toHaveLength(18);
  });

  it('needsHorizonExtension returns true when future due count is below 14 days of doses', () => {
    const med = makeMed({ perpetual: true, specificTimes: ['08:00', '20:00'] });
    expect(needsHorizonExtension(med, 20, TZ)).toBe(true);
    expect(needsHorizonExtension(med, 28, TZ)).toBe(false);
  });

  it('buildDeepLinkUrl includes group, date, and item query params', () => {
    expect(
      buildDeepLinkUrl('https://app.example.com', 'g1', '2025-05-21', 'item-1'),
    ).toBe(
      'https://app.example.com/groups/g1/checklist?date=2025-05-21&item=item-1',
    );
  });

  it('buildDoseSummary formats dose and unit', () => {
    expect(buildDoseSummary(500, 'mg')).toBe('500 mg');
    expect(buildDoseSummary(null, 'mg')).toBe('mg');
  });

  it.each([
    {
      name: 'on-time dose inside the scheduled window',
      item: {
        checklistItemId: 'morning',
        scheduledAt: new Date('2025-05-21T08:00:00Z'),
        windowStart: '07:30',
        windowEnd: '08:30',
        status: 'given' as const,
        givenAt: new Date('2025-05-21T08:15:00Z'),
      },
      expected: { status: 'on_time', minutesLate: 0 },
    },
    {
      name: 'late dose after the scheduled window',
      item: {
        checklistItemId: 'late',
        scheduledAt: new Date('2025-05-21T08:00:00Z'),
        windowStart: '07:30',
        windowEnd: '08:30',
        status: 'given' as const,
        givenAt: new Date('2025-05-21T08:47:00Z'),
      },
      expected: { status: 'late', minutesLate: 17 },
    },
    {
      name: 'skipped dose is reported as skipped',
      item: {
        checklistItemId: 'skipped',
        scheduledAt: new Date('2025-05-21T08:00:00Z'),
        windowStart: '07:30',
        windowEnd: '08:30',
        status: 'skipped' as const,
        givenAt: null,
      },
      expected: { status: 'skipped', minutesLate: 0 },
    },
    {
      name: 'already-given terminal item without a log timestamp',
      item: {
        checklistItemId: 'already-given',
        scheduledAt: new Date('2025-05-21T08:00:00Z'),
        windowStart: '07:30',
        windowEnd: '08:30',
        status: 'given' as const,
        givenAt: null,
      },
      expected: { status: 'already_given', minutesLate: 0 },
    },
    {
      name: 'multi-window schedule keeps each dose independent',
      item: {
        checklistItemId: 'evening',
        scheduledAt: new Date('2025-05-21T20:00:00Z'),
        windowStart: '19:30',
        windowEnd: '20:30',
        status: 'given' as const,
        givenAt: new Date('2025-05-21T20:29:00Z'),
      },
      expected: { status: 'on_time', minutesLate: 0 },
    },
  ])('compares schedule to administration log: $name', ({ item, expected }) => {
    expect(compareScheduleToLog(item)).toMatchObject(expected);
  });
});
