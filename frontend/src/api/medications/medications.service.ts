import type { Json } from '@lib/database.types';
import { supabase } from '@lib/supabaseClient';
import { parseDosageString } from '@lib/dosage';
import { normalizeTime } from '@lib/time';
import type { MedicationRow } from '@lib/supabaseTables';
import { medicationFromRow } from './medication.mapper';
import type {
  AddMedicationPayload,
  EditMedicationPayload,
  Medication,
} from './medications.types';

function normalizeTimes(times: string[] | null | undefined): string[] | null {
  if (!times?.length) return null;
  return times.map(normalizeTime);
}

function optionalInsertFields(payload: AddMedicationPayload) {
  return {
    ...(payload.form && { form: payload.form }),
    ...(payload.route && { route: payload.route }),
    ...(payload.instructions && { instructions: payload.instructions }),
    ...(payload.takeWithFood != null && { take_with_food: payload.takeWithFood }),
    ...(payload.endDate && { end_date: payload.endDate }),
    ...(payload.prescribedDate && { prescribed_date: payload.prescribedDate }),
    ...(payload.prescriptionNumber && { prescription_number: payload.prescriptionNumber }),
    ...(payload.pharmacy && { pharmacy: payload.pharmacy }),
    ...(payload.pharmacyPhone && { pharmacy_phone: payload.pharmacyPhone }),
    ...(payload.refillsRemaining != null && { refills_remaining: payload.refillsRemaining }),
    ...(payload.lastRefillDate && { last_refill_date: payload.lastRefillDate }),
    ...(payload.sideEffects?.length && { side_effects: payload.sideEffects }),
    ...(payload.notes && { notes: payload.notes }),
  };
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

export async function addMedication(payload: AddMedicationPayload): Promise<Medication> {
  const { dose, unit } = parseDosageString(payload.dosage);

  const { data, error } = await supabase
    .from('medications')
    .insert({
      patient_id: payload.patientId,
      medication_name: payload.medicationName,
      dose,
      unit: unit as 'mg' | 'ml' | 'mcg' | 'units',
      start_date: payload.startDate,
      schedule_type: payload.scheduleType,
      specific_times: normalizeTimes(payload.specificTimes),
      interval_hours: payload.intervalHours ?? null,
      days_of_week: payload.daysOfWeek ?? null,
      day_of_month: payload.dayOfMonth ?? null,
      status: 'active',
      ...optionalInsertFields(payload),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return medicationFromRow(data);
}

export async function editMedication(id: string, changes: EditMedicationPayload): Promise<Medication> {
  const rpcChanges: Record<string, Json> = {};
  if (changes.medicationName !== undefined) rpcChanges.medication_name = changes.medicationName;
  if (changes.dosage !== undefined) {
    const { dose, unit } = parseDosageString(changes.dosage);
    rpcChanges.dose = dose;
    rpcChanges.unit = unit;
  }
  if (changes.scheduleType !== undefined) rpcChanges.schedule_type = changes.scheduleType;
  if (changes.specificTimes !== undefined) rpcChanges.specific_times = normalizeTimes(changes.specificTimes);
  if (changes.intervalHours !== undefined) rpcChanges.interval_hours = changes.intervalHours;
  if (changes.daysOfWeek !== undefined) rpcChanges.days_of_week = changes.daysOfWeek;
  if (changes.dayOfMonth !== undefined) rpcChanges.day_of_month = changes.dayOfMonth;
  if (changes.startDate !== undefined) rpcChanges.start_date = changes.startDate;
  if (changes.form !== undefined) rpcChanges.form = changes.form;
  if (changes.route !== undefined) rpcChanges.route = changes.route;
  if (changes.instructions !== undefined) rpcChanges.instructions = changes.instructions;
  if (changes.takeWithFood !== undefined) rpcChanges.take_with_food = changes.takeWithFood;
  if (changes.endDate !== undefined) rpcChanges.end_date = changes.endDate;
  if (changes.prescribedDate !== undefined) rpcChanges.prescribed_date = changes.prescribedDate;
  if (changes.prescriptionNumber !== undefined) rpcChanges.prescription_number = changes.prescriptionNumber;
  if (changes.pharmacy !== undefined) rpcChanges.pharmacy = changes.pharmacy;
  if (changes.pharmacyPhone !== undefined) rpcChanges.pharmacy_phone = changes.pharmacyPhone;
  if (changes.refillsRemaining !== undefined) rpcChanges.refills_remaining = changes.refillsRemaining;
  if (changes.lastRefillDate !== undefined) rpcChanges.last_refill_date = changes.lastRefillDate;
  if (changes.sideEffects !== undefined) rpcChanges.side_effects = changes.sideEffects;
  if (changes.notes !== undefined) rpcChanges.notes = changes.notes;

  const { data, error } = await supabase.rpc('edit_medication', {
    p_id: id,
    p_changes: rpcChanges,
  });

  if (error) throw new Error(error.message);
  return medicationFromRow(data as MedicationRow);
}

export async function pauseMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'paused' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return medicationFromRow(data);
}

export async function activateMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'active' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return medicationFromRow(data);
}

export async function archiveMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'archived' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return medicationFromRow(data);
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
