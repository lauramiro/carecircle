import { describe, expect, it } from 'vitest';
import { computeOverdueDuration, resolveDisplayStatus } from './checklistStatus';

describe('checklistStatus', () => {
  it('resolveDisplayStatus returns given for terminal given state', () => {
    expect(
      resolveDisplayStatus(
        { id: '1', medication_id: 'm', status: 'given', scheduled_time: '08:00', given_at: '2025-05-21T09:00:00' },
        new Date('2025-05-21T10:00:00'),
        '2025-05-21',
      ),
    ).toBe('given');
  });

  it('resolveDisplayStatus returns overdue after scheduled time', () => {
    expect(
      resolveDisplayStatus(
        { id: '1', medication_id: 'm', status: 'due', scheduled_time: '08:00' },
        new Date('2025-05-21T09:00:00'),
        '2025-05-21',
      ),
    ).toBe('overdue');
  });

  it('resolveDisplayStatus returns due before scheduled time', () => {
    expect(
      resolveDisplayStatus(
        { id: '1', medication_id: 'm', status: 'due', scheduled_time: '08:00' },
        new Date('2025-05-21T07:30:00'),
        '2025-05-21',
      ),
    ).toBe('due');
  });

  it('computeOverdueDuration calculates hours and minutes', () => {
    const result = computeOverdueDuration(
      '08:00',
      '2025-05-21',
      new Date('2025-05-21T09:30:00'),
    );
    expect(result).toEqual({ hours: 1, minutes: 30 });
  });
});
