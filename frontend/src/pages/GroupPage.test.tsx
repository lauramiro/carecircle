import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupPage from './GroupPage';

const authMock = vi.hoisted(() => ({
  value: {
    session: null as { user: { email?: string } } | null,
  },
}));

const inviteServiceMock = vi.hoisted(() => ({
  isUserInGroup: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

vi.mock('../services/inviteService', () => inviteServiceMock);

describe('GroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.value = { session: null };
    inviteServiceMock.isUserInGroup.mockResolvedValue(false);
  });

  it('asks signed-out users to sign in', async () => {
    render(<GroupPage groupId="group-demo" />);

    expect(await screen.findByText('Sign in required')).toBeInTheDocument();
    expect(screen.getByText(/please sign in with the invited account/i)).toBeInTheDocument();
  });

  it('blocks signed-in users who are not group members', async () => {
    authMock.value = { session: { user: { email: 'user@example.com' } } };

    render(<GroupPage groupId="group-demo" />);

    expect(await screen.findByText('Group access unavailable')).toBeInTheDocument();
    expect(inviteServiceMock.isUserInGroup).toHaveBeenCalledWith('group-demo', 'user@example.com');
  });

  it('renders the group dashboard for members', async () => {
    authMock.value = { session: { user: { email: 'user@example.com' } } };
    inviteServiceMock.isUserInGroup.mockResolvedValue(true);

    render(<GroupPage groupId="group-demo" />);

    expect(await screen.findByText('Group dashboard')).toBeInTheDocument();
    expect(screen.getByText(/group-demo/)).toBeInTheDocument();
    expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
  });
});
