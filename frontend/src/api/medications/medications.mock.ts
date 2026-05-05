import type { AddMedicationPayload, EditMedicationPayload, Medication } from './medications.types';

const mockMedications: Medication[] = [
  {
    id: 'med-001',
    patientId: 'patient-001',
    medicationName: 'Amlodipine',
    genericName: null,
    dosage: '5 mg',
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    frequency: 'once_daily',
    timeOfDay: ['Morning'],
    specificTimes: null,
    instructions: null,
    route: null,
    takeWithFood: null,
    startDate: '2025-05-01',
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
    createdAt: '2025-05-01T08:00:00.000Z',
    updatedAt: '2025-05-01T08:00:00.000Z',
  },
  {
    id: 'med-002',
    patientId: 'patient-001',
    medicationName: 'Metformin',
    genericName: null,
    dosage: '500 mg',
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    frequency: 'twice_daily',
    timeOfDay: ['Morning', 'Evening'],
    specificTimes: null,
    instructions: null,
    route: null,
    takeWithFood: null,
    startDate: '2025-05-01',
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
    createdAt: '2025-05-01T08:00:00.000Z',
    updatedAt: '2025-05-01T08:00:00.000Z',
  },
];

function delay<T>(value: T, timeoutMs = 250): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), timeoutMs);
  });
}

export async function getMedicationsByPatient(patientId: string): Promise<Medication[]> {
  return delay(
    mockMedications.filter(
      (med) =>
        med.patientId === patientId &&
        med.status !== 'archived' &&
        med.status !== 'superseded',
    ),
  );
}

export async function addMedication(payload: AddMedicationPayload): Promise<Medication> {
  const now = new Date().toISOString();
  const medication: Medication = {
    id: `med-${Date.now()}`,
    patientId: payload.patientId,
    medicationName: payload.medicationName,
    genericName: null,
    dosage: payload.dosage,
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    frequency: payload.frequency,
    timeOfDay: payload.timeOfDay,
    specificTimes: null,
    instructions: null,
    route: null,
    takeWithFood: null,
    startDate: payload.startDate,
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
    createdAt: now,
    updatedAt: now,
  };

  mockMedications.push(medication);
  return delay(medication);
}

export async function editMedication(id: string, changes: EditMedicationPayload): Promise<Medication> {
  const old = mockMedications.find((m) => m.id === id);
  if (!old) throw new Error(`Medication ${id} not found`);
  old.status = 'superseded';
  const now = new Date().toISOString();
  const next: Medication = {
    ...old,
    ...changes,
    id: `med-${Date.now()}`,
    status: 'active',
    version: old.version + 1,
    createdAt: now,
    updatedAt: now,
  };
  mockMedications.push(next);
  return delay({ ...next });
}

export async function pauseMedication(id: string): Promise<Medication> {
  const med = mockMedications.find((m) => m.id === id);
  if (!med) throw new Error(`Medication ${id} not found`);
  med.status = 'paused';
  return delay({ ...med });
}

export async function archiveMedication(id: string): Promise<Medication> {
  const med = mockMedications.find((m) => m.id === id);
  if (!med) throw new Error(`Medication ${id} not found`);
  med.status = 'archived';
  return delay({ ...med });
}

export async function activateMedication(id: string): Promise<Medication> {
  const med = mockMedications.find((m) => m.id === id);
  if (!med) throw new Error(`Medication ${id} not found`);
  med.status = 'active';
  return delay({ ...med });
}

export async function deleteMedication(_id: string): Promise<never> {
  throw new Error('Hard deletes are not permitted on medications');
}

export async function checkDuplicateName(
  patientId: string,
  name: string,
): Promise<boolean> {
  return delay(
    mockMedications.some(
      (med) =>
        med.patientId === patientId &&
        med.medicationName.toLowerCase() === name.toLowerCase() &&
        med.status !== 'archived' &&
        med.status !== 'superseded',
    ),
  );
}
