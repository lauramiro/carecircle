import { describe, expect, it } from 'vitest';
import {
  administrationLogStatusLabel,
  buildAdministrationLogDedupKey,
  deduplicateAdministrationLogEvents,
  formatMedicationDoseLine,
  medicationDisplayName,
  normalizeAdministrationLogStatus,
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

  it('normalizeAdministrationLogStatus maps legacy medication_logs statuses', () => {
    expect(normalizeAdministrationLogStatus('taken')).toBe('given');
    expect(normalizeAdministrationLogStatus('missed')).toBe('overdue');
    expect(normalizeAdministrationLogStatus('pending')).toBeNull();
  });

  it('deduplicateAdministrationLogEvents prefers checklist rows over medication_logs', () => {
    const checklist: AdministrationLogEvent = {
      id: 'checklist:item-1',
      source: 'checklist_item',
      occurredAtIso: '2025-06-01T09:30:00.000Z',
      status: 'overdue',
      medicationName: 'Amlodipine',
      doseDisplay: '5 mg',
      carerName: '—',
      checklistDate: '2025-06-01',
      scheduledTimeLabel: '08:00',
      photoThumbnailUrl: null,
      photoFullUrl: null,
    };
    const log: AdministrationLogEvent = {
      id: 'log:log-1',
      source: 'medication_log',
      occurredAtIso: '2025-06-01T09:31:00.000Z',
      status: 'overdue',
      medicationName: 'Amlodipine',
      doseDisplay: '5 mg',
      carerName: '—',
      scheduledTimeLabel: '08:00',
      photoThumbnailUrl: null,
      photoFullUrl: null,
    };

    expect(buildAdministrationLogDedupKey(checklist)).toBe(buildAdministrationLogDedupKey(log));
    const deduped = deduplicateAdministrationLogEvents([log, checklist]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].source).toBe('checklist_item');
    expect(deduped[0].id).toBe('checklist:item-1');
  });

  it('deduplicateAdministrationLogEvents keeps distinct doses', () => {
    const morning: AdministrationLogEvent = {
      id: 'checklist:1',
      source: 'checklist_item',
      occurredAtIso: '2025-06-01T08:30:00.000Z',
      status: 'given',
      medicationName: 'Amlodipine',
      doseDisplay: '5 mg',
      carerName: 'Alex',
      checklistDate: '2025-06-01',
      scheduledTimeLabel: '08:00',
      photoThumbnailUrl: null,
      photoFullUrl: null,
    };
    const evening: AdministrationLogEvent = {
      ...morning,
      id: 'checklist:2',
      occurredAtIso: '2025-06-01T18:30:00.000Z',
      scheduledTimeLabel: '18:00',
    };

    expect(deduplicateAdministrationLogEvents([morning, evening])).toHaveLength(2);
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
