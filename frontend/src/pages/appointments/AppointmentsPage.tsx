import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CalendarDays, Clock, MapPin, Plus, Stethoscope, Trash2, UserCheck } from 'lucide-react';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useAppointments } from '../../hooks/appointments/useAppointments';
import type { Appointment } from '../../api/appointments/appointments.types';

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

function isPast(iso: string): boolean {
  return new Date(iso) < new Date();
}

export default function AppointmentsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const patientId = group?.patientId ?? '';
  const { appointments, loading, isSubmitting, deleteAppointment } = useAppointments(patientId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (groupLoading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Appointments</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading...
        </div>
      </section>
    );
  }

  if (!group) return <Navigate to="/groups/list" replace />;

  const canEdit = group.canSchedule;

  async function handleDelete(appt: Appointment) {
    if (!window.confirm(`Cancel appointment "${appt.title}"?`)) return;
    setDeletingId(appt.id);
    try {
      await deleteAppointment(appt.id);
      toast.success('Appointment cancelled');
    } catch {
      toast.error('Failed to cancel appointment');
    } finally {
      setDeletingId(null);
    }
  }

  const upcoming = appointments.filter(a => !isPast(a.startTime));
  const past = appointments.filter(a => isPast(a.startTime));

  function memberName(id: string | null): string {
    if (!id) return 'Unknown';
    return group!.members.find(m => m.id === id)?.name ?? 'Unknown';
  }

  function AppointmentCard({ appt }: { appt: Appointment }) {
    const { date, time } = formatDateTime(appt.startTime);
    const past = isPast(appt.startTime);

    return (
      <div
        className="rounded-xl border bg-white p-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="font-bold truncate"
              style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}
            >
              {appt.title}
            </p>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <CalendarDays size={13} strokeWidth={1.8} />
                <span>{date}</span>
                <Clock size={13} strokeWidth={1.8} className="ml-1" />
                <span>{time}</span>
              </div>

              <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <UserCheck size={13} strokeWidth={1.8} />
                <span>{memberName(appt.attendingCarerId)}</span>
              </div>

              {appt.specialistName && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <Stethoscope size={13} strokeWidth={1.8} />
                  <span>{appt.specialistName}</span>
                </div>
              )}

              {appt.location && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <MapPin size={13} strokeWidth={1.8} />
                  <span>{appt.location}</span>
                </div>
              )}

              {appt.preVisitNotes && !past && (
                <p className="mt-2 text-xs rounded p-2" style={{ background: 'var(--color-bg-page)', color: 'var(--color-text-secondary)' }}>
                  <span className="font-semibold">Pre-visit notes: </span>{appt.preVisitNotes}
                </p>
              )}

              {past && appt.postVisitNotes && (
                <p className="mt-2 text-xs rounded p-2" style={{ background: '#f0fdf4', color: '#166534' }}>
                  <span className="font-semibold">Post-visit notes: </span>{appt.postVisitNotes}
                </p>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/appointments/${appt.id}/edit`)}
                className="text-xs px-2.5 py-1 rounded border"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting || deletingId === appt.id}
                onClick={() => void handleDelete(appt)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border"
                style={{ borderColor: 'var(--color-status-critical)', color: 'var(--color-status-critical)' }}
              >
                <Trash2 size={11} />
                {deletingId === appt.id ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Appointments
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {group.name}
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}/appointments/new`)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={15} strokeWidth={2.2} />
            New appointment
          </button>
        )}
      </div>

      {loading ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-hint)' }}
        >
          Loading appointments...
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-hint)' }}>
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>No upcoming appointments.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-hint)' }}>
                Past
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {past.map(a => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
