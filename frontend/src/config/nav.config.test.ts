import { describe, expect, it } from 'vitest';
import {
  buildGroupNavPath,
  getActiveGroupId,
  isGroupContextNavActive,
} from './nav.config';

describe('nav.config', () => {
  it('extracts active group ids from nested group routes', () => {
    expect(getActiveGroupId('/groups/list')).toBeNull();
    expect(getActiveGroupId('/groups/create')).toBeNull();
    expect(getActiveGroupId('/groups/group-care-001')).toBe('group-care-001');
    expect(getActiveGroupId('/groups/group-care-001/checklist')).toBe('group-care-001');
  });

  it('builds group navigation paths', () => {
    expect(buildGroupNavPath('group-care-001', '')).toBe('/groups/group-care-001');
    expect(buildGroupNavPath('group-care-001', 'journal')).toBe('/groups/group-care-001/journal');
  });

  it('matches group context nav active states', () => {
    const groupId = 'group-care-001';

    expect(
      isGroupContextNavActive(`/groups/${groupId}`, groupId, {
        label: 'Overview',
        segment: '',
        icon: () => null,
        exact: true,
      }),
    ).toBe(true);

    expect(
      isGroupContextNavActive(`/groups/${groupId}/checklist`, groupId, {
        label: 'Overview',
        segment: '',
        icon: () => null,
        exact: true,
      }),
    ).toBe(false);

    expect(
      isGroupContextNavActive(`/groups/${groupId}/medications/add`, groupId, {
        label: 'Schedule',
        segment: 'medications',
        icon: () => null,
      }),
    ).toBe(true);
  });
});
