import { describe, it, expect, beforeEach } from 'vitest';
import * as mock from './medications.mock';
import type { AddMedicationPayload } from './medications.types';

const BASE_PAYLOAD: AddMedicationPayload = {
  patientId: 'test-patient',
  name: 'TestMed',
  dose: 10,
  unit: 'mg',
  frequency: 'once_daily',
  timeWindows: ['Morning'],
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
});
