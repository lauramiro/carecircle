import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitePage from './InvitePage';

const authMock = vi.hoisted(() => ({
  value: {
    session: null as { user: { email?: string; id?: string } } | null,
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

/** Valid invite id shape expected by `InvitePage` / `isValidInviteUuid`. */
const INVITE_ID = '550e8400-e29b-41d4-a716-446655440000';

vi.mock('../services/inviteService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/inviteService')>();
  return {
    ...actual,
    acceptInvitation: inviteServiceMock.acceptInvitation,
    fetchInviteGroupDetails: inviteServiceMock.fetchInviteGroupDetails,
    isEmailRegistered: inviteServiceMock.isEmailRegistered,
    isUserInInviteGroup: inviteServiceMock.isUserInInviteGroup,
    rejectInvitation: inviteServiceMock.rejectInvitation,
  };
});

/** Matches `App` route: `/group-invite?inviteId=&email=&confirmation=` */
function memberInviteSearch(inviteId: string, email: string, confirmation: 'true' | 'false') {
  const params = new URLSearchParams({ inviteId, email, confirmation });
  return `?${params.toString()}`;
}

function renderInvitePage(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/group-invite${search}`]}>
      <Routes>
        <Route path="/group-invite" element={<InvitePage />} />
        <Route path="/signup" element={<div>signup</div>} />
        <Route path="/login" element={<div>login</div>} />
        <Route path="/groups/:groupId" element={<div>group</div>} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.value = { session: null };
    inviteServiceMock.fetchInviteGroupDetails.mockResolvedValue({
      groupId: 'group-demo',
      patientId: 'patient-demo',
      groupName: 'CareCircle Family Group',
      description: 'A shared care group.',
      totalCarers: 2,
    });
    inviteServiceMock.isUserInInviteGroup.mockResolvedValue(false);
    inviteServiceMock.isEmailRegistered.mockResolvedValue(false);
    inviteServiceMock.acceptInvitation.mockResolvedValue({ groupId: 'group-demo' });
    inviteServiceMock.rejectInvitation.mockResolvedValue(undefined);
  });

  it('shows an error for an invalid invite link', async () => {
    renderInvitePage(memberInviteSearch(INVITE_ID, 'not-an-email', 'false'));

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(screen.getByText(/invalid or incomplete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('reads invite id and email from query params', async () => {
    renderInvitePage(memberInviteSearch(INVITE_ID, 'new@example.com', 'false'));

    await waitFor(() =>
      expect(inviteServiceMock.isEmailRegistered).toHaveBeenCalledWith(
        'new@example.com',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    expect(localStorage.getItem('carecircle:pendingInvite')).toBe(
      JSON.stringify({ email: 'new@example.com', inviteId: INVITE_ID }),
    );
  });

  it('redirects authenticated matching users toward confirmation mode', async () => {
    authMock.value = { session: { user: { email: 'new@example.com' } } };
    renderInvitePage(memberInviteSearch(INVITE_ID, 'new@example.com', 'false'));

    await waitFor(() => {
      expect(localStorage.getItem('carecircle:pendingInvite')).toBe(
        JSON.stringify({ email: 'new@example.com', inviteId: INVITE_ID }),
      );
    });
  });

  it('shows an account mismatch error for signed-in users with another email', async () => {
    authMock.value = { session: { user: { email: 'obinna.ezedei@gmail.com' } } };
    renderInvitePage(memberInviteSearch(INVITE_ID, 'binna.ezedei@gmail.com', 'false'));

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(screen.getByText(/ob\*{6}ei@gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText(/bi\*{6}ei@gmail\.com/)).toBeInTheDocument();
    expect(screen.queryByText(/obinna\.ezedei@gmail\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/binna\.ezedei@gmail\.com/)).not.toBeInTheDocument();
    expect(screen.getByText(/please log out first/i)).toBeInTheDocument();
  });

  it('blocks confirmation when the active session does not match the invited email', async () => {
    authMock.value = { session: { user: { email: 'other@example.com' } } };
    renderInvitePage(memberInviteSearch(INVITE_ID, 'new@example.com', 'true'));

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(screen.getByText(/active session is signed in as ot\*{6}er@example.com/i)).toBeInTheDocument();
    expect(inviteServiceMock.fetchInviteGroupDetails).not.toHaveBeenCalled();
  });

  it('loads the confirmation screen with group details', async () => {
    authMock.value = { session: { user: { email: 'new@example.com', id: 'user-confirm-1' } } };
    renderInvitePage(memberInviteSearch(INVITE_ID, 'new@example.com', 'true'));

    expect(await screen.findByText('Join CareCircle Family Group')).toBeInTheDocument();
    expect(inviteServiceMock.isUserInInviteGroup).toHaveBeenCalledWith(
      'group-demo',
      'patient-demo',
      'user-confirm-1',
    );
    expect(screen.getByText('A shared care group.')).toBeInTheDocument();
    expect(screen.getByText(/2 carers already linked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject invitation/i })).toBeInTheDocument();
  });

  it('shows the already-member state when the invited email is already in the group', async () => {
    inviteServiceMock.isUserInInviteGroup.mockResolvedValue(true);
    authMock.value = { session: { user: { email: 'member@example.com', id: 'user-member-1' } } };
    localStorage.setItem('carecircle:pendingInvite', JSON.stringify({ email: 'member@example.com', inviteId: INVITE_ID }));
    renderInvitePage(memberInviteSearch(INVITE_ID, 'member@example.com', 'true'));

    expect(await screen.findByText('You are already a member')).toBeInTheDocument();
    expect(inviteServiceMock.isUserInInviteGroup).toHaveBeenCalledWith(
      'group-demo',
      'patient-demo',
      'user-member-1',
    );
    expect(screen.getByRole('button', { name: /go to group/i })).toBeInTheDocument();
    expect(localStorage.getItem('carecircle:pendingInvite')).toBeNull();
  });

  it('accepts an invitation and clears the pending invite', async () => {
    const user = userEvent.setup();
    authMock.value = { session: { user: { email: 'new@example.com' } } };
    localStorage.setItem('carecircle:pendingInvite', JSON.stringify({ email: 'new@example.com', inviteId: INVITE_ID }));
    renderInvitePage(memberInviteSearch(INVITE_ID, 'new@example.com', 'true'));

    await user.click(await screen.findByRole('button', { name: /accept invitation/i }));

    expect(inviteServiceMock.acceptInvitation).toHaveBeenCalledWith(INVITE_ID, 'new@example.com');
    await waitFor(() => {
      expect(localStorage.getItem('carecircle:pendingInvite')).toBeNull();
    });
  });

  it('rejects an invitation and clears the pending invite', async () => {
    const user = userEvent.setup();
    authMock.value = { session: { user: { email: 'new@example.com' } } };
    localStorage.setItem('carecircle:pendingInvite', JSON.stringify({ email: 'new@example.com', inviteId: INVITE_ID }));
    renderInvitePage(memberInviteSearch(INVITE_ID, 'new@example.com', 'true'));

    await user.click(await screen.findByRole('button', { name: /reject invitation/i }));

    expect(inviteServiceMock.rejectInvitation).toHaveBeenCalledWith(INVITE_ID);
    await waitFor(() => {
      expect(localStorage.getItem('carecircle:pendingInvite')).toBeNull();
    });
  });
});
