import { describe, expect, it } from 'vitest';
import { ROLE } from '@typings/role-enum';
import { getCareRoleLabel, parseCareRole } from './careRole';

describe('parseCareRole', () => {
  it('returns canonical enum values unchanged', () => {
    expect(parseCareRole(ROLE.PRIMARY_CAREGIVER)).toBe(ROLE.PRIMARY_CAREGIVER);
    expect(parseCareRole(ROLE.SECONDARY_CAREGIVER)).toBe(ROLE.SECONDARY_CAREGIVER);
    expect(parseCareRole(ROLE.OBSERVER)).toBe(ROLE.OBSERVER);
  });

  it('defaults unknown values to secondary carer', () => {
    expect(parseCareRole('Primary Carer')).toBe(ROLE.SECONDARY_CAREGIVER);
    expect(parseCareRole('Admin')).toBe(ROLE.SECONDARY_CAREGIVER);
    expect(parseCareRole(null)).toBe(ROLE.SECONDARY_CAREGIVER);
  });
});

describe('getCareRoleLabel', () => {
  it('returns human-readable labels', () => {
    expect(getCareRoleLabel(ROLE.PRIMARY_CAREGIVER)).toBe('Primary carer');
    expect(getCareRoleLabel(ROLE.SECONDARY_CAREGIVER)).toBe('Secondary carer');
    expect(getCareRoleLabel(ROLE.OBSERVER)).toBe('Observer');
  });
});
