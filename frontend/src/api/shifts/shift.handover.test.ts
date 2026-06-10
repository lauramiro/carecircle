import { describe, expect, it } from 'vitest';
import { enrichWithHandover } from './shift.handover';
import type { WeeklyShiftAssignment } from './shift.types';

describe('shift handover helpers', () => {
  it('derives handover names from adjacent assignments', () => {
    const assignments: WeeklyShiftAssignment[] = [
      {
        id: '1',
        groupId: 'group-1',
        shiftDate: '2026-05-20',
        slot: 'morning',
        assignedCaregiverId: 'a',
        assigneeName: 'Alice',
        updatedAt: null,
      },
      {
        id: '2',
        groupId: 'group-1',
        shiftDate: '2026-05-20',
        slot: 'afternoon',
        assignedCaregiverId: 'b',
        assigneeName: 'Bob',
        updatedAt: null,
      },
      {
        id: '3',
        groupId: 'group-1',
        shiftDate: '2026-05-20',
        slot: 'evening',
        assignedCaregiverId: 'c',
        assigneeName: 'Carol',
        updatedAt: null,
      },
    ];

    const enriched = enrichWithHandover(assignments[1], assignments);
    expect(enriched.handoverFromName).toBe('Alice');
    expect(enriched.handoverToName).toBe('Carol');
  });
});
