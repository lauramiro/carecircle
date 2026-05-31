import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  compareShiftSlots,
  formatShiftSlotShort,
  resolveShiftBounds,
} from '../../lib/shifts';
import { useMyShifts, type MyShiftsGroup } from '../../hooks/shifts/useMyShifts';
import { useAuth } from '../../contexts/AuthContext';
import type { ShiftWithHandover } from '../../api/shifts/shift.types';

interface MyShiftsTodayWidgetProps {
  groups: MyShiftsGroup[];
}

function sortTodayShifts(shifts: ShiftWithHandover[]): ShiftWithHandover[] {
  return [...shifts].sort((a, b) => compareShiftSlots(a.slot, b.slot));
}

function handoverLabel(name: string | null): string {
  return name?.trim() || 'Unassigned';
}

export default function MyShiftsTodayWidget({ groups }: MyShiftsTodayWidgetProps) {
  const { session } = useAuth();
  const caregiverId = session?.user?.id;
  const { todayByGroup, todayShifts, loading, error } = useMyShifts(caregiverId, groups);
  const shiftCount = todayShifts.length;

  return (
    <article
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            <CalendarClock size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              My Shifts Today
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
              {shiftCount > 0
                ? `${shiftCount} shift${shiftCount === 1 ? '' : 's'} across ${todayByGroup.length} care ${todayByGroup.length === 1 ? 'circle' : 'circles'}`
                : `Across ${groups.length} care ${groups.length === 1 ? 'circle' : 'circles'}`}
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/my-shifts"
          className="shrink-0 text-xs font-semibold no-underline"
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {todayByGroup.map((section) => (
            <section
              key={section.groupId}
              className="rounded-xl border p-3"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-muted)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  className="truncate text-sm font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                  title={section.groupName}
                >
                  {section.groupName}
                </h3>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {section.shifts.length}
                </span>
              </div>

              <ul className="mt-2 space-y-2">
                {sortTodayShifts(section.shifts).map((shift) => (
                  <li
                    key={`${section.groupId}-${shift.shiftDate}-${shift.slot}`}
                    className="rounded-lg border px-2.5 py-2"
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-card)',
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {formatShiftSlotShort(shift.slot)}
                      </p>
                      <p
                        className="shrink-0 text-[11px] font-medium tabular-nums"
                        style={{ color: 'var(--color-text-hint)' }}
                      >
                        {resolveShiftBounds(shift.slot).replace('-', '–')}
                      </p>
                    </div>
                    <p
                      className="mt-1 truncate text-xs"
                      style={{ color: 'var(--color-text-secondary)' }}
                      title={`Handover from ${handoverLabel(shift.handoverFromName)} to ${handoverLabel(shift.handoverToName)}`}
                    >
                      {handoverLabel(shift.handoverFromName)} → {handoverLabel(shift.handoverToName)}
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
