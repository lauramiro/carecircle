import { getAssignmentKey } from './shift.utils';
import type { ShiftWithHandover, WeeklyShiftAssignment } from './shift.types';
import { getNextSlotRef, getPreviousSlotRef } from '../../lib/shifts';

function findAssignment(
  assignments: WeeklyShiftAssignment[],
  shiftDate: string,
  slot: string,
): WeeklyShiftAssignment | undefined {
  return assignments.find(
    (assignment) => getAssignmentKey(assignment.shiftDate, assignment.slot) === getAssignmentKey(shiftDate, slot),
  );
}

export function enrichWithHandover(
  assignment: WeeklyShiftAssignment,
  allAssignments: WeeklyShiftAssignment[],
): ShiftWithHandover {
  const previousRef = getPreviousSlotRef(assignment.shiftDate, assignment.slot);
  const nextRef = getNextSlotRef(assignment.shiftDate, assignment.slot);

  const previous = findAssignment(allAssignments, previousRef.shiftDate, previousRef.slot);
  const next = findAssignment(allAssignments, nextRef.shiftDate, nextRef.slot);

  return {
    ...assignment,
    handoverFromName: previous?.assigneeName ?? null,
    handoverToName: next?.assigneeName ?? null,
  };
}

export function enrichAllWithHandover(
  assignments: WeeklyShiftAssignment[],
): ShiftWithHandover[] {
  return assignments
    .filter((assignment) => assignment.assignedCaregiverId)
    .map((assignment) => enrichWithHandover(assignment, assignments));
}
