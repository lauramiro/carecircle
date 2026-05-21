import { describe, expect, it } from 'vitest';
import { parseLocalDateString, toLocalDateString } from './dates';

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
});
