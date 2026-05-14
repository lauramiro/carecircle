import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignupPage from './SignupPage';

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
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

async function fillSignupForm(email: string, password: string, confirmPassword?: string) {
  const user = userEvent.setup();

  render(<SignupPage />);

  await user.type(screen.getByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.type(screen.getByLabelText(/confirm password/i), confirmPassword ?? password);

  return user;
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.signUp.mockResolvedValue({ error: null });
  });

  it('renders the signup form and navigation options', () => {
    render(<SignupPage />);

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /magic link/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('validates required email and password fields before signup', async () => {
    const user = userEvent.setup();

    render(<SignupPage />);

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('validates invalid email format before signup', async () => {
    const user = await fillSignupForm('not-an-email', 'password1!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('validates short passwords before signup', async () => {
    const user = await fillSignupForm('user@example.com', 'short1');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('validates passwords that do not include a number before signup', async () => {
    const user = await fillSignupForm('user@example.com', 'password');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Password must include at least one number.')).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('validates passwords that do not include a special character before signup', async () => {
    const user = await fillSignupForm('user@example.com', 'password1');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/must include at least one special character/i)).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('validates that confirm password matches password', async () => {
    const user = await fillSignupForm('user@example.com', 'password1!', 'different1!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('clears field and form errors as the user edits inputs', async () => {
    const user = userEvent.setup();

    render(<SignupPage />);

    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password1');

    expect(screen.queryByText('Email is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Password is required.')).not.toBeInTheDocument();
  });

  it('submits valid signup details and shows confirmation', async () => {
    const user = await fillSignupForm('user@example.com', 'password1!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password1!',
      options: { emailRedirectTo: undefined },
    });
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('disables the submit button while signup is pending', async () => {
    const pendingSignup = deferred<{ error: null }>();
    supabaseMock.auth.signUp.mockReturnValue(pendingSignup.promise);
    const user = await fillSignupForm('user@example.com', 'password1!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
    pendingSignup.resolve({ error: null });
    expect(await screen.findByText('Check your email')).toBeInTheDocument();
  });

  it('shows a duplicate account error returned by Supabase', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      error: new Error('User already registered'),
    });
    const user = await fillSignupForm('user@example.com', 'password1!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  it('shows a generic signup error for unexpected Supabase failures', async () => {
    supabaseMock.auth.signUp.mockRejectedValue(new Error('network down'));
    const user = await fillSignupForm('user@example.com', 'password1!');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText('Something went wrong. Please check your connection and try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  it('toggles password visibility when the eye button is clicked', async () => {
    const user = userEvent.setup();

    render(<SignupPage />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getAllByRole('button', { name: /show password/i })[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getAllByRole('button', { name: /hide password/i })[0]);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
