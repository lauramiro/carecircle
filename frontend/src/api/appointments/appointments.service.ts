import { supabase } from '../../lib/supabaseClient';
import type {
  AddAppointmentPayload,
  Appointment,
  AppointmentStatus,
  EditAppointmentPayload,
} from './appointments.types';

function fromRow(row: Record<string, unknown>): Appointment {
  const attendees = row.attendees as string[] | null;
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    title: row.title as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    attendingCarerId: attendees?.[0] ?? null,
    specialistName: (row.provider_name as string) ?? null,
    location: (row.location as string) ?? null,
    preVisitNotes: (row.notes as string) ?? null,
    postVisitNotes: (row.post_appointment_notes as string) ?? null,
    status: (row.status as AppointmentStatus) ?? 'scheduled',
    createdBy: (row.created_by as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  };
}

export async function getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]).map(fromRow);
}

export async function addAppointment(payload: AddAppointmentPayload): Promise<Appointment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: payload.patientId,
      title: payload.title,
      start_time: payload.startTime,
      end_time: payload.startTime,
      attendees: [payload.attendingCarerId],
      provider_name: payload.specialistName ?? null,
      location: payload.location ?? null,
      notes: payload.preVisitNotes ?? null,
      status: 'scheduled',
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function editAppointment(id: string, changes: EditAppointmentPayload): Promise<Appointment> {
  const update: Partial<{
    title: string;
    start_time: string;
    end_time: string;
    attendees: string[];
    provider_name: string | null;
    location: string | null;
    notes: string | null;
    post_appointment_notes: string | null;
  }> = {};
  if (changes.title !== undefined) update.title = changes.title;
  if (changes.startTime !== undefined) {
    update.start_time = changes.startTime;
    update.end_time = changes.startTime;
  }
  if (changes.attendingCarerId !== undefined) update.attendees = [changes.attendingCarerId];
  if (changes.specialistName !== undefined) update.provider_name = changes.specialistName;
  if (changes.location !== undefined) update.location = changes.location;
  if (changes.preVisitNotes !== undefined) update.notes = changes.preVisitNotes;
  if (changes.postVisitNotes !== undefined) update.post_appointment_notes = changes.postVisitNotes;

  const { data, error } = await supabase
    .from('appointments')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as Record<string, unknown>);
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
