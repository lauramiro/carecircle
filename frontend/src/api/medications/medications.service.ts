import type { AddMedicationPayload, Medication } from './medications.types';
import * as medicationsMock from './medications.mock';

export async function getMedicationsByPatient(patientId: string): Promise<Medication[]> {
  return medicationsMock.getMedicationsByPatient(patientId);
}

export async function addMedication(payload: AddMedicationPayload): Promise<Medication> {
  return medicationsMock.addMedication(payload);
}

export async function pauseMedication(id: string): Promise<Medication> {
  return medicationsMock.pauseMedication(id);
}

export async function archiveMedication(id: string): Promise<Medication> {
  return medicationsMock.archiveMedication(id);
}

export async function activateMedication(id: string): Promise<Medication> {
  return medicationsMock.activateMedication(id);
}

export async function deleteMedication(id: string): Promise<never> {
  return medicationsMock.deleteMedication(id);
}

export async function checkDuplicateName(
  patientId: string,
  name: string,
): Promise<boolean> {
  return medicationsMock.checkDuplicateName(patientId, name);
}
