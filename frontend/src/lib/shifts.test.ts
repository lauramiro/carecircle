import { describe, expect, it } from 'vitest';
import {
  compareShiftSlots,
  formatShiftSlotLabel,
  formatShiftSlotShort,
  getNextSlotRef,
  getPreviousSlotRef,
  isShiftSlotActive,
  parseShiftSlotBounds,
  resolveShiftBounds,
} from './shifts';

describe('shifts utilities', () => {
  it('maps standard slots to session time bounds', () => {
    expect(resolveShiftBounds('morning')).toBe('08:00-12:00');
    expect(resolveShiftBounds('evening')).toBe('16:00-20:00');
    expect(formatShiftSlotLabel('morning')).toContain('Morning');
  });

  it('parses custom shift bounds', () => {
    const bounds = parseShiftSlotBounds('10:00-14:00');
    expect(bounds).toEqual({ startMin: 600, endMin: 840 });
  });

  it('detects active standard sessions', () => {
    expect(isShiftSlotActive('morning', 9 * 60)).toBe(true);
    expect(isShiftSlotActive('morning', 13 * 60)).toBe(false);
    expect(isShiftSlotActive('overnight', 22 * 60)).toBe(true);
    expect(isShiftSlotActive('overnight', 6 * 60)).toBe(true);
  });

  it('returns adjacent slot refs for handover', () => {
    expect(getPreviousSlotRef('2026-05-20', 'afternoon')).toEqual({
      shiftDate: '2026-05-20',
      slot: 'morning',
    });
    expect(getNextSlotRef('2026-05-20', 'overnight')).toEqual({
      shiftDate: '2026-05-21',
      slot: 'morning',
    });
  });

  it('sorts shift slots in session order', () => {
    expect(compareShiftSlots('evening', 'morning')).toBeGreaterThan(0);
    expect(compareShiftSlots('morning', 'afternoon')).toBeLessThan(0);
    expect(formatShiftSlotShort('morning')).toBe('Morning');
  });
});
