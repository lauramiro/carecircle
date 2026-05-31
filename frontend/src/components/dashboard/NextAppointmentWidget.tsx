import { CalendarHeart } from 'lucide-react';
import { useNextAppointment } from '@hooks/dashboard/useNextAppointment';

interface NextAppointmentWidgetProps {
  patientId: string;
  groupId: string;
  groupName: string;
}

function formatAppointmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function NextAppointmentWidget({ patientId, groupId: _groupId, groupName }: NextAppointmentWidgetProps) {
  const { appointment, loading, error } = useNextAppointment(patientId);

  return (
    <article
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          <CalendarHeart size={16} strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Next Appointment
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
            {groupName}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          Loading appointment…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error}
        </p>
      )}

      {!loading && !error && !appointment && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No upcoming appointments.
        </p>
      )}

      {!loading && !error && appointment && (
        <div>
          <p className="text-base font-extrabold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
            {appointment.title}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {formatAppointmentDate(appointment.startTime)}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {formatAppointmentTime(appointment.startTime)}
            </p>
            {appointment.carerName && (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Carer: {appointment.carerName}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
