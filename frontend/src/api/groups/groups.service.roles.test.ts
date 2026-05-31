import { describe, expect, it } from 'vitest';
import { canAssignGroupShifts, mapRole } from './groups.service';
import { ROLE } from '@typings/role-enum';

describe('canAssignGroupShifts', () => {
  it('allows shift assignment only for primary carers', () => {
    expect(canAssignGroupShifts(mapRole(ROLE.PRIMARY_CAREGIVER))).toBe(true);
    expect(canAssignGroupShifts(mapRole(ROLE.SECONDARY_CAREGIVER))).toBe(false);
    expect(canAssignGroupShifts(mapRole(ROLE.OBSERVER))).toBe(false);
  });
});
