import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatShiftSlotLabel } from '../../lib/shifts';
import { useMyShifts, type MyShiftsGroup } from '../../hooks/shifts/useMyShifts';
import { useAuth } from '../../contexts/AuthContext';

interface MyShiftsTodayWidgetProps {
  groups: MyShiftsGroup[];
}

export default function MyShiftsTodayWidget({ groups }: MyShiftsTodayWidgetProps) {
  const { session } = useAuth();
  const caregiverId = session?.user?.id;
  const { todayByGroup, loading, error } = useMyShifts(caregiverId, groups);

  return (
    <article
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            <CalendarClock size={16} strokeWidth={2} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              My Shifts Today
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
              Across {groups.length} care {groups.length === 1 ? 'circle' : 'circles'}
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/my-shifts"
          className="text-xs font-semibold no-underline"
          style={{ color: 'var(--color-primary)' }}
        >
          View all
        </Link>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          Loading your shifts…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error}
        </p>
      )}

      {!loading && !error && todayByGroup.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No shifts assigned for you today.
        </p>
      )}

      {!loading && !error && todayByGroup.length > 0 && (
        <div className="space-y-4">
          {todayByGroup.map((section) => (
            <section key={section.groupId}>
              <h3
                className="mb-2 text-xs font-bold uppercase tracking-wide"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {section.groupName}
              </h3>
              <ul className="space-y-3">
                {section.shifts.map((shift) => (
                  <li
                    key={`${section.groupId}-${shift.shiftDate}-${shift.slot}`}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {formatShiftSlotLabel(shift.slot)}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Handover from: {shift.handoverFromName ?? 'Unassigned'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Handover to: {shift.handoverToName ?? 'Unassigned'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
