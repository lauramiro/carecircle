import type { AddMedicationPayload, Medication } from './medications.types';

const mockMedications: Medication[] = [
  {
    id: 'med-001',
    patientId: 'patient-001',
    name: 'Amlodipine',
    dose: 5,
    unit: 'mg',
    frequency: 'once_daily',
    timeWindows: ['Morning'],
    status: 'active',
    createdAt: '2025-05-01T08:00:00.000Z',
  },
  {
    id: 'med-002',
    patientId: 'patient-001',
    name: 'Metformin',
    dose: 500,
    unit: 'mg',
    frequency: 'twice_daily',
    timeWindows: ['Morning', 'Evening'],
    status: 'active',
    createdAt: '2025-05-01T08:00:00.000Z',
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
      (med) => med.patientId === patientId && med.status !== 'archived',
    ),
  );
}

export async function addMedication(payload: AddMedicationPayload): Promise<Medication> {
  const medication: Medication = {
    id: `med-${Date.now()}`,
    ...payload,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  mockMedications.push(medication);

  return delay(medication);
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
        med.name.toLowerCase() === name.toLowerCase() &&
        med.status !== 'archived',
    ),
  );
}
