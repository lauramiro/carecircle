import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useWeeklyShiftAssignments } from '../../hooks/shifts/useWeeklyShiftAssignments';
import { SHIFT_SLOT_LABELS, SHIFT_SLOTS } from '../../api/shifts/shift.types';
import {
  buildWeekDates,
  countUnassignedSlots,
  getAssignmentKey,
  getStartOfWeek,
  toISODate,
} from '../../api/shifts/shift.utils';

function formatShiftDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export default function GroupShiftAssignmentsPage() {
  const { groupId } = useParams();
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const weekStart = useMemo(() => toISODate(getStartOfWeek(new Date())), []);
  const { assignments, loading, error, savingKey, saveAssignment } = useWeeklyShiftAssignments(
    groupId,
    weekStart,
  );

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (groupLoading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Weekly Shift Assignments</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading group details...
        </div>
      </section>
    );
  }

  if (groupError || !group) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Weekly Shift Assignments</h1>
        <div
          className="mt-6 rounded-xl border p-6 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {groupError ?? 'Group not found.'}
        </div>
      </section>
    );
  }

  const weekDates = buildWeekDates(weekStart);
  const assignmentsByKey = new Map(assignments.map((assignment) => [
    getAssignmentKey(assignment.shiftDate, assignment.slot),
    assignment,
  ]));
  const activeMembers = group.members.filter((member) => member.status === 'Active');
  const canAssign = group.role === 'Admin';
  const uncoveredCount = countUnassignedSlots(assignments);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
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
            {group.name} Shift Coverage
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Assign morning, afternoon, evening, and overnight coverage for the current week.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold"
          style={{
            borderColor: uncoveredCount > 0 ? '#f59e0b' : 'var(--color-border)',
            color: uncoveredCount > 0 ? '#92400e' : 'var(--color-text-secondary)',
            backgroundColor: uncoveredCount > 0 ? '#fef3c7' : 'white',
          }}
        >
          <AlertTriangle size={16} />
          {uncoveredCount > 0
            ? `${uncoveredCount} uncovered shift${uncoveredCount === 1 ? '' : 's'} this week`
            : 'All shifts covered this week'}
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="rounded-xl border bg-white p-6 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Loading shift assignments...
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border bg-white"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="border-b px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  Shift window
                </th>
                {weekDates.map((shiftDate) => (
                  <th
                    key={shiftDate}
                    className="border-b px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {formatShiftDate(shiftDate)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHIFT_SLOTS.map((slot) => (
                <tr key={slot}>
                  <th
                    className="border-b px-4 py-4 text-left text-sm font-semibold"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                  >
                    {SHIFT_SLOT_LABELS[slot]}
                  </th>
                  {weekDates.map((shiftDate) => {
                    const assignment = assignmentsByKey.get(getAssignmentKey(shiftDate, slot));
                    const isSaving = savingKey === getAssignmentKey(shiftDate, slot);
                    const isUnassigned = !assignment?.assignedCaregiverId;

                    return (
                      <td
                        key={`${shiftDate}-${slot}`}
                        className="border-b px-4 py-4 align-top"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="space-y-2">
                          <select
                            aria-label={`${SHIFT_SLOT_LABELS[slot]} shift on ${formatShiftDate(shiftDate)}`}
                            className="w-full rounded-lg border px-3 py-2 text-sm"
                            style={{
                              borderColor: isUnassigned ? '#f59e0b' : 'var(--color-border)',
                              color: 'var(--color-text-primary)',
                              backgroundColor: isUnassigned ? '#fffbeb' : 'white',
                            }}
                            value={assignment?.assignedCaregiverId ?? ''}
                            disabled={!canAssign || isSaving}
                            onChange={(event) => {
                              void saveAssignment({
                                groupId: group.id,
                                shiftDate,
                                slot,
                                assignedCaregiverId: event.target.value || null,
                              });
                            }}
                          >
                            <option value="">Unassigned</option>
                            {activeMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                          <p
                            className="text-xs font-medium"
                            style={{ color: isUnassigned ? '#b45309' : 'var(--color-text-secondary)' }}
                          >
                            {isSaving
                              ? 'Saving...'
                              : isUnassigned
                                ? 'Coverage needed'
                                : `Assigned to ${assignment?.assigneeName ?? 'family member'}`}
                          </p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}