import { supabase } from '@lib/supabaseClient';
import { toLocalDateString } from '@lib/dates';

export interface ShiftAssignmentWithCarer {
  id: string;
  groupId: string;
  shiftDate: string;
  shiftSlot: string;
  assignedCaregiverId: string | null;
  carerName: string | null;
}

type ShiftRow = {
  id: string;
  group_id: string;
  shift_date: string;
  shift_slot: string;
  assigned_caregiver_id: string | null;
  profiles: { full_name: string } | null;
};

export async function fetchTodayShifts(groupId: string): Promise<ShiftAssignmentWithCarer[]> {
  const today = toLocalDateString();

  const { data, error } = await supabase
    .from('weekly_shift_assignments')
    .select(
      `id, group_id, shift_date, shift_slot, assigned_caregiver_id,
       profiles!weekly_shift_assignments_assigned_caregiver_id_fkey(full_name)`,
    )
    .eq('group_id', groupId)
    .eq('shift_date', today);

  if (error) throw new Error(error.message ?? 'Failed to load shift data.');

  return (data as ShiftRow[]).map((row) => ({
    id: row.id,
    groupId: row.group_id,
    shiftDate: row.shift_date,
    shiftSlot: row.shift_slot,
    assignedCaregiverId: row.assigned_caregiver_id,
    carerName: row.profiles?.full_name ?? null,
  }));
}
