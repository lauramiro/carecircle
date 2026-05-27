import { useEffect, useState } from 'react';
import { getNextAppointmentForPatient, type AppointmentWithCarer } from '../../api/appointments/appointments.service';

interface UseNextAppointmentResult {
  appointment: AppointmentWithCarer | null;
  loading: boolean;
  error: string | null;
}

export function useNextAppointment(patientId: string): UseNextAppointmentResult {
  const [appointment, setAppointment] = useState<AppointmentWithCarer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getNextAppointmentForPatient(patientId)
      .then(data => { if (active) setAppointment(data); })
      .catch(() => { if (active) setError('Failed to load appointment.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [patientId]);

  return { appointment, loading, error };
}
