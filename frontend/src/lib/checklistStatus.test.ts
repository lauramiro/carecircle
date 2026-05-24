import { describe, expect, it } from 'vitest';
import { overdueDurationSince } from './checklistStatus';

describe('checklistStatus', () => {
  it('overdueDurationSince returns zero when overdue_at is missing', () => {
    expect(overdueDurationSince(null)).toEqual({ hours: 0, minutes: 0 });
  });

  it('overdueDurationSince counts elapsed time from backend overdue_at', () => {
    const result = overdueDurationSince('2025-05-21T08:30:00.000Z', new Date('2025-05-21T09:30:00.000Z'));
    expect(result).toEqual({ hours: 1, minutes: 0 });
  });

  it('overdueDurationSince caps hours at 48', () => {
    const result = overdueDurationSince('2025-05-01T00:00:00.000Z', new Date('2025-05-10T00:30:00.000Z'));
    expect(result.hours).toBe(48);
  });
});
