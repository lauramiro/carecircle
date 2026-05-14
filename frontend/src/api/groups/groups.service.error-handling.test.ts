import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
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

  return { getUserMock, fromMock, selectMock, eqMock, singleMock, queryBuilder };
});

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUserMock,
    },
    from: mocks.fromMock,
  },
}));

import { getUserGroupDetails } from './groups.service';

describe('getUserGroupDetails error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fromMock.mockReturnValue(mocks.queryBuilder);
    mocks.selectMock.mockReturnValue(mocks.queryBuilder);
    mocks.eqMock.mockReturnValue(mocks.queryBuilder);
    mocks.getUserMock.mockResolvedValue({ data: { user: { id: 'mock-user-123' } } });
  });

  it('returns null when membership verification finds no matching row', async () => {
    // 1st single() call: membership check
    mocks.singleMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
    });

    await expect(getUserGroupDetails('missing-group')).resolves.toBeNull();
  });

  it('returns null and logs when the group lookup fails unexpectedly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    
    // 1st single() call: membership check succeeds
    mocks.singleMock.mockResolvedValueOnce({
      data: { role_in_care: 'Primary Carer' },
      error: null,
    });

    // 2nd single() call: group lookup fails
    mocks.singleMock.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });

    await expect(getUserGroupDetails('group-care-001')).resolves.toBeNull();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching members:', {
      code: '42501',
      message: 'permission denied',
    });

    consoleErrorSpy.mockRestore();
  });
});