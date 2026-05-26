import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useAppointments } from '../../hooks/appointments/useAppointments';
import type {
  AddAppointmentPayload,
  EditAppointmentPayload,
  EditScope,
  RecurrenceRule,
} from '../../api/appointments/appointments.types';

function toLocalDateTimeInputs(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

function toISOFromInputs(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

interface FormErrors {
  title?: string;
  date?: string;
  time?: string;
  attendingCarerId?: string;
}

export default function AppointmentFormPage() {
  const { groupId, appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const scope = (searchParams.get('scope') ?? 'this') as EditScope;
  const navigate = useNavigate();
  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const patientId = group?.patientId ?? '';
  const { appointments, loading: apptLoading, isSubmitting, addAppointment, editAppointment } =
    useAppointments(patientId);

  const isEdit = Boolean(appointmentId);
  const existing = isEdit ? appointments.find(a => a.id === appointmentId) : null;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [attendingCarerId, setAttendingCarerId] = useState('');
  const [specialistName, setSpecialistName] = useState('');
  const [location, setLocation] = useState('');
  const [preVisitNotes, setPreVisitNotes] = useState('');
  const [postVisitNotes, setPostVisitNotes] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | ''>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isEdit || !existing || initialized) return;
    const { date: d, time: t } = toLocalDateTimeInputs(existing.startTime);
    setTitle(existing.title);
    setDate(d);
    setTime(t);
    setAttendingCarerId(existing.attendingCarerId ?? '');
    setSpecialistName(existing.specialistName ?? '');
    setLocation(existing.location ?? '');
    setPreVisitNotes(existing.preVisitNotes ?? '');
    setPostVisitNotes(existing.postVisitNotes ?? '');
    setInitialized(true);
  }, [existing, isEdit, initialized]);

  if (!groupId) return <Navigate to="/groups/list" replace />;
  if (groupLoading || (isEdit && apptLoading)) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">{isEdit ? 'Edit' : 'New'} Appointment</h1>
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
  if (!group.canSchedule) return <Navigate to={`/groups/${groupId}/appointments`} replace />;
  if (isEdit && !apptLoading && !existing) return <Navigate to={`/groups/${groupId}/appointments`} replace />;

  const appointmentIsPast = existing ? new Date(existing.startTime) < new Date() : false;
  const editingAllFuture = isEdit && scope === 'future' && Boolean(existing?.recurrenceRule);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!title.trim()) next.title = 'Title is required';
    if (!date) next.date = 'Date is required';
    if (!time) next.time = 'Time is required';
    if (!attendingCarerId) next.attendingCarerId = 'Attending carer is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const startTime = toISOFromInputs(date, time);

    try {
      if (isEdit && existing) {
        const changes: EditAppointmentPayload = {
          title: title.trim(),
          startTime,
          attendingCarerId,
          specialistName: specialistName.trim() || null,
          location: location.trim() || null,
          preVisitNotes: preVisitNotes.trim() || null,
        };
        if (appointmentIsPast) {
          changes.postVisitNotes = postVisitNotes.trim() || null;
        }
        await editAppointment(existing.id, changes, scope, existing);
        toast.success(editingAllFuture ? 'All future occurrences updated' : 'Appointment updated');
      } else {
        const payload: AddAppointmentPayload = {
          patientId,
          title: title.trim(),
          startTime,
          attendingCarerId,
          specialistName: specialistName.trim() || undefined,
          location: location.trim() || undefined,
          preVisitNotes: preVisitNotes.trim() || undefined,
          recurrenceRule: recurrenceRule || undefined,
        };
        await addAppointment(payload);
        toast.success(recurrenceRule ? 'Recurring appointments created' : 'Appointment created');
      }
      navigate(`/groups/${groupId}/appointments`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save appointment');
    }
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    outline: 'none',
    background: 'var(--color-input-bg)',
  };

  const errorStyle = { color: 'var(--color-status-critical)', fontSize: '12px', marginTop: '4px' };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '6px',
  };

  return (
    <section>
      <div className="mb-6">
        <h1
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          {isEdit ? 'Edit Appointment' : 'New Appointment'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {group.name}
        </p>
      </div>

      <div className="max-w-xl">
        {editingAllFuture && (
          <div
            className="mb-4 rounded-lg border px-4 py-3 text-sm font-medium"
            style={{ borderColor: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 8%, white)', color: 'var(--color-primary)' }}
          >
            Editing all future occurrences from this date. Time changes apply to all; date changes apply to this occurrence only.
          </div>
        )}

        <div className="rounded-xl border bg-white p-6" style={{ borderColor: 'var(--color-border)' }}>
          <form onSubmit={e => void handleSubmit(e)} noValidate>
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label style={labelStyle}>
                  Title <span style={{ color: 'var(--color-status-critical)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Cardiology check-up"
                  style={{ ...inputStyle, borderColor: errors.title ? 'var(--color-status-critical)' : 'var(--color-border)' }}
                />
                {errors.title && <p style={errorStyle}>{errors.title}</p>}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>
                    Date <span style={{ color: 'var(--color-status-critical)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.date ? 'var(--color-status-critical)' : 'var(--color-border)' }}
                  />
                  {errors.date && <p style={errorStyle}>{errors.date}</p>}
                </div>
                <div>
                  <label style={labelStyle}>
                    Time <span style={{ color: 'var(--color-status-critical)' }}>*</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.time ? 'var(--color-status-critical)' : 'var(--color-border)' }}
                  />
                  {errors.time && <p style={errorStyle}>{errors.time}</p>}
                </div>
              </div>

              {/* Attending Carer */}
              <div>
                <label style={labelStyle}>
                  Attending carer <span style={{ color: 'var(--color-status-critical)' }}>*</span>
                </label>
                <select
                  value={attendingCarerId}
                  onChange={e => setAttendingCarerId(e.target.value)}
                  style={{ ...inputStyle, borderColor: errors.attendingCarerId ? 'var(--color-status-critical)' : 'var(--color-border)' }}
                >
                  <option value="">Select carer</option>
                  {group.members
                    .filter(m => m.status === 'Active')
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
                {errors.attendingCarerId && <p style={errorStyle}>{errors.attendingCarerId}</p>}
              </div>

              {/* Specialist Name */}
              <div>
                <label style={labelStyle}>Specialist name</label>
                <input
                  type="text"
                  value={specialistName}
                  onChange={e => setSpecialistName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Jones"
                  style={inputStyle}
                />
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. City Hospital, Ward 4"
                  style={inputStyle}
                />
              </div>

              {/* Recurrence — new appointments only */}
              {!isEdit && (
                <div>
                  <label style={labelStyle}>Recurrence</label>
                  <select
                    value={recurrenceRule}
                    onChange={e => setRecurrenceRule(e.target.value as RecurrenceRule | '')}
                    style={inputStyle}
                  >
                    <option value="">Does not repeat</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}

              {/* Pre-visit notes */}
              <div>
                <label style={labelStyle}>Pre-visit notes</label>
                <textarea
                  value={preVisitNotes}
                  onChange={e => setPreVisitNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything the attending carer should know beforehand"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Post-visit notes — unlocked only after appointment date has passed */}
              {appointmentIsPast && (
                <div>
                  <label style={labelStyle}>Post-visit notes</label>
                  <textarea
                    value={postVisitNotes}
                    onChange={e => setPostVisitNotes(e.target.value)}
                    rows={3}
                    placeholder="What happened at the appointment"
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
                style={{ background: isSubmitting ? 'var(--color-text-hint)' : 'var(--color-primary)' }}
              >
                {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create appointment'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/appointments`)}
                className="rounded-lg border px-5 py-2 text-sm font-semibold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
