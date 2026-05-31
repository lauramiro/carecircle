import { formatShiftSlotLabel } from '../../lib/shifts';
import type { ShiftWithHandover } from '../../api/shifts/shift.types';

interface ShiftHandoverListProps {
  shifts: ShiftWithHandover[];
  emptyMessage: string;
}

function formatShiftDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default function ShiftHandoverList({ shifts, emptyMessage }: ShiftHandoverListProps) {
  if (shifts.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {shifts.map((shift) => (
        <li
          key={`${shift.shiftDate}-${shift.slot}`}
          className="rounded-xl border bg-white px-4 py-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {formatShiftDate(shift.shiftDate)}
            </p>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              {formatShiftSlotLabel(shift.slot)}
            </p>
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Handover from: {shift.handoverFromName ?? 'Unassigned'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Handover to: {shift.handoverToName ?? 'Unassigned'}
          </p>
        </li>
      ))}
    </ul>
  );
}
