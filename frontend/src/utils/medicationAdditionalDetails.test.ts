import { describe, expect, it } from 'vitest';
import type { Medication } from '../api/medications/medications.types';
import {
  getMedicationAdditionalDetails,
  hasMedicationAdditionalDetails,
} from './medicationAdditionalDetails';

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
    specificTimes: ['08:00'],
    intervalHours: null,
    daysOfWeek: null,
    dayOfMonth: null,
    instructions: null,
    route: null,
    takeWithFood: null,
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

describe('medicationAdditionalDetails', () => {
  it('returns no rows when optional fields are empty', () => {
    expect(getMedicationAdditionalDetails(makeMed())).toEqual([]);
    expect(hasMedicationAdditionalDetails(makeMed())).toBe(false);
  });

  it('maps populated optional fields to labelled rows', () => {
    const rows = getMedicationAdditionalDetails(
      makeMed({
        form: 'Tablet',
        route: 'Oral',
        instructions: 'Take with water',
        takeWithFood: true,
        pharmacy: 'Boots',
        sideEffects: ['nausea', 'dizziness'],
        notes: 'Evening dose only',
        refillsRemaining: 2,
      }),
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        { label: 'Form', value: 'Tablet' },
        { label: 'Route', value: 'Oral' },
        { label: 'Instructions', value: 'Take with water' },
        { label: 'Take with food', value: 'Yes' },
        { label: 'Pharmacy', value: 'Boots' },
        { label: 'Side effects', value: 'nausea, dizziness' },
        { label: 'Notes', value: 'Evening dose only' },
        { label: 'Refills remaining', value: '2' },
      ]),
    );
    expect(hasMedicationAdditionalDetails(makeMed({ form: 'Tablet' }))).toBe(true);
  });
});
