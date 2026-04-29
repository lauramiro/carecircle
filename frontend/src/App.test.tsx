import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const authMock = vi.hoisted(() => ({
  value: {
    loading: false,
    session: null as { user: { email: string } } | null,
  },
}));

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

vi.mock('./pages/SignupPage', () => ({
  default: () => <div>Signup page</div>,
}));

vi.mock('./pages/LoginPage', () => ({
  default: () => <div>Login page</div>,
}));

vi.mock('./pages/DashboardPage', () => ({
  default: () => <div>Dashboard page</div>,
}));

function setPath(path: string) {
  window.history.pushState({}, '', path);
}

describe('App', () => {
  beforeEach(() => {
    authMock.value = { loading: false, session: null };
    setPath('/');
  });

  it('shows a loading state while auth is resolving', () => {
    authMock.value = { loading: true, session: null };

    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Signup page')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('renders signup by default when unauthenticated', () => {
    render(<App />);

    expect(screen.getByText('Signup page')).toBeInTheDocument();
  });

  it('renders login for unauthenticated users on /login', () => {
    setPath('/login');

    render(<App />);

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('falls back to signup for unknown unauthenticated paths', () => {
    setPath('/unknown');

    render(<App />);

    expect(screen.getByText('Signup page')).toBeInTheDocument();
  });

  it('renders dashboard for authenticated users regardless of path', () => {
    setPath('/login');
    authMock.value = { loading: false, session: { user: { email: 'user@example.com' } } };

    render(<App />);

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(screen.queryByText('Signup page')).not.toBeInTheDocument();
  });
});
