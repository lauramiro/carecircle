export const SHIFT_SLOTS = ['morning', 'afternoon', 'evening', 'overnight'] as const;

export type ShiftSlot = (typeof SHIFT_SLOTS)[number];

export const SHIFT_SLOT_LABELS: Record<ShiftSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  overnight: 'Overnight',
};

export interface WeeklyShiftAssignment {
  id: string | null;
  groupId: string;
  shiftDate: string;
  slot: ShiftSlot;
  assignedCaregiverId: string | null;
  assigneeName: string | null;
  updatedAt: string | null;
}

export interface SaveWeeklyShiftAssignmentPayload {
  groupId: string;
  shiftDate: string;
  slot: ShiftSlot;
  assignedCaregiverId: string | null;
}

export interface ShiftWarningSummary {
  groupId: string;
  groupName: string;
  unassignedCount: number;
  weekStart: string;
  weekEnd: string;
}