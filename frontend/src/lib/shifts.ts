import {
  SHIFT_SLOT_BOUNDS,
  SHIFT_SLOT_LABELS,
  SHIFT_SLOTS,
  type ShiftSlot,
  type ShiftSlotValue,
} from '../api/shifts/shift.types';

/**
 * Shift slot convention: "HH:MM-HH:MM" in 24-hour format.
 * Standard enum slots map to fixed session windows via SHIFT_SLOT_BOUNDS.
 */

export interface ShiftSlotBounds {
  startMin: number;
  endMin: number;
}

const CUSTOM_SLOT_PATTERN = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;

export function isStandardShiftSlot(slot: ShiftSlotValue): slot is ShiftSlot {
  return (SHIFT_SLOTS as readonly string[]).includes(slot);
}

export function resolveShiftBounds(slot: ShiftSlotValue): string {
  if (isStandardShiftSlot(slot)) {
    return SHIFT_SLOT_BOUNDS[slot];
  }
  return slot;
}

export function parseShiftSlotBounds(slot: ShiftSlotValue): ShiftSlotBounds | null {
  const bounds = resolveShiftBounds(slot);
  const m = CUSTOM_SLOT_PATTERN.exec(bounds);
  if (!m) return null;
  return {
    startMin: Number(m[1]) * 60 + Number(m[2]),
    endMin: Number(m[3]) * 60 + Number(m[4]),
  };
}

export function isShiftSlotActive(slot: ShiftSlotValue, nowMin: number): boolean {
  const bounds = parseShiftSlotBounds(slot);
  if (!bounds) return false;
  const { startMin, endMin } = bounds;
  if (endMin > startMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  return nowMin >= startMin || nowMin < endMin;
}

export function shiftEndDisplay(slot: ShiftSlotValue): string | null {
  const bounds = resolveShiftBounds(slot);
  const m = CUSTOM_SLOT_PATTERN.exec(bounds);
  return m ? m[2] : null;
}

export function formatShiftSlotLabel(slot: ShiftSlotValue): string {
  if (isStandardShiftSlot(slot)) {
    return `${SHIFT_SLOT_LABELS[slot]} (${SHIFT_SLOT_BOUNDS[slot]})`;
  }
  return `Custom (${slot})`;
}

export function formatShiftSlotShort(slot: ShiftSlotValue): string {
  if (isStandardShiftSlot(slot)) {
    return SHIFT_SLOT_LABELS[slot];
  }
  return `Custom ${slot}`;
}

export function compareShiftSlots(a: ShiftSlotValue, b: ShiftSlotValue): number {
  const indexFor = (slot: ShiftSlotValue): number => {
    if (isStandardShiftSlot(slot)) return SHIFT_SLOTS.indexOf(slot);
    const bounds = parseShiftSlotBounds(slot);
    return bounds?.startMin ?? Number.MAX_SAFE_INTEGER;
  };
  return indexFor(a) - indexFor(b);
}

export function formatCustomShiftSlot(startTime: string, endTime: string): string {
  return `${startTime}-${endTime}`;
}

export function currentDayMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export interface AdjacentSlotRef {
  shiftDate: string;
  slot: ShiftSlotValue;
}

/** Previous session for handover (same day or overnight wraps to prior day). */
export function getPreviousSlotRef(shiftDate: string, slot: ShiftSlotValue): AdjacentSlotRef {
  if (!isStandardShiftSlot(slot)) {
    return { shiftDate, slot };
  }

  const index = SHIFT_SLOTS.indexOf(slot);
  if (index <= 0) {
    const prevDate = new Date(`${shiftDate}T12:00:00.000Z`);
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    return {
      shiftDate: prevDate.toISOString().slice(0, 10),
      slot: 'overnight',
    };
  }

  return { shiftDate, slot: SHIFT_SLOTS[index - 1] };
}

/** Next session for handover (same day or overnight wraps to next day). */
export function getNextSlotRef(shiftDate: string, slot: ShiftSlotValue): AdjacentSlotRef {
  if (!isStandardShiftSlot(slot)) {
    return { shiftDate, slot };
  }

  const index = SHIFT_SLOTS.indexOf(slot);
  if (index < 0 || index >= SHIFT_SLOTS.length - 1) {
    const nextDate = new Date(`${shiftDate}T12:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    return {
      shiftDate: nextDate.toISOString().slice(0, 10),
      slot: 'morning',
    };
  }

  return { shiftDate, slot: SHIFT_SLOTS[index + 1] };
}
