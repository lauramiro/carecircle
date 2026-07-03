import { describe, expect, it } from 'vitest';
import {
  administrationLogDisplayStatusLabel,
  administrationLogStatusLabel,
  formatAdministrationLogScheduledTime,
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

  it('formatAdministrationLogScheduledTime shows dash when missing', () => {
    expect(formatAdministrationLogScheduledTime()).toBe('—');
    expect(formatAdministrationLogScheduledTime('08:00')).toBe('08:00');
  });

  it('administrationLogDisplayStatusLabel distinguishes on-time and late given doses', () => {
    const onTime: AdministrationLogEvent = {
      id: '1',
      source: 'checklist_item',
      occurredAtIso: '2025-06-01T08:05:00.000Z',
      status: 'given',
      medicationName: 'Amlodipine',
      doseDisplay: '5 mg',
      carerName: 'Alex',
      scheduledTimeLabel: '08:00',
      photoThumbnailUrl: null,
      photoFullUrl: null,
    };
    const late: AdministrationLogEvent = {
      ...onTime,
      id: '2',
      overdueHours: 1,
      overdueMinutes: 15,
    };

    expect(administrationLogDisplayStatusLabel(onTime)).toBe('Given (on time)');
    expect(administrationLogDisplayStatusLabel(late)).toBe('Given (1h 15m late)');
    expect(administrationLogDisplayStatusLabel({ ...onTime, status: 'overdue' })).toBe('Overdue');
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
