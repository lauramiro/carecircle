import { parseDosageString } from '@lib/dosage';
import { normalizeTime } from '@lib/time';
import { supabase } from '@lib/supabaseClient';
import type { MedicationRow } from '@lib/supabaseTables';
import { medicationFromRow } from './medication.mapper';
import type {
  AddMedicationPayload,
  EditMedicationPayload,
  Medication,
} from './medications.types';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiBaseUrl ? `${apiBaseUrl}${path}` : path;
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response;
}

function normalizeTimes(times: string[] | null | undefined): string[] | null {
  if (!times?.length) return null;
  return times.map(normalizeTime);
}

function buildCourseFields(payload: {
  scheduleType: string;
  perpetual?: boolean;
  endDate?: string;
  totalDoses?: number;
}) {
  if (payload.scheduleType === 'as_needed') return {};
  return {
    perpetual: payload.perpetual ?? false,
    endDate: payload.endDate,
    totalDoses: payload.totalDoses,
  };
}

function rowFromApi(data: Record<string, unknown>): Medication {
  return medicationFromRow(data as MedicationRow);
}

export async function getMedicationsByPatient(patientId: string): Promise<Medication[]> {
  if (!patientId.trim()) {
    throw new Error('patient_id is required to load medications.');
  }

  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('patient_id', patientId)
    .not('status', 'in', '("archived","superseded")');

  if (error) throw new Error(error.message);
  return (data as MedicationRow[]).map(medicationFromRow);
}

export async function addMedication(
  groupId: string,
  payload: AddMedicationPayload,
): Promise<Medication> {
  const { dose, unit } = parseDosageString(payload.dosage);
  const course = buildCourseFields({
    scheduleType: payload.scheduleType,
    perpetual: payload.perpetual,
    endDate: payload.endDate,
    totalDoses: payload.totalDoses,
  });

  const response = await apiFetch(`/api/groups/${groupId}/medications`, {
    method: 'POST',
    body: JSON.stringify({
      patientId: payload.patientId,
      medicationName: payload.medicationName,
      dose,
      unit,
      startDate: payload.startDate,
      scheduleType: payload.scheduleType,
      specificTimes: normalizeTimes(payload.specificTimes),
      intervalHours: payload.intervalHours ?? undefined,
      daysOfWeek: payload.daysOfWeek ?? undefined,
      dayOfMonth: payload.dayOfMonth ?? undefined,
      ...course,
      form: payload.form,
      route: payload.route,
      instructions: payload.instructions,
      takeWithFood: payload.takeWithFood,
    }),
  });

  return rowFromApi(await response.json());
}

export async function editMedication(
  groupId: string,
  id: string,
  changes: EditMedicationPayload,
): Promise<Medication> {
  const body: Record<string, unknown> = {};
  if (changes.medicationName !== undefined) body.medicationName = changes.medicationName;
  if (changes.dosage !== undefined) {
    const { dose, unit } = parseDosageString(changes.dosage);
    body.dose = dose;
    body.unit = unit;
  }
  if (changes.scheduleType !== undefined) body.scheduleType = changes.scheduleType;
  if (changes.specificTimes !== undefined) body.specificTimes = normalizeTimes(changes.specificTimes);
  if (changes.intervalHours !== undefined) body.intervalHours = changes.intervalHours;
  if (changes.daysOfWeek !== undefined) body.daysOfWeek = changes.daysOfWeek;
  if (changes.dayOfMonth !== undefined) body.dayOfMonth = changes.dayOfMonth;
  if (changes.startDate !== undefined) body.startDate = changes.startDate;
  if (changes.perpetual !== undefined) body.perpetual = changes.perpetual;
  if (changes.endDate !== undefined) body.endDate = changes.endDate;
  if (changes.totalDoses !== undefined) body.totalDoses = changes.totalDoses;

  const response = await apiFetch(`/api/groups/${groupId}/medications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  return rowFromApi(await response.json());
}

export async function pauseMedication(groupId: string, id: string): Promise<Medication> {
  const response = await apiFetch(`/api/groups/${groupId}/medications/${id}/pause`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return rowFromApi(await response.json());
}

export async function activateMedication(groupId: string, id: string): Promise<Medication> {
  const response = await apiFetch(`/api/groups/${groupId}/medications/${id}/activate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return rowFromApi(await response.json());
}

export async function archiveMedication(groupId: string, id: string): Promise<Medication> {
  const response = await apiFetch(`/api/groups/${groupId}/medications/${id}/archive`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return rowFromApi(await response.json());
}

export async function deleteMedication(id: string): Promise<never> {
  void id;
  throw new Error('Hard deletes are not permitted on medications');
}

export async function checkDuplicateName(patientId: string, name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('medications')
    .select('id')
    .eq('patient_id', patientId)
    .ilike('medication_name', name)
    .not('status', 'in', '("archived","superseded")')
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
