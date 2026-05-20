import type { ShiftSlot, WeeklyShiftAssignment } from './shift.types';
import { SHIFT_SLOTS } from './shift.types';

export function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getStartOfWeek(value: Date): Date {
  const normalized = new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  ));
  const offset = (normalized.getUTCDay() + 6) % 7;
  normalized.setUTCDate(normalized.getUTCDate() - offset);
  return normalized;
}

export function buildWeekDates(weekStart: string): string[] {
  const start = parseISODate(weekStart);
  return Array.from({ length: 7 }, (_, index) => toISODate(addDays(start, index)));
}

export function getWeekEnd(weekStart: string): string {
  return toISODate(addDays(parseISODate(weekStart), 6));
}

export function buildEmptyWeeklyAssignments(
  groupId: string,
  weekStart: string,
): WeeklyShiftAssignment[] {
  return buildWeekDates(weekStart).flatMap((shiftDate) =>
    SHIFT_SLOTS.map((slot) => ({
      id: null,
      groupId,
      shiftDate,
      slot,
      assignedCaregiverId: null,
      assigneeName: null,
      updatedAt: null,
    })),
  );
}

export function getAssignmentKey(shiftDate: string, slot: ShiftSlot): string {
  return `${shiftDate}:${slot}`;
}

export function mergeWeeklyAssignments(
  groupId: string,
  weekStart: string,
  assignments: WeeklyShiftAssignment[],
): WeeklyShiftAssignment[] {
  const byKey = new Map(assignments.map((assignment) => [
    getAssignmentKey(assignment.shiftDate, assignment.slot),
    assignment,
  ]));

  return buildEmptyWeeklyAssignments(groupId, weekStart).map((emptyAssignment) => {
    return byKey.get(getAssignmentKey(emptyAssignment.shiftDate, emptyAssignment.slot))
      ?? emptyAssignment;
  });
}

export function countUnassignedSlots(assignments: WeeklyShiftAssignment[]): number {
  return assignments.filter((assignment) => !assignment.assignedCaregiverId).length;
}