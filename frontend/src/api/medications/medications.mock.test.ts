import { describe, it, expect } from 'vitest';
import * as mock from './medications.mock';
import type { AddMedicationPayload } from './medications.types';

const BASE_PAYLOAD: AddMedicationPayload = {
  patientId: 'test-patient',
  medicationName: 'TestMed',
  dosage: '10 mg',
  startDate: '2025-05-01',
  scheduleType: 'daily',
  specificTimes: ['08:00'],
};

async function seedMedication(overrides: Partial<AddMedicationPayload> = {}): Promise<string> {
  const med = await mock.addMedication({ ...BASE_PAYLOAD, ...overrides });
  return med.id;
}

describe('medications mock', () => {
  it('pauseMedication sets status to paused', async () => {
    const id = await seedMedication();
    const result = await mock.pauseMedication(id);
    expect(result.id).toBe(id);
    expect(result.status).toBe('paused');
  });

  it('archiveMedication sets status to archived', async () => {
    const id = await seedMedication();
    const result = await mock.archiveMedication(id);
    expect(result.id).toBe(id);
    expect(result.status).toBe('archived');
  });

  it('deleteMedication always throws', async () => {
    const id = await seedMedication();
    await expect(mock.deleteMedication(id)).rejects.toThrow(
      'Hard deletes are not permitted on medications',
    );
  });

  it('a paused medication still appears in getMedicationsByPatient', async () => {
    const patientId = `patient-pause-${Date.now()}`;
    const med = await mock.addMedication({ ...BASE_PAYLOAD, patientId });
    await mock.pauseMedication(med.id);
    const results = await mock.getMedicationsByPatient(patientId);
    expect(results.some((m) => m.id === med.id)).toBe(true);
    expect(results.find((m) => m.id === med.id)?.status).toBe('paused');
  });

  it('activateMedication restores a paused medication to active', async () => {
    const patientId = `patient-activate-${Date.now()}`;
    const med = await mock.addMedication({ ...BASE_PAYLOAD, patientId });
    await mock.pauseMedication(med.id);
    const activated = await mock.activateMedication(med.id);
    expect(activated.status).toBe('active');
    const results = await mock.getMedicationsByPatient(patientId);
    expect(results.find((m) => m.id === med.id)?.status).toBe('active');
  });

  it('an archived medication does NOT appear in getMedicationsByPatient', async () => {
    const patientId = `patient-archive-${Date.now()}`;
    const med = await mock.addMedication({ ...BASE_PAYLOAD, patientId });
    await mock.archiveMedication(med.id);
    const results = await mock.getMedicationsByPatient(patientId);
    expect(results.some((m) => m.id === med.id)).toBe(false);
  });

  it('editing a medication produces a new row with version = 2 and old row has status superseded', async () => {
    const patientId = `patient-edit-v2-${Date.now()}`;
    const original = await mock.addMedication({ ...BASE_PAYLOAD, patientId });
    expect(original.version).toBe(1);

    const next = await mock.editMedication(original.id, { dosage: '20 mg' });
    expect(next.version).toBe(2);
    expect(next.status).toBe('active');
    expect(next.dosage).toBe('20 mg');
    expect(next.id).not.toBe(original.id);

    const results = await mock.getMedicationsByPatient(patientId);
    expect(results.some((m) => m.id === original.id)).toBe(false);
    expect(results.some((m) => m.id === next.id)).toBe(true);
  });

  it('editing three times produces three rows total and only version 3 appears in getMedicationsByPatient', async () => {
    const patientId = `patient-edit-v3-${Date.now()}`;
    const v1 = await mock.addMedication({ ...BASE_PAYLOAD, patientId });
    const v2 = await mock.editMedication(v1.id, { dosage: '20 mg' });
    const v3 = await mock.editMedication(v2.id, { dosage: '30 mg' });

    expect(v3.version).toBe(3);
    expect(v3.dosage).toBe('30 mg');

    const results = await mock.getMedicationsByPatient(patientId);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(v3.id);
    expect(results[0].version).toBe(3);
  });

  it('superseded rows are not visible in getMedicationsByPatient', async () => {
    const patientId = `patient-superseded-${Date.now()}`;
    const v1 = await mock.addMedication({ ...BASE_PAYLOAD, patientId });
    const v2 = await mock.editMedication(v1.id, { medicationName: 'UpdatedMed' });

    const results = await mock.getMedicationsByPatient(patientId);
    expect(results.every((m) => m.status !== 'superseded')).toBe(true);
    expect(results.some((m) => m.id === v1.id)).toBe(false);
    expect(results.some((m) => m.id === v2.id)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Duplicate name check
  // -------------------------------------------------------------------------

  it('checkDuplicateName returns true for a case-insensitive match', async () => {
    const patientId = `patient-dup-case-${Date.now()}`;
    await mock.addMedication({ ...BASE_PAYLOAD, patientId, medicationName: 'Metformin' });

    expect(await mock.checkDuplicateName(patientId, 'METFORMIN')).toBe(true);
    expect(await mock.checkDuplicateName(patientId, 'metformin')).toBe(true);
    expect(await mock.checkDuplicateName(patientId, 'MeTfOrMiN')).toBe(true);
  });

  it('checkDuplicateName returns false when the only matching name is archived', async () => {
    const patientId = `patient-dup-archived-${Date.now()}`;
    const med = await mock.addMedication({ ...BASE_PAYLOAD, patientId, medicationName: 'Aspirin' });
    await mock.archiveMedication(med.id);

    expect(await mock.checkDuplicateName(patientId, 'Aspirin')).toBe(false);
  });

  it('checkDuplicateName returns false when the only matching name is superseded', async () => {
    const patientId = `patient-dup-superseded-${Date.now()}`;
    const v1 = await mock.addMedication({ ...BASE_PAYLOAD, patientId, medicationName: 'OldMed' });
    await mock.editMedication(v1.id, { medicationName: 'NewMed' });

    expect(await mock.checkDuplicateName(patientId, 'OldMed')).toBe(false);
  });

  it('checkDuplicateName returns false for a different patient with the same name', async () => {
    const patientA = `patient-dup-a-${Date.now()}`;
    const patientB = `patient-dup-b-${Date.now()}`;
    await mock.addMedication({ ...BASE_PAYLOAD, patientId: patientA, medicationName: 'Lisinopril' });

    expect(await mock.checkDuplicateName(patientB, 'Lisinopril')).toBe(false);
  });

  it('checkDuplicateName returns false when no medications exist for the patient', async () => {
    const patientId = `patient-empty-${Date.now()}`;
    expect(await mock.checkDuplicateName(patientId, 'Anything')).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Service layer error edge cases
  // -------------------------------------------------------------------------

  it('editMedication throws when the id does not exist', async () => {
    await expect(mock.editMedication('non-existent-id', { dosage: '10 mg' })).rejects.toThrow(
      'Medication non-existent-id not found',
    );
  });

  it('pauseMedication throws when the id does not exist', async () => {
    await expect(mock.pauseMedication('non-existent-id')).rejects.toThrow(
      'Medication non-existent-id not found',
    );
  });

  it('activateMedication throws when the id does not exist', async () => {
    await expect(mock.activateMedication('non-existent-id')).rejects.toThrow(
      'Medication non-existent-id not found',
    );
  });

  it('archiveMedication throws when the id does not exist', async () => {
    await expect(mock.archiveMedication('non-existent-id')).rejects.toThrow(
      'Medication non-existent-id not found',
    );
  });

  it('getMedicationsByPatient returns seed data for a patient with no own medications', async () => {
    // The mock falls back to seed data so the UI is never empty during dev.
    const results = await mock.getMedicationsByPatient(`patient-none-${Date.now()}`);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((m) => m.status !== 'archived' && m.status !== 'superseded')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Preserving fields across edits
  // -------------------------------------------------------------------------

  it('editMedication preserves unchanged schedule fields in the new version', async () => {
    const patientId = `patient-edit-fields-${Date.now()}`;
    const original = await mock.addMedication({
      ...BASE_PAYLOAD,
      patientId,
      medicationName: 'Amlodipine',
      dosage: '5 mg',
      scheduleType: 'daily',
      specificTimes: ['08:00'],
    });

    const next = await mock.editMedication(original.id, { dosage: '10 mg' });

    expect(next.medicationName).toBe('Amlodipine');
    expect(next.scheduleType).toBe('daily');
    expect(next.specificTimes).toEqual(['08:00']);
    expect(next.patientId).toBe(patientId);
    expect(next.dosage).toBe('10 mg');
  });

  // -------------------------------------------------------------------------
  // New schedule model: add tests
  // -------------------------------------------------------------------------

  it('addMedication stores daily specific-times schedule correctly', async () => {
    const patientId = `patient-daily-times-${Date.now()}`;
    const med = await mock.addMedication({
      patientId,
      medicationName: 'Amoxicillin',
      dosage: '500 mg',
      startDate: '2025-06-01',
      scheduleType: 'daily',
      specificTimes: ['08:00', '20:00'],
    });

    expect(med.scheduleType).toBe('daily');
    expect(med.specificTimes).toEqual(['08:00', '20:00']);
    expect(med.intervalHours).toBeNull();
  });

  it('addMedication stores daily interval schedule correctly', async () => {
    const patientId = `patient-daily-interval-${Date.now()}`;
    const med = await mock.addMedication({
      patientId,
      medicationName: 'Ibuprofen',
      dosage: '400 mg',
      startDate: '2025-06-01',
      scheduleType: 'daily',
      intervalHours: 6,
      specificTimes: ['08:00'],
    });

    expect(med.scheduleType).toBe('daily');
    expect(med.intervalHours).toBe(6);
    expect(med.specificTimes).toEqual(['08:00']);
  });

  it('addMedication stores weekly schedule correctly', async () => {
    const patientId = `patient-weekly-${Date.now()}`;
    const med = await mock.addMedication({
      patientId,
      medicationName: 'Vitamin D',
      dosage: '1000 units',
      startDate: '2025-06-01',
      scheduleType: 'weekly',
      daysOfWeek: [1, 4],
      specificTimes: ['09:00'],
    });

    expect(med.scheduleType).toBe('weekly');
    expect(med.daysOfWeek).toEqual([1, 4]);
    expect(med.specificTimes).toEqual(['09:00']);
  });

  it('addMedication stores monthly schedule correctly', async () => {
    const patientId = `patient-monthly-${Date.now()}`;
    const med = await mock.addMedication({
      patientId,
      medicationName: 'B12 Injection',
      dosage: '1000 mcg',
      startDate: '2025-06-01',
      scheduleType: 'monthly',
      dayOfMonth: 15,
      specificTimes: ['10:00'],
    });

    expect(med.scheduleType).toBe('monthly');
    expect(med.dayOfMonth).toBe(15);
    expect(med.specificTimes).toEqual(['10:00']);
  });

  it('addMedication stores as-needed schedule with no times', async () => {
    const patientId = `patient-as-needed-${Date.now()}`;
    const med = await mock.addMedication({
      patientId,
      medicationName: 'Salbutamol',
      dosage: '100 mcg',
      startDate: '2025-06-01',
      scheduleType: 'as_needed',
    });

    expect(med.scheduleType).toBe('as_needed');
    expect(med.specificTimes).toBeNull();
    expect(med.intervalHours).toBeNull();
  });

  it('editMedication can update schedule fields', async () => {
    const patientId = `patient-edit-schedule-${Date.now()}`;
    const original = await mock.addMedication({
      ...BASE_PAYLOAD,
      patientId,
      scheduleType: 'daily',
      specificTimes: ['08:00'],
    });

    const next = await mock.editMedication(original.id, {
      scheduleType: 'weekly',
      daysOfWeek: [1, 3, 5],
      specificTimes: ['07:00'],
      intervalHours: null,
    });

    expect(next.scheduleType).toBe('weekly');
    expect(next.daysOfWeek).toEqual([1, 3, 5]);
    expect(next.specificTimes).toEqual(['07:00']);
    expect(next.intervalHours).toBeNull();
  });

  it('payload sent to onSubmit contains new schedule fields (duplicate warning flow)', async () => {
    const patientId = `patient-dup-flow-${Date.now()}`;
    await mock.addMedication({ ...BASE_PAYLOAD, patientId, medicationName: 'Warfarin' });

    const isDup = await mock.checkDuplicateName(patientId, 'Warfarin');
    expect(isDup).toBe(true);

    // Simulates "Add anyway": adding despite duplicate returns the medication
    const added = await mock.addMedication({
      patientId,
      medicationName: 'Warfarin',
      dosage: '2 mg',
      startDate: '2025-06-01',
      scheduleType: 'daily',
      specificTimes: ['18:00'],
    });

    expect(added.scheduleType).toBe('daily');
    expect(added.specificTimes).toEqual(['18:00']);
    const results = await mock.getMedicationsByPatient(patientId);
    expect(results.filter((m) => m.medicationName === 'Warfarin')).toHaveLength(2);
  });
});
