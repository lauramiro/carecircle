import { describe, expect, it, vi, beforeEach } from 'vitest';
import { authenticatedFetch, getAccessToken } from './authenticatedFetch';

vi.mock('@lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@lib/apiBaseUrl', () => ({
  apiUrl: (path: string) => `http://localhost:3000${path}`,
}));

import { supabase } from '@lib/supabaseClient';

describe('authenticatedFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
  });

  it('adds Authorization header when session token exists', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'test-jwt' } as never },
      error: null,
    });

    await authenticatedFetch('/api/ai/qa', { method: 'POST', body: '{}' });

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/ai/qa',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt',
        }),
      }),
    );
  });

  it('omits Authorization header when logged out', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await authenticatedFetch('/api/ai/qa');

    const call = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(call.headers).not.toHaveProperty('Authorization');
  });

  it('getAccessToken returns session access token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'abc' } as never },
      error: null,
    });

    await expect(getAccessToken()).resolves.toBe('abc');
  });
});
