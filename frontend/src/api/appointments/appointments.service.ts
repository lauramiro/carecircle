import { supabase } from '../../lib/supabaseClient';
import { eqExtendedColumn } from '../../lib/supabaseRpc';
import type {
  AddAppointmentPayload,
  Appointment,
  AppointmentStatus,
  EditAppointmentPayload,
  EditScope,
  RecurrenceRule,
} from './appointments.types';

/** Default length when the UI only captures a single start time (DB requires end_time > start_time). */
const DEFAULT_APPOINTMENT_DURATION_MS = 60 * 60 * 1000;

function endTimeFromStart(startTime: string, durationMs = DEFAULT_APPOINTMENT_DURATION_MS): string {
  return new Date(new Date(startTime).getTime() + durationMs).toISOString();
}

function durationMsBetween(startTime: string, endTime: string): number {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  return ms > 0 ? ms : DEFAULT_APPOINTMENT_DURATION_MS;
}

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
    recurrenceRule: (row.recurrence_rule as RecurrenceRule) ?? null,
    recurrenceSeriesId: (row.recurrence_series_id as string) ?? null,
  };
}

// Generate all occurrence dates for a recurring series (1 year of occurrences).
function generateSeriesDates(startTime: Date, rule: RecurrenceRule): Date[] {
  const counts: Record<RecurrenceRule, number> = { weekly: 52, fortnightly: 26, monthly: 12 };
  const results: Date[] = [];
  const current = new Date(startTime);
  for (let i = 0; i < counts[rule]; i++) {
    results.push(new Date(current));
    if (rule === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + (rule === 'weekly' ? 7 : 14));
    }
  }
  return results;
}

export interface AppointmentWithCarer extends Appointment {
  carerName: string | null;
}

export async function getNextAppointmentForPatient(patientId: string): Promise<AppointmentWithCarer | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .neq('status', 'cancelled')
    .gt('start_time', now)
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const appt = fromRow(data as Record<string, unknown>);
  let carerName: string | null = null;

  if (appt.attendingCarerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', appt.attendingCarerId)
      .maybeSingle();
    carerName = (profile as { full_name?: string | null } | null)?.full_name ?? null;
  }

  return { ...appt, carerName };
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

  const baseRow = {
    patient_id: payload.patientId,
    title: payload.title,
    attendees: [payload.attendingCarerId],
    provider_name: payload.specialistName ?? null,
    location: payload.location ?? null,
    notes: payload.preVisitNotes ?? null,
    status: 'scheduled',
    created_by: user.id,
    ...(payload.recurrenceRule ? { recurrence_rule: payload.recurrenceRule } : {}),
  };

  if (!payload.recurrenceRule) {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...baseRow,
        start_time: payload.startTime,
        end_time: endTimeFromStart(payload.startTime),
      } as never)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return fromRow(data as Record<string, unknown>);
  }

  const seriesId = crypto.randomUUID();
  const dates = generateSeriesDates(new Date(payload.startTime), payload.recurrenceRule);
  const rows = dates.map(d => {
    const startIso = d.toISOString();
    return {
      ...baseRow,
      recurrence_rule: payload.recurrenceRule,
      start_time: startIso,
      end_time: endTimeFromStart(startIso),
      recurrence_series_id: seriesId,
    };
  });

  const { data, error } = await supabase
    .from('appointments')
    .insert(rows as never)
    .select('*')
    .order('start_time', { ascending: true });

  if (error) throw new Error(error.message);
  return fromRow((data as Record<string, unknown>[])[0]);
}

export async function editAppointment(
  id: string,
  changes: EditAppointmentPayload,
  scope: EditScope = 'this',
  appointment?: Appointment,
): Promise<Appointment> {
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
    const durationMs = appointment
      ? durationMsBetween(appointment.startTime, appointment.endTime)
      : DEFAULT_APPOINTMENT_DURATION_MS;
    update.start_time = changes.startTime;
    update.end_time = endTimeFromStart(changes.startTime, durationMs);
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

  if (scope === 'future' && appointment?.recurrenceSeriesId) {
    const { recurrenceSeriesId, startTime: originalStartTime } = appointment;

    // Apply non-time field changes to all future occurrences in one query.
    const futureFieldUpdate = { ...update };
    delete futureFieldUpdate.start_time;
    delete futureFieldUpdate.end_time;
    if (Object.keys(futureFieldUpdate).length > 0) {
      await eqExtendedColumn(
        supabase.from('appointments').update(futureFieldUpdate),
        'recurrence_series_id',
        recurrenceSeriesId,
      )
        .gt('start_time', originalStartTime)
        .neq('status', 'cancelled');
    }

    // When the time-of-day changes, update each future occurrence individually to
    // preserve its own date while adopting the new hour/minute.
    if (changes.startTime !== undefined) {
      const newTime = new Date(changes.startTime);
      const { data: futureRows } = await eqExtendedColumn(
        supabase.from('appointments').select('id, start_time'),
        'recurrence_series_id',
        recurrenceSeriesId,
      )
        .gt('start_time', originalStartTime)
        .neq('status', 'cancelled');

      if (futureRows && futureRows.length > 0) {
        await Promise.all(
          (futureRows as { id: string; start_time: string }[]).map(row => {
            const d = new Date(row.start_time);
            d.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
            const startIso = d.toISOString();
            const durationMs = appointment
              ? durationMsBetween(appointment.startTime, appointment.endTime)
              : DEFAULT_APPOINTMENT_DURATION_MS;
            return supabase
              .from('appointments')
              .update({
                start_time: startIso,
                end_time: endTimeFromStart(startIso, durationMs),
              })
              .eq('id', row.id);
          }),
        );
      }
    }
  }

  return fromRow(data as Record<string, unknown>);
}

export async function deleteAppointment(
  id: string,
  scope: EditScope = 'this',
  seriesId?: string | null,
  startTime?: string,
): Promise<void> {
  if (scope === 'future' && seriesId && startTime) {
    const { error } = await eqExtendedColumn(
      supabase.from('appointments').update({ status: 'cancelled' }),
      'recurrence_series_id',
      seriesId,
    ).gte('start_time', startTime);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }
}
