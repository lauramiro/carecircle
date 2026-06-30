import { describe, expect, it } from 'vitest';
import { isBeforeLocalDate, parseLocalDateString, toLocalDateString } from './dates';

describe('dates', () => {
  it('toLocalDateString uses local calendar components', () => {
    const date = new Date(2025, 4, 21, 23, 30, 0);
    expect(toLocalDateString(date)).toBe('2025-05-21');
  });

  it('parseLocalDateString avoids UTC day shift', () => {
    const parsed = parseLocalDateString('2025-05-21');
    expect(parsed.getFullYear()).toBe(2025);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(21);
  });

  it('isBeforeLocalDate compares local calendar days rather than exact times', () => {
    const todayAfternoon = new Date(2026, 5, 30, 15, 0, 0);

    expect(isBeforeLocalDate(new Date(2026, 5, 29, 23, 59, 0), todayAfternoon)).toBe(true);
    expect(isBeforeLocalDate(new Date(2026, 5, 30, 8, 0, 0), todayAfternoon)).toBe(false);
    expect(isBeforeLocalDate(new Date(2026, 6, 1, 8, 0, 0), todayAfternoon)).toBe(false);
  });
});
