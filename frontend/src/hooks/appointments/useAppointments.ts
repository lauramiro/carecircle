import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  addAppointment as addAppointmentService,
  deleteAppointment as deleteAppointmentService,
  editAppointment as editAppointmentService,
  getAppointmentsByPatient,
} from '../../api/appointments/appointments.service';
import type {
  AddAppointmentPayload,
  Appointment,
  EditAppointmentPayload,
} from '../../api/appointments/appointments.types';

function fromRealtimeRow(row: Record<string, unknown>): Appointment {
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
    status: (row.status as Appointment['status']) ?? 'scheduled',
    createdBy: (row.created_by as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  };
}

export function useAppointments(patientId: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAppointmentsByPatient(patientId);
      setAppointments(data);
    } catch {
      setError('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time subscription — updates state when other clients mutate appointments
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`appointments-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`,
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            const appt = fromRealtimeRow(payload.new as Record<string, unknown>);
            if (appt.status !== 'cancelled') {
              setAppointments(prev =>
                [...prev, appt].sort((a, b) => a.startTime.localeCompare(b.startTime)),
              );
            }
          }
          if (payload.eventType === 'UPDATE') {
            const appt = fromRealtimeRow(payload.new as Record<string, unknown>);
            if (appt.status === 'cancelled') {
              setAppointments(prev => prev.filter(a => a.id !== appt.id));
            } else {
              setAppointments(prev =>
                prev
                  .map(a => (a.id === appt.id ? appt : a))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime)),
              );
            }
          }
          if (payload.eventType === 'DELETE') {
            setAppointments(prev => prev.filter(a => a.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [patientId]);

  async function addAppointment(payload: AddAppointmentPayload): Promise<void> {
    setIsSubmitting(true);
    try {
      const created = await addAppointmentService(payload);
      setAppointments(prev =>
        [...prev, created].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function editAppointment(id: string, changes: EditAppointmentPayload): Promise<void> {
    setIsSubmitting(true);
    try {
      const updated = await editAppointmentService(id, changes);
      setAppointments(prev =>
        prev
          .map(a => (a.id === id ? updated : a))
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteAppointment(id: string): Promise<void> {
    setIsSubmitting(true);
    try {
      await deleteAppointmentService(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { appointments, loading, error, isSubmitting, addAppointment, editAppointment, deleteAppointment };
}
