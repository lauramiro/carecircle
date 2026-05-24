import { describe, expect, it } from 'vitest';
import {
  administrationLogStatusLabel,
  formatMedicationDoseLine,
  medicationDisplayName,
  sortAdministrationLogEvents,
} from './administrationLog.utils';
import type { AdministrationLogEvent } from '../api/administrationLog/administrationLog.types';

describe('administrationLog.utils', () => {
  it('formatMedicationDoseLine combines dose and unit', () => {
    expect(
      formatMedicationDoseLine({ dose: 500, unit: 'mg' }),
    ).toBe('500 mg');
    expect(
      formatMedicationDoseLine({ dosage: '10', dosage_unit: 'ml' }),
    ).toBe('10 ml');
    expect(formatMedicationDoseLine({})).toBe('—');
  });

  it('medicationDisplayName prefers medication_name', () => {
    expect(
      medicationDisplayName({ medication_name: 'Metformin', name: 'X' }),
    ).toBe('Metformin');
    expect(medicationDisplayName({ name: 'Paracetamol' })).toBe('Paracetamol');
    expect(medicationDisplayName({})).toBe('Medication');
  });

  it('administrationLogStatusLabel maps status', () => {
    expect(administrationLogStatusLabel('given')).toBe('Given');
    expect(administrationLogStatusLabel('skipped')).toBe('Skipped');
    expect(administrationLogStatusLabel('overdue')).toBe('Overdue');
  });

  it('sortAdministrationLogEvents sorts newest first', () => {
    const a: AdministrationLogEvent = {
      id: '1',
      source: 'checklist_item',
      occurredAtIso: '2025-01-01T10:00:00.000Z',
      status: 'given',
      medicationName: 'A',
      doseDisplay: '1 mg',
      carerName: 'x',
      photoThumbnailUrl: null,
      photoFullUrl: null,
    };
    const b: AdministrationLogEvent = {
      id: '2',
      source: 'checklist_item',
      occurredAtIso: '2025-06-01T10:00:00.000Z',
      status: 'skipped',
      medicationName: 'B',
      doseDisplay: '2 mg',
      carerName: 'y',
      photoThumbnailUrl: null,
      photoFullUrl: null,
    };
    const sorted = sortAdministrationLogEvents([a, b]);
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('1');
  });
});
