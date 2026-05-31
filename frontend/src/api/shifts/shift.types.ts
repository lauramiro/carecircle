export const SHIFT_SLOTS = ['morning', 'afternoon', 'evening', 'overnight'] as const;

export type ShiftSlot = (typeof SHIFT_SLOTS)[number];

/** Standard session enum or custom HH:MM-HH:MM range */
export type ShiftSlotValue = ShiftSlot | string;

export const SHIFT_SLOT_LABELS: Record<ShiftSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  overnight: 'Overnight',
};

export const SHIFT_SLOT_BOUNDS: Record<ShiftSlot, string> = {
  morning: '08:00-12:00',
  afternoon: '12:00-16:00',
  evening: '16:00-20:00',
  overnight: '20:00-08:00',
};

export interface WeeklyShiftAssignment {
  id: string | null;
  groupId: string;
  shiftDate: string;
  slot: ShiftSlotValue;
  assignedCaregiverId: string | null;
  assigneeName: string | null;
  updatedAt: string | null;
}

export interface SaveWeeklyShiftAssignmentPayload {
  groupId: string;
  shiftDate: string;
  slot: ShiftSlotValue;
  assignedCaregiverId: string | null;
}

export interface ShiftWarningSummary {
  groupId: string;
  groupName: string;
  unassignedCount: number;
  weekStart: string;
  weekEnd: string;
}

export interface ShiftWithHandover extends WeeklyShiftAssignment {
  handoverFromName: string | null;
  handoverToName: string | null;
}

export interface GroupScheduleCell {
  shiftDate: string;
  slot: ShiftSlotValue;
  assigneeName: string | null;
  assignedCaregiverId: string | null;
}

export interface GroupMemberScheduleRow {
  memberId: string;
  memberName: string;
  cells: GroupScheduleCell[];
}
