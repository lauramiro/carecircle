import { supabase } from '../../lib/supabaseClient';
import type { Json } from '../../lib/database.types';
import type {
  AddMedicationPayload,
  EditMedicationPayload,
  Medication,
  MedicationFrequency,
  MedicationStatus,
  MedicationTimeWindow,
  MedicationUnit,
} from './medications.types';

function fromRow(row: Record<string, unknown>): Medication {
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    medicationName: row.medication_name as string,
    genericName: (row.generic_name as string) ?? null,
    dosage: `${row.dose as number} ${row.unit as string}`,
    form: (row.form as string) ?? null,
    prescribedBy: (row.prescribed_by as string) ?? null,
    prescribedDate: (row.prescribed_date as string) ?? null,
    prescriptionNumber: (row.prescription_number as string) ?? null,
    frequency: row.schedule_type as MedicationFrequency,
    timeOfDay: (row.time_windows as MedicationTimeWindow[]) ?? null,
    specificTimes: (row.specific_times as string[]) ?? null,
    instructions: (row.instructions as string) ?? null,
    route: (row.route as string) ?? null,
    takeWithFood: (row.take_with_food as boolean) ?? null,
    startDate: row.start_date as string,
    endDate: (row.end_date as string) ?? null,
    status: row.status as MedicationStatus,
    discontinuedDate: (row.discontinued_date as string) ?? null,
    discontinuedReason: (row.discontinued_reason as string) ?? null,
    refillsRemaining: (row.refills_remaining as number) ?? null,
    lastRefillDate: (row.last_refill_date as string) ?? null,
    pharmacy: (row.pharmacy as string) ?? null,
    pharmacyPhone: (row.pharmacy_phone as string) ?? null,
    sideEffects: (row.side_effects as string[]) ?? null,
    notes: (row.notes as string) ?? null,
    version: (row.version as number) ?? 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getMedicationsByPatient(patientId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('patient_id', patientId)
    .not('status', 'in', '("archived","superseded")');

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]).map(fromRow);
}

export async function addMedication(payload: AddMedicationPayload): Promise<Medication> {
  const parts = payload.dosage.split(' ');
  const dose = parseFloat(parts[0] ?? '0');
  const unit = (parts[1] ?? 'mg') as MedicationUnit;

  const { data, error } = await supabase
    .from('medications')
    .insert({
      patient_id: payload.patientId,
      medication_name: payload.medicationName,
      dose,
      unit,
      schedule_type: payload.frequency,
      time_windows: payload.timeOfDay as unknown as Json,
      start_date: payload.startDate,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function editMedication(id: string, changes: EditMedicationPayload): Promise<Medication> {
  const rpcChanges: Record<string, unknown> = {};
  if (changes.medicationName !== undefined) rpcChanges.medication_name = changes.medicationName;
  if (changes.dosage !== undefined) rpcChanges.dosage = changes.dosage;
  if (changes.frequency !== undefined) rpcChanges.frequency = changes.frequency;
  if (changes.timeOfDay !== undefined) rpcChanges.time_of_day = changes.timeOfDay;
  if (changes.instructions !== undefined) rpcChanges.instructions = changes.instructions;
  if (changes.notes !== undefined) rpcChanges.notes = changes.notes;

  const { data, error } = await supabase.rpc('edit_medication', {
    p_id: id,
    p_changes: rpcChanges as unknown as Json,
  });

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function pauseMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'paused' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function activateMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'active' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function archiveMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'archived' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
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
  return (data as unknown[]).length > 0;
}
