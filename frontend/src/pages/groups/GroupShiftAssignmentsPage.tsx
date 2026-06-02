import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import GroupScheduleOverview from '../../components/shifts/GroupScheduleOverview';
import {
  shiftAssignmentDayCardStyles,
  shiftAssignmentHintStyles,
  shiftAssignmentSelectStyles,
  shiftCoverageBadgeLabel,
  shiftCoverageBadgeStyles,
} from '../../components/shifts/shiftAssignmentStyles';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { canAssignShifts } from '../../lib/carePermissions';
import { useWeeklyShiftAssignments } from '../../hooks/shifts/useWeeklyShiftAssignments';
import { SHIFT_SLOT_LABELS, SHIFT_SLOTS } from '../../api/shifts/shift.types';
import {
  addDays,
  buildWeekDates,
  countUnassignedSlots,
  getAssignmentKey,
  getStartOfWeek,
  parseISODate,
  toISODate,
} from '../../api/shifts/shift.utils';
import { formatCustomShiftSlot, formatShiftSlotLabel } from '../../lib/shifts';

type AssignmentTab = 'week' | 'day' | 'custom';

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
  const [weekStart, setWeekStart] = useState(() => toISODate(getStartOfWeek(new Date())));
  const [activeTab, setActiveTab] = useState<AssignmentTab>('week');
  const [selectedDay, setSelectedDay] = useState(() => toISODate(new Date()));
  const [customDate, setCustomDate] = useState(() => toISODate(new Date()));
  const [customStart, setCustomStart] = useState('10:00');
  const [customEnd, setCustomEnd] = useState('14:00');
  const [customAssignee, setCustomAssignee] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const { assignments, loading, error, savingKey, saveAssignment } = useWeeklyShiftAssignments(
    groupId,
    weekStart,
  );

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (groupLoading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Shift Assignments</h1>
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
        <h1 className="text-2xl font-extrabold">Shift Assignments</h1>
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
  const canAssign = canAssignShifts(group.role);
  const uncoveredCount = countUnassignedSlots(assignments);

  const weekLabel = `${formatShiftDate(weekDates[0])} – ${formatShiftDate(weekDates[6])}`;

  function shiftWeek(direction: -1 | 1) {
    const next = addDays(parseISODate(weekStart), direction * 7);
    setWeekStart(toISODate(next));
  }

  async function saveCustomAssignment() {
    if (!group) return;
    if (!customAssignee) {
      setCustomError('Choose a carer for the custom shift.');
      return;
    }
    if (customStart >= customEnd) {
      setCustomError('End time must be after start time for same-day custom shifts.');
      return;
    }

    setCustomError(null);
    const slot = formatCustomShiftSlot(customStart, customEnd);
    await saveAssignment({
      groupId: group.id,
      shiftDate: customDate,
      slot,
      assignedCaregiverId: customAssignee,
    });
  }

  const dayAssignments = SHIFT_SLOTS.map((slot) => ({
    slot,
    assignment: assignmentsByKey.get(getAssignmentKey(selectedDay, slot)),
  }));

  const tabs: Array<{ id: AssignmentTab; label: string }> = [
    { id: 'week', label: 'Week view' },
    { id: 'day', label: 'Day view' },
    { id: 'custom', label: 'Custom shift' },
  ];

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
            Assign daily, weekly, or custom session coverage for your care circle.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold"
          style={shiftCoverageBadgeStyles(uncoveredCount > 0)}
        >
          <AlertTriangle size={16} />
          {shiftCoverageBadgeLabel(uncoveredCount)}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'white',
                color: activeTab === tab.id ? 'white' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'week' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => shiftWeek(-1)}
              className="rounded-lg border p-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {weekLabel}
            </span>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => shiftWeek(1)}
              className="rounded-lg border p-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
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
        <>
          {activeTab === 'week' && (
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
                      Session
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
                        {formatShiftSlotLabel(slot)}
                      </th>
                      {weekDates.map((shiftDate) => {
                        const assignment = assignmentsByKey.get(getAssignmentKey(shiftDate, slot));
                        const isSaving = savingKey === getAssignmentKey(shiftDate, slot);
                        const isUnassigned = !assignment?.assignedCaregiverId;

                        return (
                          <td
                            key={`${shiftDate}-${slot}`}
                            className="border-b px-4 py-4 align-top"
                            style={{
                              borderColor: 'var(--color-border)',
                              backgroundColor: isUnassigned
                                ? 'var(--color-bg-muted)'
                                : 'var(--color-card)',
                            }}
                          >
                            <div className="space-y-2">
                              <select
                                aria-label={`${SHIFT_SLOT_LABELS[slot]} shift on ${formatShiftDate(shiftDate)}`}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                                style={shiftAssignmentSelectStyles(isUnassigned)}
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
                                style={shiftAssignmentHintStyles(isUnassigned)}
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

          {activeTab === 'day' && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Select day
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  className="mt-2 block rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                {dayAssignments.map(({ slot, assignment }) => {
                  const isSaving = savingKey === getAssignmentKey(selectedDay, slot);
                  const isUnassigned = !assignment?.assignedCaregiverId;

                  return (
                    <article
                      key={slot}
                      className="rounded-2xl border bg-white p-4"
                      style={shiftAssignmentDayCardStyles(isUnassigned)}
                    >
                      <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatShiftSlotLabel(slot)}
                      </h3>
                      <select
                        aria-label={`${SHIFT_SLOT_LABELS[slot]} on ${selectedDay}`}
                        className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
                        style={shiftAssignmentSelectStyles(isUnassigned)}
                        value={assignment?.assignedCaregiverId ?? ''}
                        disabled={!canAssign || isSaving}
                        onChange={(event) => {
                          void saveAssignment({
                            groupId: group.id,
                            shiftDate: selectedDay,
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
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div
              className="max-w-xl rounded-2xl border bg-white p-5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h3 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Custom shift assignment
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Create a one-off session outside the standard morning/afternoon/evening windows.
              </p>

              <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold">
                  Date
                  <input
                    type="date"
                    value={customDate}
                    onChange={(event) => setCustomDate(event.target.value)}
                    className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-semibold">
                    Start
                    <input
                      type="time"
                      value={customStart}
                      onChange={(event) => setCustomStart(event.target.value)}
                      className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    End
                    <input
                      type="time"
                      value={customEnd}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  </label>
                </div>
                <label className="block text-sm font-semibold">
                  Assign to
                  <select
                    value={customAssignee}
                    onChange={(event) => setCustomAssignee(event.target.value)}
                    disabled={!canAssign}
                    className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option value="">Choose a carer</option>
                    {activeMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>

                {customError && (
                  <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
                    {customError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!canAssign}
                  onClick={() => void saveCustomAssignment()}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Save custom shift
                </button>
              </div>
            </div>
          )}

          {activeTab === 'week' && (
            <GroupScheduleOverview
              members={activeMembers.map((member) => ({ id: member.id, name: member.name }))}
              weekStart={weekStart}
              assignments={assignments}
            />
          )}
        </>
      )}
    </section>
  );
}
