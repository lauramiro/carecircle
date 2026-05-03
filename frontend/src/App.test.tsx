import { render, screen } from '@testing-library/react';
import { Outlet } from 'react-router-dom';
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

vi.mock('./components/layout/DashboardLayout', () => ({
  default: () => <Outlet />,
}));

vi.mock('./pages/InvitePage', () => ({
  default: () => <div>Invite page</div>,
}));

vi.mock('./pages/GroupPage', () => ({
  default: ({ groupId }: { groupId: string }) => <div>Group page {groupId}</div>,
}));

vi.mock('./pages/groups/CreateGroupPage', () => ({
  default: () => <div>Create group page</div>,
}));

vi.mock('./pages/groups/GroupsListPage', () => ({
  default: () => <div>Groups list page</div>,
}));

vi.mock('./pages/groups/GroupDetailPage', () => ({
  default: () => <div>Group detail page</div>,
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
    expect(screen.queryByText('Invite page')).not.toBeInTheDocument();
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

  it('renders dashboard for authenticated users on /dashboard', () => {
    setPath('/dashboard');
    authMock.value = { loading: false, session: { user: { email: 'user@example.com' } } };

    render(<App />);

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(screen.queryByText('Signup page')).not.toBeInTheDocument();
  });

  it('redirects authenticated users from login to dashboard', () => {
    setPath('/login');
    authMock.value = { loading: false, session: { user: { email: 'user@example.com' } } };

    render(<App />);

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(screen.queryByText('Signup page')).not.toBeInTheDocument();
  });

  it('renders invite route before generic auth routing', () => {
    setPath('/invite?email=user@example.com&inviteId=invite-123');
    authMock.value = { loading: false, session: { user: { email: 'user@example.com' } } };

    render(<App />);

    expect(screen.getByText('Invite page')).toBeInTheDocument();
  });

  it('renders group route with the route group id', () => {
    setPath('/group/group-demo');

    render(<App />);

    expect(screen.getByText('Group page group-demo')).toBeInTheDocument();
  });

  it('renders create group route for authenticated users', () => {
    setPath('/groups/create');
    authMock.value = { loading: false, session: { user: { email: 'user@example.com' } } };

    render(<App />);

    expect(screen.getByText('Create group page')).toBeInTheDocument();
  });

  it('renders groups list route for authenticated users', () => {
    setPath('/groups/list');
    authMock.value = { loading: false, session: { user: { email: 'user@example.com' } } };

    render(<App />);

    expect(screen.getByText('Groups list page')).toBeInTheDocument();
  });

  it('renders group detail route for authenticated users', () => {
    setPath('/groups/group-demo');
    authMock.value = { loading: false, session: { user: { email: 'user@example.com' } } };

    render(<App />);

    expect(screen.getByText('Group detail page')).toBeInTheDocument();
  });
});
