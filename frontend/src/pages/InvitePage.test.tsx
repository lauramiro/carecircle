import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitePage from './InvitePage';

const authMock = vi.hoisted(() => ({
  value: {
    session: null as { user: { email?: string } } | null,
  },
}));

const inviteServiceMock = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  fetchInviteGroupDetails: vi.fn(),
  isEmailRegistered: vi.fn(),
  isUserInInviteGroup: vi.fn(),
  rejectInvitation: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

vi.mock('../services/inviteService', () => inviteServiceMock);

function setInvitePath(search: string) {
  window.history.pushState({}, '', `/invite${search}`);
}

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.value = { session: null };
    inviteServiceMock.fetchInviteGroupDetails.mockResolvedValue({
      groupId: 'group-demo',
      groupName: 'CareCircle Family Group',
      description: 'A shared care group.',
    });
    inviteServiceMock.isUserInInviteGroup.mockResolvedValue(false);
    inviteServiceMock.isEmailRegistered.mockResolvedValue(false);
    inviteServiceMock.acceptInvitation.mockResolvedValue({ groupId: 'group-demo' });
    inviteServiceMock.rejectInvitation.mockResolvedValue(undefined);
  });

  it('shows an error for an invalid invite link', async () => {
    setInvitePath('?email=invalid&inviteId=');

    render(<InvitePage />);

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(screen.getByText(/invalid or incomplete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('persists a valid invite before redirecting unauthenticated users', async () => {
    setInvitePath('?email=new@example.com&inviteId=invite-123&confirmation=false');

    render(<InvitePage />);

    await waitFor(() => expect(inviteServiceMock.isEmailRegistered).toHaveBeenCalledWith('new@example.com'));
    expect(localStorage.getItem('carecircle:pendingInvite')).toBe(
      JSON.stringify({ email: 'new@example.com', inviteId: 'invite-123' }),
    );
  });

  it('redirects authenticated matching users to confirmation mode', async () => {
    authMock.value = { session: { user: { email: 'new@example.com' } } };
    setInvitePath('?email=new@example.com&inviteId=invite-123&confirmation=false');

    render(<InvitePage />);

    await waitFor(() => {
      expect(localStorage.getItem('carecircle:pendingInvite')).toBe(
        JSON.stringify({ email: 'new@example.com', inviteId: 'invite-123' }),
      );
    });
  });

  it('shows an account mismatch error for signed-in users with another email', async () => {
    authMock.value = { session: { user: { email: 'obinna.ezedei@gmail.com' } } };
    setInvitePath('?email=binna.ezedei@gmail.com&inviteId=invite-123&confirmation=false');

    render(<InvitePage />);

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(screen.getByText(/ob\*{6}ei@gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText(/bi\*{6}ei@gmail\.com/)).toBeInTheDocument();
    expect(screen.queryByText(/obinna\.ezedei@gmail\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/binna\.ezedei@gmail\.com/)).not.toBeInTheDocument();
    expect(screen.getByText(/please log out first/i)).toBeInTheDocument();
  });

  it('blocks confirmation when the active session does not match the invited email', async () => {
    authMock.value = { session: { user: { email: 'other@example.com' } } };
    setInvitePath('?email=new@example.com&inviteId=invite-123&confirmation=true');

    render(<InvitePage />);

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(screen.getByText(/active session is signed in as ot\*{6}er@example.com/i)).toBeInTheDocument();
    expect(inviteServiceMock.fetchInviteGroupDetails).not.toHaveBeenCalled();
  });

  it('loads the confirmation screen with group details', async () => {
    setInvitePath('?email=new@example.com&inviteId=invite-123&confirmation=true');

    render(<InvitePage />);

    expect(await screen.findByText('Join CareCircle Family Group')).toBeInTheDocument();
    expect(screen.getByText('A shared care group.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject invitation/i })).toBeInTheDocument();
  });

  it('shows the already-member state when the invited email is already in the group', async () => {
    inviteServiceMock.isUserInInviteGroup.mockResolvedValue(true);
    localStorage.setItem('carecircle:pendingInvite', JSON.stringify({ email: 'member@example.com', inviteId: 'invite-123' }));
    setInvitePath('?email=member@example.com&inviteId=invite-123&confirmation=true');

    render(<InvitePage />);

    expect(await screen.findByText('You are already a member')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to group/i })).toBeInTheDocument();
    expect(localStorage.getItem('carecircle:pendingInvite')).toBeNull();
  });

  it('accepts an invitation and clears the pending invite', async () => {
    const user = userEvent.setup();
    authMock.value = { session: { user: { email: 'new@example.com' } } };
    localStorage.setItem('carecircle:pendingInvite', JSON.stringify({ email: 'new@example.com', inviteId: 'invite-123' }));
    setInvitePath('?email=new@example.com&inviteId=invite-123&confirmation=true');

    render(<InvitePage />);

    await user.click(await screen.findByRole('button', { name: /accept invitation/i }));

    expect(inviteServiceMock.acceptInvitation).toHaveBeenCalledWith('invite-123', 'new@example.com');
    expect(localStorage.getItem('carecircle:pendingInvite')).toBeNull();
  });

  it('rejects an invitation and clears the pending invite', async () => {
    const user = userEvent.setup();
    localStorage.setItem('carecircle:pendingInvite', JSON.stringify({ email: 'new@example.com', inviteId: 'invite-123' }));
    setInvitePath('?email=new@example.com&inviteId=invite-123&confirmation=true');

    render(<InvitePage />);

    await user.click(await screen.findByRole('button', { name: /reject invitation/i }));

    expect(inviteServiceMock.rejectInvitation).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('carecircle:pendingInvite')).toBeNull();
  });
});
