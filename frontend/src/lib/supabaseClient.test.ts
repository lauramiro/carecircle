import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://carecircle.test');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  it('creates the Supabase client with Vite environment values', async () => {
    await import('./supabaseClient');

    expect(createClient).toHaveBeenCalledWith('https://carecircle.test', 'anon-key');
  });
});
