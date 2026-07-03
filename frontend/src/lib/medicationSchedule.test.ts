import { describe, expect, it } from 'vitest';
import type { Medication } from '../api/medications/medications.types';
import { sortTimes } from './time';
import {
  computeDoseTimesForDate,
  isMedicationScheduledOnDate,
  normalizeDayOfWeek,
} from './medicationSchedule';

function makeMed(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    patientId: 'patient-1',
    medicationName: 'Test Med',
    genericName: null,
    dosage: '10 mg',
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    scheduleType: 'daily',
    specificTimes: ['08:00'],
    intervalHours: null,
    daysOfWeek: null,
    dayOfMonth: null,
    instructions: null,
    route: null,
    takeWithFood: null,
    quantityOnHand: null,
    lowStockAlertThresholdDays: 7,
    lowStockAlertSentAt: null,
    startDate: '2025-01-01',
    endDate: null,
    status: 'active',
    discontinuedDate: null,
    discontinuedReason: null,
    refillsRemaining: null,
    lastRefillDate: null,
    pharmacy: null,
    pharmacyPhone: null,
    sideEffects: null,
    notes: null,
    version: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('medicationSchedule', () => {
  it('sortTimes sorts chronologically', () => {
    expect(sortTimes(['20:00', '08:00', '00:00'])).toEqual(['00:00', '08:00', '20:00']);
  });

  it('normalizeDayOfWeek maps 7 to Sunday', () => {
    expect(normalizeDayOfWeek(7)).toBe(0);
    expect(normalizeDayOfWeek(1)).toBe(1);
  });

  it('computeDoseTimesForDate returns multiple times for twice daily', () => {
    const med = makeMed({ specificTimes: ['08:00', '20:00'] });
    const date = new Date('2025-05-21T12:00:00');
    expect(computeDoseTimesForDate(med, date)).toEqual(['08:00', '20:00']);
  });

  it('computeDoseTimesForDate expands interval schedule', () => {
    const med = makeMed({
      intervalHours: 6,
      specificTimes: ['08:00'],
    });
    const date = new Date('2025-05-21T12:00:00');
    expect(computeDoseTimesForDate(med, date)).toEqual(['08:00', '14:00', '20:00']);
  });

  it('weekly schedule only on matching day (Monday = 1 in DB)', () => {
    const med = makeMed({
      scheduleType: 'weekly',
      daysOfWeek: [1],
      specificTimes: ['08:00'],
    });
    const monday = new Date('2025-05-19T12:00:00'); // Monday
    const tuesday = new Date('2025-05-20T12:00:00');
    expect(computeDoseTimesForDate(med, monday)).toEqual(['08:00']);
    expect(computeDoseTimesForDate(med, tuesday)).toEqual([]);
  });

  it('biweekly schedule every 14 days from start', () => {
    const med = makeMed({
      scheduleType: 'biweekly',
      startDate: '2025-05-01',
      specificTimes: ['09:00'],
    });
    expect(computeDoseTimesForDate(med, new Date('2025-05-01'))).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, new Date('2025-05-15'))).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, new Date('2025-05-08'))).toEqual([]);
  });

  it('monthly schedule on day_of_month', () => {
    const med = makeMed({
      scheduleType: 'monthly',
      dayOfMonth: 15,
      specificTimes: ['09:00'],
    });
    expect(computeDoseTimesForDate(med, new Date('2025-05-15'))).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, new Date('2025-05-16'))).toEqual([]);
  });

  it('monthly schedule falls back to month end when day_of_month exceeds month length', () => {
    const med = makeMed({
      scheduleType: 'monthly',
      dayOfMonth: 31,
      specificTimes: ['09:00'],
    });

    expect(computeDoseTimesForDate(med, new Date('2025-04-30'))).toEqual(['09:00']);
    expect(computeDoseTimesForDate(med, new Date('2025-04-29'))).toEqual([]);
    expect(computeDoseTimesForDate(med, new Date('2025-03-31'))).toEqual(['09:00']);
  });

  it('excludes paused and as_needed medications', () => {
    const paused = makeMed({ status: 'paused' });
    const asNeeded = makeMed({ scheduleType: 'as_needed' });
    const date = new Date('2025-05-21');
    expect(isMedicationScheduledOnDate(paused, date)).toBe(false);
    expect(isMedicationScheduledOnDate(asNeeded, date)).toBe(false);
  });

  it('respects start_date and end_date bounds', () => {
    const med = makeMed({
      startDate: '2025-05-10',
      endDate: '2025-05-20',
    });
    expect(isMedicationScheduledOnDate(med, new Date('2025-05-09'))).toBe(false);
    expect(isMedicationScheduledOnDate(med, new Date('2025-05-21'))).toBe(false);
    expect(isMedicationScheduledOnDate(med, new Date('2025-05-15'))).toBe(true);
  });
});
