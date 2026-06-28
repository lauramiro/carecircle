import { parseResponseJson } from '../../utils/helper';
import { getGroups } from '../groups/groups.service';
import { canAssignShifts } from '../../lib/carePermissions';
import { supabase } from '../../lib/supabaseClient';
import type { Database } from '../../lib/database.types';
import type {
  GroupMemberScheduleRow,
  SaveWeeklyShiftAssignmentPayload,
  ShiftSlotValue,
  ShiftWarningSummary,
  WeeklyShiftAssignment,
} from './shift.types';
import { enrichAllWithHandover } from './shift.handover';
import {
  buildWeekDates,
  countUnassignedSlots,
  getStartOfWeek,
  getWeekEnd,
  mergeWeeklyAssignments,
  toISODate,
} from './shift.utils';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

type WeeklyShiftAssignmentRow = Database['public']['Tables']['weekly_shift_assignments']['Row'] & {
  assignee: { full_name: string | null } | null;
};

type WeeklyShiftAssignmentListRow = Pick<
  Database['public']['Tables']['weekly_shift_assignments']['Row'],
  'group_id' | 'shift_date' | 'shift_slot' | 'assigned_caregiver_id'
>;

const weeklyShiftAssignmentSelect = `
  id,
  group_id,
  shift_date,
  shift_slot,
  assigned_caregiver_id,
  updated_at,
  assignee:profiles!weekly_shift_assignments_assigned_caregiver_id_fkey (
    full_name
  )
`;

function mapWeeklyShiftAssignment(row: WeeklyShiftAssignmentRow): WeeklyShiftAssignment {
  return {
    id: row.id,
    groupId: row.group_id,
    shiftDate: row.shift_date,
    slot: row.shift_slot as ShiftSlotValue,
    assignedCaregiverId: row.assigned_caregiver_id,
    assigneeName: row.assignee?.full_name ?? null,
    updatedAt: row.updated_at,
  };
}

export async function getWeeklyShiftAssignments(
  groupId: string,
  weekStart: string,
): Promise<WeeklyShiftAssignment[]> {
  const { data, error } = await supabase
    .from('weekly_shift_assignments')
    .select(weeklyShiftAssignmentSelect)
    .eq('group_id', groupId)
    .gte('shift_date', weekStart)
    .lte('shift_date', getWeekEnd(weekStart));

  if (error) {
    console.error('getWeeklyShiftAssignments:', error);
    throw new Error('Unable to load weekly shift assignments');
  }

  return mergeWeeklyAssignments(
    groupId,
    weekStart,
    ((data ?? []) as WeeklyShiftAssignmentRow[]).map(mapWeeklyShiftAssignment),
  );
}

export async function saveWeeklyShiftAssignment(
  payload: SaveWeeklyShiftAssignmentPayload,
): Promise<WeeklyShiftAssignment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be signed in to save a shift assignment.');
  }

  const response = await fetch(`${apiBaseUrl}/api/shifts/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, changedBy: user.id }),
  });

  if (!response.ok) {
    let errorData: { message?: string } = {};
    try {
      errorData = await parseResponseJson(response);
    } catch (err) {
      errorData = { message: 'Unable to save the shift assignment' };
    }
    console.error('saveWeeklyShiftAssignment:', errorData);
    throw new Error(errorData.message || 'Unable to save the shift assignment');
  }

  const data = await parseResponseJson(response);
  return mapWeeklyShiftAssignment(data as WeeklyShiftAssignmentRow);
}

export async function getWeeklyShiftWarnings(): Promise<ShiftWarningSummary[]> {
  const groups = (await getGroups()).filter((group) => canAssignShifts(group.role));
  if (groups.length === 0) return [];

  const weekStart = toISODate(getStartOfWeek(new Date()));
  const weekDates = new Set(buildWeekDates(weekStart));
  const groupIds = groups.map((group) => group.id);
  const { data, error } = await supabase
    .from('weekly_shift_assignments')
    .select('group_id, shift_date, shift_slot, assigned_caregiver_id')
    .in('group_id', groupIds)
    .gte('shift_date', weekStart)
    .lte('shift_date', getWeekEnd(weekStart));

  if (error) {
    console.error('getWeeklyShiftWarnings:', error);
    throw new Error('Unable to load weekly shift warnings');
  }

  const rows = (data ?? []) as WeeklyShiftAssignmentListRow[];

  return groups
    .map((group) => {
      const assignedSlots = rows
        .filter((row) => row.group_id === group.id)
        .filter((row) => row.assigned_caregiver_id && weekDates.has(row.shift_date))
        .map((row) => ({
          id: null,
          groupId: row.group_id,
          shiftDate: row.shift_date,
          slot: row.shift_slot as ShiftSlotValue,
          assignedCaregiverId: row.assigned_caregiver_id,
          assigneeName: null,
          updatedAt: null,
        }));

      const unassignedCount = countUnassignedSlots(
        mergeWeeklyAssignments(group.id, weekStart, assignedSlots),
      );

      return {
        groupId: group.id,
        groupName: group.name,
        unassignedCount,
        weekStart,
        weekEnd: getWeekEnd(weekStart),
      };
    })
    .filter((warning) => warning.unassignedCount > 0);
}

export async function getShiftAssignmentsForRange(
  groupId: string,
  startDate: string,
  endDate: string,
): Promise<WeeklyShiftAssignment[]> {
  const { data, error } = await supabase
    .from('weekly_shift_assignments')
    .select(weeklyShiftAssignmentSelect)
    .eq('group_id', groupId)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('shift_date', { ascending: true });

  if (error) {
    console.error('getShiftAssignmentsForRange:', error);
    throw new Error('Unable to load shift assignments');
  }

  return ((data ?? []) as WeeklyShiftAssignmentRow[]).map(mapWeeklyShiftAssignment);
}

export async function getMyShifts(
  caregiverId: string,
  groupId: string,
  startDate: string,
  endDate: string,
): Promise<WeeklyShiftAssignment[]> {
  const assignments = await getShiftAssignmentsForRange(groupId, startDate, endDate);
  return assignments.filter((assignment) => assignment.assignedCaregiverId === caregiverId);
}

export function buildGroupScheduleMatrix(
  members: Array<{ id: string; name: string }>,
  weekStart: string,
  assignments: WeeklyShiftAssignment[],
): GroupMemberScheduleRow[] {
  const weekDates = buildWeekDates(weekStart);
  const slots = ['morning', 'afternoon', 'evening', 'overnight'] as const;

  return members.map((member) => ({
    memberId: member.id,
    memberName: member.name,
    cells: weekDates.flatMap((shiftDate) =>
      slots.map((slot) => {
        const assignment = assignments.find(
          (row) => row.shiftDate === shiftDate && row.slot === slot,
        );
        const isAssigned = assignment?.assignedCaregiverId === member.id;
        return {
          shiftDate,
          slot,
          assigneeName: isAssigned ? member.name : null,
          assignedCaregiverId: isAssigned ? member.id : null,
        };
      }),
    ),
  }));
}

export { enrichAllWithHandover };