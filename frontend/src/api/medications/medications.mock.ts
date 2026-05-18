import type { AddMedicationPayload, EditMedicationPayload, Medication } from './medications.types';

function makeMed(overrides: Partial<Medication> & Pick<Medication, 'id' | 'patientId' | 'medicationName' | 'dosage' | 'frequency' | 'timeOfDay' | 'status'>): Medication {
  return {
    genericName: null,
    form: null,
    prescribedBy: null,
    prescribedDate: null,
    prescriptionNumber: null,
    specificTimes: null,
    instructions: null,
    route: null,
    takeWithFood: null,
    startDate: '2025-05-01',
    endDate: null,
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
    ...overrides,
  };
}

const mockMedications: Medication[] = [
  makeMed({ id: 'med-001', patientId: 'patient-001', medicationName: 'Amlodipine', dosage: '5 mg', frequency: 'once_daily', timeOfDay: ['Morning'], status: 'active' }),
  makeMed({ id: 'med-002', patientId: 'patient-001', medicationName: 'Metformin', dosage: '500 mg', frequency: 'twice_daily', timeOfDay: ['Morning', 'Evening'], status: 'active' }),
  makeMed({ id: 'med-003', patientId: 'patient-001', medicationName: 'Atorvastatin', dosage: '20 mg', frequency: 'once_daily', timeOfDay: ['Night'], status: 'active' }),
  makeMed({ id: 'med-004', patientId: 'patient-001', medicationName: 'Omeprazole', dosage: '20 mg', frequency: 'once_daily', timeOfDay: ['Morning'], status: 'paused' }),
  makeMed({ id: 'med-005', patientId: 'patient-001', medicationName: 'Paracetamol', dosage: '500 mg', frequency: 'four_times_daily', timeOfDay: ['Morning', 'Afternoon', 'Evening', 'Night'], status: 'active' }),
  makeMed({ id: 'med-006', patientId: 'patient-001', medicationName: 'Lisinopril', dosage: '10 mg', frequency: 'once_daily', timeOfDay: ['Afternoon'], status: 'active' }),
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

export async function deleteMedication(id: string): Promise<never> {
  void id;
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
