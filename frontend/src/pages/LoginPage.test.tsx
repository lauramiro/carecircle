import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
  },
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: supabaseMock,
}));

function deferred<T>() {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => resolvePromise?.(value),
  };
}

async function fillPasswordLogin(email: string, password: string) {
  const user = userEvent.setup();

  render(<LoginPage />);

  await user.type(screen.getByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/^password$/i), password);

  return user;
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/login');
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabaseMock.auth.signInWithOtp.mockResolvedValue({ error: null });
  });

  it('renders the password login form and navigation options', () => {
    render(<LoginPage />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send me a magic link instead/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/signup');
  });

  it('requires an email before password login', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('requires a password before password login', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('clears validation errors when inputs change', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByText('Email is required.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');

    expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
  });

  it('submits valid password credentials', async () => {
    const pendingLogin = deferred<{ error: null }>();
    supabaseMock.auth.signInWithPassword.mockReturnValue(pendingLogin.promise);
    const user = await fillPasswordLogin('user@example.com', 'password1');

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password1',
    });
  });

  it('disables the submit button while password login is pending', async () => {
    const pendingLogin = deferred<{ error: null }>();
    supabaseMock.auth.signInWithPassword.mockReturnValue(pendingLogin.promise);
    const user = await fillPasswordLogin('user@example.com', 'password1');

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('maps invalid credentials to the friendly login error', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      error: new Error('Invalid login credentials'),
    });
    const user = await fillPasswordLogin('user@example.com', 'wrongpass1');

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(
      await screen.findByText("That email and password don't match. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeEnabled();
  });

  it('maps unexpected login failures to a generic error', async () => {
    supabaseMock.auth.signInWithPassword.mockRejectedValue({});
    const user = await fillPasswordLogin('user@example.com', 'password1');

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument();
  });

  it('switches to magic-link mode and hides the password field', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /send me a magic link instead/i }));

    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^send magic link$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with password instead/i })).toBeInTheDocument();
  });

  it('requires an email before magic-link login', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /send me a magic link instead/i }));
    await user.click(screen.getByRole('button', { name: /^send magic link$/i }));

    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(supabaseMock.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends a login magic link and shows confirmation', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'magic@example.com');
    await user.click(screen.getByRole('button', { name: /send me a magic link instead/i }));
    await user.click(screen.getByRole('button', { name: /^send magic link$/i }));

    expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'magic@example.com',
      options: { emailRedirectTo: window.location.origin },
    });
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText('magic@example.com')).toBeInTheDocument();
  });

  it('shows a generic error when magic-link login fails', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue({ error: new Error('otp failed') });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'magic@example.com');
    await user.click(screen.getByRole('button', { name: /send me a magic link instead/i }));
    await user.click(screen.getByRole('button', { name: /^send magic link$/i }));

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument();
  });

  it('sends pending invite magic links back to invite confirmation', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'carecircle:pendingInvite',
      JSON.stringify({
        email: 'magic@example.com',
        inviteId: '550e8400-e29b-41d4-a716-446655440000',
        savedAt: Date.now(),
      }),
    );

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'magic@example.com');
    await user.click(screen.getByRole('button', { name: /send me a magic link instead/i }));
    await user.click(screen.getByRole('button', { name: /^send magic link$/i }));

    expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'magic@example.com',
      options: {
        emailRedirectTo:
          'http://localhost:3000/group-invite?inviteId=550e8400-e29b-41d4-a716-446655440000&email=magic%40example.com&confirmation=true',
      },
    });
  });

  it('returns from magic-link confirmation to password login', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email address/i), 'magic@example.com');
    await user.click(screen.getByRole('button', { name: /send me a magic link instead/i }));
    await user.click(screen.getByRole('button', { name: /^send magic link$/i }));
    await screen.findByText('Check your email');
    await user.click(screen.getByRole('button', { name: /back to sign in/i }));

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });
});
