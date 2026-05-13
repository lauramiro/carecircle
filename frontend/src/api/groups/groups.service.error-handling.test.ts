import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();

const queryBuilder = {
  select: selectMock,
  eq: eqMock,
  single: singleMock,
};

selectMock.mockReturnValue(queryBuilder);
eqMock.mockReturnValue(queryBuilder);

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  },
}));

import { getUserGroupDetails } from './groups.service';

describe('getUserGroupDetails error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReturnValue(queryBuilder);
    selectMock.mockReturnValue(queryBuilder);
    eqMock.mockReturnValue(queryBuilder);
    getUserMock.mockResolvedValue({ data: { user: { id: 'mock-user-123' } } });
  });

  it('returns null when the group lookup finds no matching row', async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
    });

    await expect(getUserGroupDetails('missing-group')).resolves.toBeNull();
  });

  it('throws when the group lookup fails unexpectedly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    singleMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });

    await expect(getUserGroupDetails('group-care-001')).rejects.toThrow(
      'Failed to load group details',
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching group data:', {
      code: '42501',
      message: 'permission denied',
    });

    consoleErrorSpy.mockRestore();
  });
});