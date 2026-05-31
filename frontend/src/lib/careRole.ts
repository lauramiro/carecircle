import { ROLE } from '@typings/role-enum';

const CARE_ROLE_VALUES = new Set<string>(Object.values(ROLE));

export const ALL_CARE_ROLES: readonly ROLE[] = [
  ROLE.PRIMARY_CAREGIVER,
  ROLE.SECONDARY_CAREGIVER,
  ROLE.OBSERVER,
];

export function isCareRole(value: string): value is ROLE {
  return CARE_ROLE_VALUES.has(value);
}

/** Parse a DB `role_in_care` value into the canonical ROLE enum. */
export function parseCareRole(raw: string | null | undefined): ROLE {
  if (raw && isCareRole(raw)) {
    return raw;
  }
  return ROLE.SECONDARY_CAREGIVER;
}

export function getCareRoleLabel(role: ROLE): string {
  switch (role) {
    case ROLE.PRIMARY_CAREGIVER:
      return 'Primary carer';
    case ROLE.SECONDARY_CAREGIVER:
      return 'Secondary carer';
    case ROLE.OBSERVER:
      return 'Observer';
  }
}
