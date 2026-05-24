import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CalendarDays, Clock, LayoutList, MapPin, Plus, Stethoscope, Trash2, UserCheck } from 'lucide-react';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorPanel, LoadingPanel } from '../../components/ui/ContentPanel';
import { useAppointments } from '../../hooks/appointments/useAppointments';
import type { Appointment } from '../../api/appointments/appointments.types';

type ViewMode = 'list' | 'week' | 'month';

const HOUR_HEIGHT = 56; // px per hour
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── date helpers ─────────────────────────────────────────────────────────────

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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  return (
    new Date(a.getFullYear(), a.getMonth(), a.getDate()) <
    new Date(b.getFullYear(), b.getMonth(), b.getDate())
  );
}

function weekMonday(from: Date): Date {
  const d = new Date(from);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function weekLabel(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${end.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  }
  return (
    start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' – ' +
    end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  );
}

// ─── time-grid positioning ────────────────────────────────────────────────────

interface Positioned {
  appt: Appointment;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
}

function positionAppointments(appts: Appointment[], hourStart: number): Positioned[] {
  const sorted = [...appts].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  return sorted.map(appt => {
    const startD = new Date(appt.startTime);
    const endRaw = new Date(appt.endTime);
    const endD = endRaw <= startD ? new Date(startD.getTime() + 30 * 60 * 1000) : endRaw;
    const startMs = startD.getTime();
    const endMs = endD.getTime();

    const overlapping = sorted.filter(other => {
      const os = new Date(other.startTime).getTime();
      const oeRaw = new Date(other.endTime);
      const oe =
        oeRaw <= new Date(other.startTime)
          ? os + 30 * 60 * 1000
          : oeRaw.getTime();
      return os < endMs && oe > startMs;
    });

    const col = overlapping.findIndex(o => o.id === appt.id);
    const totalCols = overlapping.length;

    const topHours = startD.getHours() + startD.getMinutes() / 60 - hourStart;
    const top = Math.max(0, topHours * HOUR_HEIGHT);
    const durationHours = (endMs - startMs) / (1000 * 60 * 60);
    const height = Math.max(durationHours * HOUR_HEIGHT, 24);

    return { appt, top, height, leftPct: (col / totalCols) * 100, widthPct: 100 / totalCols };
  });
}

// ─── AppointmentCard ──────────────────────────────────────────────────────────

interface AppointmentCardProps {
  appt: Appointment;
  canEdit: boolean;
  groupId: string;
  memberName: (id: string | null) => string;
  navigate: ReturnType<typeof useNavigate>;
  isSubmitting: boolean;
  deletingId: string | null;
  onDelete: (appt: Appointment) => void;
  dimPast?: boolean;
}

function AppointmentCard({
  appt,
  canEdit,
  groupId,
  memberName,
  navigate,
  isSubmitting,
  deletingId,
  onDelete,
  dimPast = false,
}: AppointmentCardProps) {
  const { date, time } = formatDateTime(appt.startTime);
  const past = isPast(appt.startTime);

  return (
    <div
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)', opacity: dimPast && past ? 0.55 : 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>
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
              onClick={() => onDelete(appt)}
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

// ─── ListView ─────────────────────────────────────────────────────────────────

interface ViewProps {
  appointments: Appointment[];
  canEdit: boolean;
  groupId: string;
  memberName: (id: string | null) => string;
  navigate: ReturnType<typeof useNavigate>;
  isSubmitting: boolean;
  deletingId: string | null;
  onDelete: (appt: Appointment) => void;
}

function ListView({ appointments, ...rest }: ViewProps) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const upcoming = sorted.filter(a => !isPast(a.startTime));
  const past = sorted.filter(a => isPast(a.startTime));

  if (sorted.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>No appointments.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-hint)' }}>
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>No upcoming appointments.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map(a => <AppointmentCard key={a.id} appt={a} {...rest} />)}
          </div>
        )}
      </div>
      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-hint)' }}>
            Past
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {past.map(a => <AppointmentCard key={a.id} appt={a} dimPast {...rest} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WeekTimeGridView ─────────────────────────────────────────────────────────

function WeekTimeGridView({ appointments, canEdit, groupId, memberName, navigate, isSubmitting, deletingId, onDelete }: ViewProps) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => weekMonday(today));
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Dynamic hour range based on this week's appointments, min span of 8 hrs
  const { hourStart, hourEnd, gridHours } = useMemo(() => {
    const weekAppts = appointments.filter(a =>
      days.some(d => isSameDay(new Date(a.startTime), d)),
    );
    if (weekAppts.length === 0) {
      const hs = 8, he = 18;
      return { hourStart: hs, hourEnd: he, gridHours: Array.from({ length: he - hs }, (_, i) => hs + i) };
    }
    let minH = 23, maxH = 1;
    for (const appt of weekAppts) {
      const startD = new Date(appt.startTime);
      const endRaw = new Date(appt.endTime);
      const endD = endRaw <= startD ? new Date(startD.getTime() + 30 * 60 * 1000) : endRaw;
      minH = Math.min(minH, startD.getHours());
      maxH = Math.max(maxH, endD.getHours() + (endD.getMinutes() > 0 ? 1 : 0));
    }
    const hs = Math.max(0, minH - 1);
    const he = Math.min(24, Math.max(maxH + 1, hs + 8));
    return { hourStart: hs, hourEnd: he, gridHours: Array.from({ length: he - hs }, (_, i) => hs + i) };
  }, [appointments, days]);

  const totalHeight = (hourEnd - hourStart) * HOUR_HEIGHT;

  // Memoize positioned appointments for all 7 days at once
  const positionedByDay = useMemo(() => {
    return days.map(day => {
      const dayAppts = appointments.filter(a => isSameDay(new Date(a.startTime), day));
      return positionAppointments(dayAppts, hourStart);
    });
  }, [appointments, days, hourStart]);

  // Scroll to current time on mount and when week changes to the current week
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const isCurrentWeek = isSameDay(weekStart, weekMonday(today)) ||
      days.some(d => isSameDay(d, today));
    const targetHour = isCurrentWeek
      ? today.getHours() + today.getMinutes() / 60
      : hourStart + (hourEnd - hourStart) / 2;
    const offset = Math.max(0, (targetHour - hourStart) * HOUR_HEIGHT - 120);
    scrollContainerRef.current.scrollTop = offset;
  }, [weekStart, hourStart, hourEnd]);

  // Clear selected appointment if it was deleted
  useEffect(() => {
    if (selectedAppt && !appointments.find(a => a.id === selectedAppt.id)) {
      setSelectedAppt(null);
    }
  }, [appointments, selectedAppt]);

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60 - hourStart) * HOUR_HEIGHT;
  const showNowLine = nowTop >= 0 && nowTop <= totalHeight;

  function prevWeek() { setWeekStart(d => addDays(d, -7)); }
  function nextWeek() { setWeekStart(d => addDays(d, 7)); }
  function goToToday() { setWeekStart(weekMonday(new Date())); }

  const hasAnyThisWeek = positionedByDay.some(p => p.length > 0);

  return (
    <div>
      {/* Navigation */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevWeek}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          &larr;
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {weekLabel(weekStart)}
          </span>
          <button
            type="button"
            onClick={goToToday}
            className="rounded border px-2 py-0.5 text-xs font-semibold"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={nextWeek}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          &rarr;
        </button>
      </div>

      {/* Grid container */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div style={{ minWidth: '560px' }}>
          {/* Day headers — not scrollable */}
          <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div style={{ width: '44px', flexShrink: 0 }} />
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              const isPastDay = isBeforeDay(day, today);
              return (
                <div key={i} className="flex-1 py-2 text-center" style={{ opacity: isPastDay ? 0.5 : 1 }}>
                  <div className="text-xs font-semibold" style={{ color: 'var(--color-text-hint)' }}>
                    {DAY_LABELS[i]}
                  </div>
                  <div
                    className="mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: isToday ? 'var(--color-primary)' : 'transparent',
                      color: isToday ? 'white' : 'var(--color-text-primary)',
                    }}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable time area */}
          <div
            ref={scrollContainerRef}
            style={{ maxHeight: '480px', overflowY: 'auto' }}
          >
            <div className="flex">
              {/* Hour labels */}
              <div style={{ width: '44px', flexShrink: 0 }}>
                {gridHours.map(h => (
                  <div
                    key={h}
                    className="flex items-start justify-end pr-2 text-xs"
                    style={{ height: `${HOUR_HEIGHT}px`, paddingTop: '2px', color: 'var(--color-text-hint)' }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, di) => {
                const isPastDay = isBeforeDay(day, today);
                const isToday = isSameDay(day, today);
                const positioned = positionedByDay[di];

                return (
                  <div
                    key={di}
                    className="flex-1 relative border-l"
                    style={{
                      borderColor: 'var(--color-border)',
                      height: `${totalHeight}px`,
                      opacity: isPastDay ? 0.55 : 1,
                      background: isToday ? 'rgba(99,102,241,0.03)' : 'white',
                    }}
                  >
                    {/* Hour grid lines */}
                    {gridHours.map(h => (
                      <div
                        key={h}
                        className="absolute w-full border-t"
                        style={{
                          top: `${(h - hourStart) * HOUR_HEIGHT}px`,
                          borderColor: 'var(--color-border)',
                          opacity: 0.6,
                        }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {isToday && showNowLine && (
                      <div
                        className="absolute w-full z-10 pointer-events-none"
                        style={{ top: `${nowTop}px` }}
                      >
                        <div
                          className="absolute -left-1 -translate-y-1/2 w-2 h-2 rounded-full"
                          style={{ background: 'var(--color-primary)' }}
                        />
                        <div className="w-full border-t-2" style={{ borderColor: 'var(--color-primary)' }} />
                      </div>
                    )}

                    {/* Appointment blocks */}
                    {positioned.map(({ appt, top, height, leftPct, widthPct }) => {
                      const { time } = formatDateTime(appt.startTime);
                      const past = isPast(appt.startTime);
                      const isSelected = selectedAppt?.id === appt.id;
                      return (
                        <button
                          key={appt.id}
                          type="button"
                          onClick={() => setSelectedAppt(isSelected ? null : appt)}
                          className="absolute rounded text-left overflow-hidden px-1.5 py-1 text-xs transition-opacity"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `${leftPct}%`,
                            width: `calc(${widthPct}% - 2px)`,
                            background: past ? '#e5e7eb' : 'var(--color-primary)',
                            color: past ? 'var(--color-text-secondary)' : 'white',
                            zIndex: isSelected ? 20 : 10,
                            outline: isSelected ? '2px solid var(--color-primary)' : 'none',
                            outlineOffset: '1px',
                          }}
                        >
                          <div className="font-semibold truncate leading-tight">{appt.title}</div>
                          {height >= 36 && <div className="opacity-80 truncate">{time}</div>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected appointment detail */}
      {selectedAppt && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AppointmentCard
            appt={selectedAppt}
            canEdit={canEdit}
            groupId={groupId}
            memberName={memberName}
            navigate={navigate}
            isSubmitting={isSubmitting}
            deletingId={deletingId}
            onDelete={onDelete}
            dimPast
          />
        </div>
      )}

      {!hasAnyThisWeek && (
        <p className="mt-4 text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No appointments this week.
        </p>
      )}
    </div>
  );
}

// ─── MonthGridView ────────────────────────────────────────────────────────────

function MonthGridView({ appointments, canEdit, groupId, memberName, navigate, isSubmitting, deletingId, onDelete }: ViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const totalDays = daysInMonth(year, month);
  const firstDayRaw = new Date(year, month, 1).getDay();
  const leadingBlanks = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  const apptsByDay = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    for (const appt of appointments) {
      const d = new Date(appt.startTime);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(appt);
      }
    }
    return map;
  }, [appointments, year, month]);

  const hasAnyThisMonth = Object.keys(apptsByDay).length > 0;

  const selectedDayAppts = useMemo(
    () =>
      selectedDate
        ? appointments
            .filter(a => isSameDay(new Date(a.startTime), selectedDate))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        : [],
    [appointments, selectedDate],
  );

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
    setSelectedDate(null);
  }
  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(null);
  }

  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          &larr;
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {monthLabel(year, month)}
          </span>
          <button
            type="button"
            onClick={goToToday}
            className="rounded border px-2 py-0.5 text-xs font-semibold"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--color-text-hint)' }}>
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-border)' }}
      >
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} className="bg-white min-h-[52px]" />;

          const cellDate = new Date(year, month, day);
          const dayAppts = apptsByDay[day] ?? [];
          const count = dayAppts.length;
          const isToday = isSameDay(cellDate, today);
          const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;
          const isPastDay = isBeforeDay(cellDate, today);

          return (
            <button
              key={day}
              type="button"
              onClick={() => count > 0 ? setSelectedDate(isSelected ? null : cellDate) : undefined}
              className="relative flex flex-col items-center pt-1.5 pb-2 min-h-[52px] transition-colors"
              style={{
                background: isSelected ? 'var(--color-primary)' : 'white',
                opacity: isPastDay && count === 0 ? 0.4 : 1,
                cursor: count > 0 ? 'pointer' : 'default',
              }}
            >
              {/* Day number */}
              <span
                className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                style={{
                  background: isToday && !isSelected ? 'var(--color-primary)' : 'transparent',
                  color: isSelected ? 'white' : isToday ? 'white' : isPastDay ? 'var(--color-text-hint)' : 'var(--color-text-primary)',
                }}
              >
                {day}
              </span>

              {/* Appointment count badge */}
              {count > 0 && (
                count === 1 ? (
                  // Single dot for one appointment
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: isSelected ? 'white' : 'var(--color-primary)' }}
                  />
                ) : (
                  // Pill badge with count for multiple
                  <span
                    className="mt-1 flex items-center justify-center rounded-full text-[10px] font-bold leading-none"
                    style={{
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 4px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--color-primary)',
                      color: isSelected ? 'white' : 'white',
                    }}
                  >
                    {count > 9 ? '9+' : count}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {!hasAnyThisMonth && (
        <p className="mt-6 text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No appointments this month.
        </p>
      )}

      {selectedDate && selectedDayAppts.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-hint)' }}>
            {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedDayAppts.map(a => (
              <AppointmentCard
                key={a.id}
                appt={a}
                canEdit={canEdit}
                groupId={groupId}
                memberName={memberName}
                navigate={navigate}
                isSubmitting={isSubmitting}
                deletingId={deletingId}
                onDelete={onDelete}
                dimPast
              />
            ))}
          </div>
        </div>
      )}

      {selectedDate && selectedDayAppts.length === 0 && (
        <p className="mt-6 text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No appointments on this day.
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { group, loading: groupLoading } = useGroupDetail(groupId);
  const patientId = group?.patientId ?? '';
  const { appointments, loading, isSubmitting, deleteAppointment } = useAppointments(patientId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (groupLoading) {
    return (
      <section>
        <PageHeader title="Appointments" subtitle="View and manage upcoming care appointments." />
        <LoadingPanel message="Loading group…" />
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

  function memberName(id: string | null): string {
    if (!id) return 'Unknown';
    return group!.members.find(m => m.id === id)?.name ?? 'Unknown';
  }

  const sharedProps: ViewProps = {
    appointments,
    canEdit,
    groupId,
    memberName,
    navigate,
    isSubmitting,
    deletingId,
    onDelete: handleDelete,
  };

  const VIEWS: { id: ViewMode; label: string; icon: ReactNode }[] = [
    { id: 'list', label: 'List', icon: <LayoutList size={13} strokeWidth={2} /> },
    { id: 'week', label: 'Week', icon: <Clock size={13} strokeWidth={2} /> },
    { id: 'month', label: 'Month', icon: <CalendarDays size={13} strokeWidth={2} /> },
  ];

  return (
    <section>
      <PageHeader
        eyebrow="Care group"
        title="Appointments"
        subtitle={`View and manage appointments for ${group.name}.`}
        actions={
          canEdit ? (
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}/appointments/new`)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={15} strokeWidth={2.2} />
              <span className="hidden sm:inline">New appointment</span>
              <span className="sm:hidden">New</span>
            </button>
          ) : undefined
        }
      />

      <div
        className="mb-6 inline-flex rounded-lg border overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {VIEWS.map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => setViewMode(v.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: viewMode === v.id ? 'var(--color-primary)' : 'var(--color-card)',
              color: viewMode === v.id ? 'white' : 'var(--color-text-secondary)',
            }}
            aria-pressed={viewMode === v.id}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingPanel message="Loading appointments..." />
      ) : viewMode === 'list' ? (
        <ListView {...sharedProps} />
      ) : viewMode === 'week' ? (
        <WeekTimeGridView {...sharedProps} />
      ) : (
        <MonthGridView {...sharedProps} />
      )}
    </section>
  );
}
