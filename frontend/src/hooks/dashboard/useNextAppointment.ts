import { useCallback, useEffect, useState } from 'react';
import { getNextAppointmentForPatient, type AppointmentWithCarer } from '../../api/appointments/appointments.service';
import { useSupabaseRealtime } from '../realtime/useSupabaseRealtime';

interface UseNextAppointmentResult {
  appointment: AppointmentWithCarer | null;
  loading: boolean;
  error: string | null;
}

export function useNextAppointment(patientId: string): UseNextAppointmentResult {
  const [appointment, setAppointment] = useState<AppointmentWithCarer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNext = useCallback(async (options?: { silent?: boolean }) => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await getNextAppointmentForPatient(patientId);
      setAppointment(data);
    } catch {
      if (!options?.silent) setError('Failed to load appointment.');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const refreshFromRealtime = useCallback(() => {
    void loadNext({ silent: true });
  }, [loadNext]);

  useSupabaseRealtime({
    channelName: patientId ? `dashboard-appointment-${patientId}` : 'dashboard-appointment-disabled',
    table: 'appointments',
    filter: patientId ? `patient_id=eq.${patientId}` : undefined,
    enabled: Boolean(patientId),
    onInsert: refreshFromRealtime,
    onUpdate: refreshFromRealtime,
    onDelete: refreshFromRealtime,
  });

  return { appointment, loading, error };
}
