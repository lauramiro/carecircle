import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const profileQueryMock = vi.hoisted(() => ({
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: supabaseMock,
}));

function createSession(
  email = 'user@example.com',
  metadata: Record<string, unknown> = {},
): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-id',
      app_metadata: {},
      user_metadata: metadata,
      aud: 'authenticated',
      created_at: '2026-04-29T00:00:00.000Z',
      email,
    },
  } as Session;
}

function Probe() {
  const { loading, session, profile, displayName, signOut } = useAuth();

  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="email">{session?.user?.email ?? 'none'}</p>
      <p data-testid="display-name">{displayName}</p>
      <p data-testid="profile-name">{profile?.fullName ?? 'none'}</p>
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
    supabaseMock.from.mockReturnValue(profileQueryMock);
    profileQueryMock.select.mockReturnValue(profileQueryMock);
    profileQueryMock.eq.mockReturnValue(profileQueryMock);
    profileQueryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
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
    expect(screen.getByTestId('display-name')).toHaveTextContent('Caregiver');
  });

  it('loads and exposes an existing session profile name', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: createSession() } });
    profileQueryMock.maybeSingle.mockResolvedValue({
      data: { full_name: 'Laura Miro' },
      error: null,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await waitFor(() => expect(screen.getByTestId('display-name')).toHaveTextContent('Laura Miro'));
    expect(screen.getByTestId('email')).toHaveTextContent('user@example.com');
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Laura Miro');
    expect(supabaseMock.auth.getSession).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).toHaveBeenCalledWith('profiles');
    expect(profileQueryMock.select).toHaveBeenCalledWith('full_name');
    expect(profileQueryMock.eq).toHaveBeenCalledWith('id', 'user-id');
  });

  it('falls back to metadata and email when there is no profile name', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: createSession('fresh.carer@example.com', { full_name: 'Fresh Carer' }) },
    });
    profileQueryMock.maybeSingle.mockResolvedValue({ data: { full_name: '   ' }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('display-name')).toHaveTextContent('Fresh Carer'));

    act(() => authStateHandler?.('SIGNED_IN', createSession('email.only@example.com')));

    await waitFor(() => expect(screen.getByTestId('display-name')).toHaveTextContent('Email Only'));
  });

  it('exposes null when there is no existing session', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('email')).toHaveTextContent('none');
    expect(screen.getByTestId('display-name')).toHaveTextContent('Caregiver');
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('keeps consumers in sync with auth state changes', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    profileQueryMock.maybeSingle.mockResolvedValue({ data: { full_name: 'Fresh Profile' }, error: null });
    act(() => authStateHandler?.('SIGNED_IN', createSession('fresh@example.com')));
    await waitFor(() => expect(screen.getByTestId('display-name')).toHaveTextContent('Fresh Profile'));

    act(() => authStateHandler?.('SIGNED_OUT', null));
    expect(screen.getByTestId('email')).toHaveTextContent('none');
    expect(screen.getByTestId('profile-name')).toHaveTextContent('none');
    expect(screen.getByTestId('display-name')).toHaveTextContent('Caregiver');
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

  it('signs out through Supabase and clears the session profile', async () => {
    const user = userEvent.setup();
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: createSession() } });
    profileQueryMock.maybeSingle.mockResolvedValue({ data: { full_name: 'Laura Miro' }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('display-name')).toHaveTextContent('Laura Miro'));
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('email')).toHaveTextContent('none');
    expect(screen.getByTestId('profile-name')).toHaveTextContent('none');
    expect(screen.getByTestId('display-name')).toHaveTextContent('Caregiver');
  });
});