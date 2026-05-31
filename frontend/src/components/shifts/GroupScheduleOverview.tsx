import { SHIFT_SLOTS } from '../../api/shifts/shift.types';
import type { GroupMemberScheduleRow, WeeklyShiftAssignment } from '../../api/shifts/shift.types';
import { buildGroupScheduleMatrix } from '../../api/shifts/shift.service';
import { buildWeekDates } from '../../api/shifts/shift.utils';
import { formatShiftSlotLabel } from '../../lib/shifts';

interface GroupScheduleOverviewProps {
  members: Array<{ id: string; name: string }>;
  weekStart: string;
  assignments: WeeklyShiftAssignment[];
}

function formatDayHeader(shiftDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
  }).format(new Date(`${shiftDate}T00:00:00.000Z`));
}

export default function GroupScheduleOverview({
  members,
  weekStart,
  assignments,
}: GroupScheduleOverviewProps) {
  const matrix: GroupMemberScheduleRow[] = buildGroupScheduleMatrix(members, weekStart, assignments);
  const weekDates = buildWeekDates(weekStart);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
        Group schedule overview
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Rolling view of who is covering each session this week.
      </p>

      <div
        className="mt-4 overflow-x-auto rounded-2xl border bg-white"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                className="sticky left-0 border-b bg-white px-3 py-2 text-left font-bold"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Member
              </th>
              {weekDates.map((shiftDate) =>
                SHIFT_SLOTS.map((slot) => (
                  <th
                    key={`${shiftDate}-${slot}`}
                    className="border-b px-2 py-2 text-left font-semibold"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <span className="block">{formatDayHeader(shiftDate)}</span>
                    <span className="block font-normal">{slot.slice(0, 3)}</span>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.memberId}>
                <th
                  className="sticky left-0 border-b bg-white px-3 py-2 text-left text-sm font-semibold"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                >
                  {row.memberName}
                </th>
                {row.cells.map((cell) => {
                  const isAssigned = cell.assignedCaregiverId === row.memberId;
                  return (
                    <td
                      key={`${row.memberId}-${cell.shiftDate}-${cell.slot}`}
                      className="border-b px-2 py-2 text-center"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: isAssigned ? 'var(--color-primary-light)' : 'transparent',
                        color: isAssigned ? 'var(--color-primary)' : 'var(--color-text-hint)',
                      }}
                      title={formatShiftSlotLabel(cell.slot)}
                    >
                      {isAssigned ? '●' : '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
