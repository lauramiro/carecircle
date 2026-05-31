import { describe, expect, it } from 'vitest';
import { ROLE } from '@typings/role-enum';
import {
  canAssignShifts,
  canEditAppointments,
  canManageMembers,
  isChecklistReadOnly,
  validateMemberRoleChange,
} from './carePermissions';
import type { GroupMember } from '../api/groups/groups.types';

describe('carePermissions', () => {
  it('grants primary-carer-only actions to primary carers', () => {
    expect(canAssignShifts(ROLE.PRIMARY_CAREGIVER)).toBe(true);
    expect(canManageMembers(ROLE.PRIMARY_CAREGIVER)).toBe(true);
  });

  it('denies primary-carer-only actions to secondary carers and observers', () => {
    expect(canAssignShifts(ROLE.SECONDARY_CAREGIVER)).toBe(false);
    expect(canAssignShifts(ROLE.OBSERVER)).toBe(false);
    expect(canManageMembers(ROLE.SECONDARY_CAREGIVER)).toBe(false);
    expect(canManageMembers(ROLE.OBSERVER)).toBe(false);
  });

  it('gates appointments on canSchedule, not role alone', () => {
    expect(canEditAppointments(ROLE.PRIMARY_CAREGIVER, true)).toBe(true);
    expect(canEditAppointments(ROLE.PRIMARY_CAREGIVER, false)).toBe(false);
    expect(canEditAppointments(ROLE.SECONDARY_CAREGIVER, true)).toBe(true);
  });

  it('treats observers as checklist read-only', () => {
    expect(isChecklistReadOnly(ROLE.OBSERVER)).toBe(true);
    expect(isChecklistReadOnly(ROLE.PRIMARY_CAREGIVER)).toBe(false);
    expect(isChecklistReadOnly(ROLE.SECONDARY_CAREGIVER)).toBe(false);
  });
});

describe('validateMemberRoleChange', () => {
  const members: GroupMember[] = [
    {
      id: 'primary-1',
      name: 'Sarah',
      email: 'sarah@example.com',
      role: ROLE.PRIMARY_CAREGIVER,
      joinedAt: '2025-05-12T09:00:00.000Z',
      status: 'Active',
    },
    {
      id: 'secondary-1',
      name: 'John',
      email: 'john@example.com',
      role: ROLE.SECONDARY_CAREGIVER,
      joinedAt: '2025-05-13T10:20:00.000Z',
      status: 'Active',
    },
  ];

  it('blocks non-primary carers from changing roles', () => {
    expect(
      validateMemberRoleChange(
        ROLE.SECONDARY_CAREGIVER,
        'secondary-1',
        members[1]!,
        ROLE.OBSERVER,
        members,
      ).allowed,
    ).toBe(false);
  });

  it('blocks the only primary carer from demoting themselves', () => {
    const soloPrimary = [members[0]!];

    expect(
      validateMemberRoleChange(
        ROLE.PRIMARY_CAREGIVER,
        'primary-1',
        soloPrimary[0]!,
        ROLE.SECONDARY_CAREGIVER,
        soloPrimary,
      ),
    ).toMatchObject({
      allowed: false,
      reason: expect.stringContaining('other primary carer'),
    });
  });

  it('allows a primary carer to demote themselves when another primary exists', () => {
    const groupMembers: GroupMember[] = [
      members[0]!,
      {
        ...members[1]!,
        id: 'primary-2',
        role: ROLE.PRIMARY_CAREGIVER,
      },
    ];

    expect(
      validateMemberRoleChange(
        ROLE.PRIMARY_CAREGIVER,
        'primary-1',
        groupMembers[0]!,
        ROLE.SECONDARY_CAREGIVER,
        groupMembers,
      ).allowed,
    ).toBe(true);
  });
});
