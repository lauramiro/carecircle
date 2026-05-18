import { describe, it, expect, beforeEach } from 'vitest';
import * as mock from './medications.mock';
import type { AddMedicationPayload } from './medications.types';

const BASE_PAYLOAD: AddMedicationPayload = {
  patientId: 'test-patient',
  medicationName: 'TestMed',
  dosage: '10 mg',
  frequency: 'once_daily',
  timeOfDay: ['Morning'],
  startDate: '2025-05-01',
};

async function seedMedication(): Promise<string> {
  const med = await mock.addMedication(BASE_PAYLOAD);
  return med.id;
}

describe('medications mock', () => {
  beforeEach(async () => {
    // Seed a fresh active medication before each test so state is isolated.
    // The shared array is module-level, so each test adds its own entry and
    // operates on its own id — prior tests' entries remain but don't interfere.
  });

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
  // Scenario 2 edge cases: duplicate name check
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

  it('getMedicationsByPatient returns an empty array for a patient with no medications', async () => {
    const results = await mock.getMedicationsByPatient(`patient-none-${Date.now()}`);
    expect(results).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Scenario 3 edge case: editing preserves unchanged fields
  // -------------------------------------------------------------------------

  it('editMedication preserves unchanged fields in the new version', async () => {
    const patientId = `patient-edit-fields-${Date.now()}`;
    const original = await mock.addMedication({
      ...BASE_PAYLOAD,
      patientId,
      medicationName: 'Amlodipine',
      dosage: '5 mg',
      frequency: 'once_daily',
      timeOfDay: ['Morning'],
    });

    const next = await mock.editMedication(original.id, { dosage: '10 mg' });

    expect(next.medicationName).toBe('Amlodipine');
    expect(next.frequency).toBe('once_daily');
    expect(next.timeOfDay).toEqual(['Morning']);
    expect(next.patientId).toBe(patientId);
    expect(next.dosage).toBe('10 mg');
  });
});
