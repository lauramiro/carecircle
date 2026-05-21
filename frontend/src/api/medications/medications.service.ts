import { supabase } from '../../lib/supabaseClient';
import type {
  AddMedicationPayload,
  EditMedicationPayload,
  Medication,
  MedicationStatus,
  ScheduleType,
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
    scheduleType: (row.schedule_type as ScheduleType) ?? null,
    specificTimes: (row.specific_times as string[]) ?? null,
    intervalHours: (row.interval_hours as number) ?? null,
    daysOfWeek: (row.days_of_week as number[]) ?? null,
    dayOfMonth: (row.day_of_month as number) ?? null,
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
  // Cast needed until Supabase types are regenerated after the schema migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [doseStr, unit] = payload.dosage.split(' ');
  const dose = parseFloat(doseStr);

  const { data, error } = await (supabase.from('medications') as any)
    .insert({
      patient_id: payload.patientId,
      medication_name: payload.medicationName,
      dose,
      unit,
      start_date: payload.startDate,
      schedule_type: payload.scheduleType,
      specific_times: payload.specificTimes ?? null,
      interval_hours: payload.intervalHours ?? null,
      days_of_week: payload.daysOfWeek ?? null,
      day_of_month: payload.dayOfMonth ?? null,
    })
    .select('*')
    .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function editMedication(id: string, changes: EditMedicationPayload): Promise<Medication> {
  const rpcChanges: Record<string, unknown> = {};
  if (changes.medicationName !== undefined) rpcChanges.medication_name = changes.medicationName;
  if (changes.dosage !== undefined) rpcChanges.dosage = changes.dosage;
  if (changes.scheduleType !== undefined) rpcChanges.schedule_type = changes.scheduleType;
  if (changes.specificTimes !== undefined) rpcChanges.specific_times = changes.specificTimes;
  if (changes.intervalHours !== undefined) rpcChanges.interval_hours = changes.intervalHours;
  if (changes.daysOfWeek !== undefined) rpcChanges.days_of_week = changes.daysOfWeek;
  if (changes.dayOfMonth !== undefined) rpcChanges.day_of_month = changes.dayOfMonth;
  if (changes.startDate !== undefined) rpcChanges.start_date = changes.startDate;
  if (changes.instructions !== undefined) rpcChanges.instructions = changes.instructions;
  if (changes.notes !== undefined) rpcChanges.notes = changes.notes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('edit_medication', {
    p_id: id,
    p_changes: rpcChanges,
  }) as { data: Record<string, unknown> | null; error: { message: string } | null };

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
