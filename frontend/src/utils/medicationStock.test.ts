import { describe, expect, it } from 'vitest';
import type { Medication } from '../api/medications/medications.types';
import { getDailyDoseCount, getEstimatedDaysRemaining } from './medicationStock';

function makeMed(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    patientId: 'patient-1',
    medicationName: 'Metformin',
    genericName: null,
    dosage: '500 mg',
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    scheduleType: 'daily',
    specificTimes: ['08:00', '18:00'],
    intervalHours: null,
    daysOfWeek: null,
    dayOfMonth: null,
    instructions: null,
    route: null,
    takeWithFood: null,
    quantityOnHand: 10,
    lowStockAlertThresholdDays: 7,
    lowStockAlertSentAt: null,
    startDate: '2026-01-01',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('medicationStock', () => {
  it('counts specific daily times as daily doses', () => {
    expect(getDailyDoseCount(makeMed())).toBe(2);
    expect(getEstimatedDaysRemaining(makeMed())).toBe(5);
  });

  it('counts interval schedules from their configured start time', () => {
    expect(
      getDailyDoseCount(
        makeMed({
          specificTimes: ['08:00'],
          intervalHours: 6,
        }),
      ),
    ).toBe(3);
    expect(
      getDailyDoseCount(
        makeMed({
          specificTimes: ['20:00'],
          intervalHours: 6,
        }),
      ),
    ).toBe(1);
  });

  it('treats untracked medications as having no estimate', () => {
    expect(getEstimatedDaysRemaining(makeMed({ quantityOnHand: null }))).toBeNull();
  });
});
