import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: supabaseMock,
}));

function createSession(email = 'user@example.com'): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-id',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2026-04-29T00:00:00.000Z',
      email,
    },
  } as Session;
}

function Probe() {
  const { loading, session, signOut } = useAuth();

  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="email">{session?.user?.email ?? 'none'}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

describe('AuthContext', () => {
  let authStateHandler: ((event: string, session: Session | null) => void) | undefined;
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    authStateHandler = undefined;
    unsubscribe = vi.fn();
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
    supabaseMock.auth.onAuthStateChange.mockImplementation(
      (callback: (event: string, session: Session | null) => void) => {
        authStateHandler = callback;
        return { data: { subscription: { unsubscribe } } };
      },
    );
  });

  it('exposes loading while the initial session is being read', () => {
    supabaseMock.auth.getSession.mockReturnValue(new Promise(() => {}));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });

  it('loads and exposes an existing session', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: createSession() } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('email')).toHaveTextContent('user@example.com');
    expect(supabaseMock.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it('exposes null when there is no existing session', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });

  it('keeps consumers in sync with auth state changes', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    act(() => authStateHandler?.('SIGNED_IN', createSession('fresh@example.com')));
    expect(screen.getByTestId('email')).toHaveTextContent('fresh@example.com');

    act(() => authStateHandler?.('SIGNED_OUT', null));
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });

  it('unsubscribes from auth state changes on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('signs out through Supabase and clears the session', async () => {
    const user = userEvent.setup();
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: createSession() } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('user@example.com'));
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('email')).toHaveTextContent('none');
  });
});
