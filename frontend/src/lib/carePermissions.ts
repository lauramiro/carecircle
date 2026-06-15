import { ROLE } from '@typings/role-enum';
import type { GroupMember } from '../api/groups/groups.types';

export interface RoleChangeValidation {
  allowed: boolean;
  reason?: string;
}

export function canAssignShifts(role: ROLE): boolean {
  return role === ROLE.PRIMARY_CAREGIVER;
}

export function canManageMembers(role: ROLE): boolean {
  return role === ROLE.PRIMARY_CAREGIVER;
}

export function canManageGPContacts(role: ROLE): boolean {
  return role === ROLE.PRIMARY_CAREGIVER;
}

export function canManageEmergencyContacts(role: ROLE): boolean {
  return role === ROLE.PRIMARY_CAREGIVER || role === ROLE.SECONDARY_CAREGIVER;
}

export function canEditMedicationSchedule(role: ROLE): boolean {
  return role === ROLE.PRIMARY_CAREGIVER;
}

export function canEditAppointments(_role: ROLE, canSchedule: boolean): boolean {
  return canSchedule;
}

export function isChecklistReadOnly(role: ROLE): boolean {
  return role === ROLE.OBSERVER;
}

export function isJournalReadOnly(role: ROLE): boolean {
  return role === ROLE.OBSERVER;
}

export function countActivePrimaryCarers(
  members: GroupMember[],
  excludeMemberId?: string,
): number {
  return members.filter(
    (member) =>
      member.role === ROLE.PRIMARY_CAREGIVER
      && member.status === 'Active'
      && member.id !== excludeMemberId,
  ).length;
}

export function validateMemberRoleChange(
  actorRole: ROLE,
  actorId: string,
  targetMember: GroupMember,
  newRole: ROLE,
  members: GroupMember[],
): RoleChangeValidation {
  if (!canManageMembers(actorRole)) {
    return { allowed: false, reason: 'Only primary carers can change member roles.' };
  }

  if (targetMember.role === newRole) {
    return { allowed: false, reason: 'This member already has that role.' };
  }

  const demotingPrimary =
    targetMember.role === ROLE.PRIMARY_CAREGIVER && newRole !== ROLE.PRIMARY_CAREGIVER;

  if (demotingPrimary && countActivePrimaryCarers(members, targetMember.id) === 0) {
    if (targetMember.id === actorId) {
      return {
        allowed: false,
        reason: 'You need at least one other primary carer before changing your role.',
      };
    }

    return {
      allowed: false,
      reason: 'Assign another primary carer before demoting the only primary carer in this group.',
    };
  }

  return { allowed: true };
}

export function getAssignableRolesForMember(
  member: GroupMember,
  actorId: string | undefined,
  members: GroupMember[],
): ROLE[] {
  const allRoles = [ROLE.PRIMARY_CAREGIVER, ROLE.SECONDARY_CAREGIVER, ROLE.OBSERVER];

  if (!actorId || member.id !== actorId || member.role !== ROLE.PRIMARY_CAREGIVER) {
    return allRoles;
  }

  if (countActivePrimaryCarers(members, actorId) === 0) {
    return [ROLE.PRIMARY_CAREGIVER];
  }

  return allRoles;
}

/** Primary carers cannot remove or suspend themselves from the group. */
export function canRemoveOrSuspendMember(
  actorId: string | undefined,
  targetMember: GroupMember,
): boolean {
  if (!actorId || targetMember.id !== actorId) {
    return true;
  }

  return targetMember.role !== ROLE.PRIMARY_CAREGIVER;
}
