/**
 * Shift slot convention: "HH:MM-HH:MM" in 24-hour format.
 * Examples: "08:00-20:00" (day shift), "20:00-08:00" (night/overnight shift).
 * The weekly_shift_assignments.shift_slot column stores values in this format.
 * When end < start the slot is treated as overnight (crosses midnight).
 */

export interface ShiftSlotBounds {
  startMin: number;
  endMin: number;
}

export function parseShiftSlotBounds(slot: string): ShiftSlotBounds | null {
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(slot);
  if (!m) return null;
  return {
    startMin: Number(m[1]) * 60 + Number(m[2]),
    endMin: Number(m[3]) * 60 + Number(m[4]),
  };
}

export function isShiftSlotActive(slot: string, nowMin: number): boolean {
  const bounds = parseShiftSlotBounds(slot);
  if (!bounds) return false;
  const { startMin, endMin } = bounds;
  if (endMin > startMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  // Overnight: e.g. 22:00 (1320) to 06:00 (360) crosses midnight.
  return nowMin >= startMin || nowMin < endMin;
}

/** Returns the end time portion of a slot string ("HH:MM"), or null if unparseable. */
export function shiftEndDisplay(slot: string): string | null {
  const m = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(slot);
  return m ? m[2] : null;
}

export function currentDayMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}
