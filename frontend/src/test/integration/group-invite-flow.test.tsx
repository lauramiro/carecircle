import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../api/groups/groups.types';

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}));

const groupDetailHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    group: null as Group | null,
  },
}));

const gpContactsHookMock = vi.hoisted(() => ({
  value: {
    contacts: [],
    error: null as string | null,
    isSubmitting: { add: false, update: false, remove: false },
    addGP: vi.fn(),
    updateGP: vi.fn(),
    removeGP: vi.fn(),
  },
}));

const inviteMemberHookMock = vi.hoisted(() => ({
  inviting: false,
  sendInvite: vi.fn(),
}));

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

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: supabaseMock,
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupDetailHookMock.value,
}));

vi.mock('../../hooks/groups/useGPContacts', () => ({
  useGPContacts: () => gpContactsHookMock.value,
}));

vi.mock('../../hooks/groups/useInviteMember', () => ({
  useInviteMember: () => ({
    inviting: inviteMemberHookMock.inviting,
    sendInvite: inviteMemberHookMock.sendInvite,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

vi.mock('../../services/inviteService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/inviteService')>();
  return {
    ...actual,
    acceptInvitation: inviteServiceMock.acceptInvitation,
    fetchInviteGroupDetails: inviteServiceMock.fetchInviteGroupDetails,
    isEmailRegistered: inviteServiceMock.isEmailRegistered,
    isUserInInviteGroup: inviteServiceMock.isUserInInviteGroup,
    rejectInvitation: inviteServiceMock.rejectInvitation,
  };
});

import CreateGroupPage from '../../pages/groups/CreateGroupPage';
import GroupDetailPage from '../../pages/groups/GroupDetailPage';
import InvitePage from '../../pages/InvitePage';

const INVITE_ID = '550e8400-e29b-41d4-a716-446655440000';

function renderCreateGroupFlow() {
  return render(
    <MemoryRouter initialEntries={['/groups/create']}>
      <Routes>
        <Route path="/groups/create" element={<CreateGroupPage />} />
        <Route path="/groups/list" element={<div>groups-list-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderGroupDetailFlow(groupId = 'group-care-001') {
  return render(
    <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderInviteFlow(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/group-invite${search}`]}>
      <Routes>
        <Route path="/group-invite" element={<InvitePage />} />
        <Route path="/groups/:groupId" element={<div>group-page</div>} />
        <Route path="/" element={<div>home-page</div>} />
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/signup" element={<div>signup-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function memberInviteSearch(email: string, confirmation: 'true' | 'false') {
  const params = new URLSearchParams({ inviteId: INVITE_ID, email, confirmation });
  return `?${params.toString()}`;
}

function mockPatientInsertSuccess(patientId = 'patient-123') {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: patientId },
          error: null,
        }),
      }),
    }),
  };
}

function mockGroupInsertSuccess(groupId = 'group-123') {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: groupId },
          error: null,
        }),
      }),
    }),
  };
}

function buildAdminGroupWithMembers(memberCount: number): Group {
  return {
    id: 'group-care-001',
    name: 'CareCircle Family Group',
    description: 'A shared care group.',
    role: 'Admin',
    createdAt: '2025-05-12T09:00:00.000Z',
    members: Array.from({ length: memberCount }, (_, index) => ({
      id: `member-${index + 1}`,
      name: `Member ${index + 1}`,
      email: `member${index + 1}@example.com`,
      role: index === 0 ? 'Admin' : 'Member',
      joinedAt: '2025-05-12T09:00:00.000Z',
      status: 'Active',
    })),
    gpContacts: [],
  };
}

describe('group invite integration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.value = { session: null };
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
    groupDetailHookMock.value = {
      loading: false,
      error: null,
      group: buildAdminGroupWithMembers(2),
    };
    gpContactsHookMock.value = {
      contacts: [],
      error: null,
      isSubmitting: { add: false, update: false, remove: false },
      addGP: vi.fn(),
      updateGP: vi.fn(),
      removeGP: vi.fn(),
    };
    inviteMemberHookMock.inviting = false;
    inviteMemberHookMock.sendInvite.mockResolvedValue(undefined);
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

  it('creates a group from the create-group flow', async () => {
    const user = userEvent.setup();
    const careGiverInsert = vi.fn().mockResolvedValue({ error: null });

    supabaseMock.from
      .mockReturnValueOnce(mockPatientInsertSuccess('patient-001'))
      .mockReturnValueOnce(mockGroupInsertSuccess('group-001'))
      .mockReturnValueOnce({
        insert: careGiverInsert,
      });

    renderCreateGroupFlow();

    await user.type(screen.getByLabelText(/circle name/i), 'Mum Care Team');
    await user.type(screen.getByLabelText(/patient full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/date of birth/i), '1955-05-01');
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com');
    await user.selectOptions(screen.getByLabelText(/relationship to the patient/i), 'parent');
    await user.click(screen.getByRole('button', { name: /create circle/i }));

    expect(await screen.findByText('groups-list-page')).toBeInTheDocument();
    expect(careGiverInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: 'group-001',
        patient_id: 'patient-001',
        care_giver_id: 'test-user-id',
        status: 'active',
      }),
    );
  });

  it('sends an invite from the group detail page', async () => {
    const user = userEvent.setup();
    renderGroupDetailFlow();

    await user.click(screen.getByRole('button', { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email address/i), 'newcarer@example.com');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(inviteMemberHookMock.sendInvite).toHaveBeenCalledWith('newcarer@example.com');
    });
    expect(toastMock.success).toHaveBeenCalledWith('Invite sent to newcarer@example.com');
  });

  it('accepts a valid invite and navigates to the group', async () => {
    const user = userEvent.setup();
    authMock.value = {
      session: { user: { email: 'new@example.com', id: 'user-confirm-1' } },
    };

    renderInviteFlow(memberInviteSearch('new@example.com', 'true'));

    await user.click(await screen.findByRole('button', { name: /accept invitation/i }));

    await waitFor(() => {
      expect(inviteServiceMock.acceptInvitation).toHaveBeenCalledWith(INVITE_ID, 'new@example.com');
    });
    expect(await screen.findByText('group-page')).toBeInTheDocument();
  });

  it('rejects an expired invite older than 48 hours', async () => {
    authMock.value = {
      session: { user: { email: 'new@example.com', id: 'user-confirm-1' } },
    };
    inviteServiceMock.fetchInviteGroupDetails.mockRejectedValue(
      new Error('Invitation expired after 48 hours'),
    );

    renderInviteFlow(memberInviteSearch('new@example.com', 'true'));

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('We could not load this invitation. Please try again.'),
    ).toBeInTheDocument();
    expect(inviteServiceMock.acceptInvitation).not.toHaveBeenCalled();
  });

  it('blocks joining when a group is already full with 8 members', async () => {
    const user = userEvent.setup();
    authMock.value = {
      session: { user: { email: 'new@example.com', id: 'user-confirm-1' } },
    };
    inviteServiceMock.fetchInviteGroupDetails.mockResolvedValue({
      groupId: 'group-demo',
      patientId: 'patient-demo',
      groupName: 'CareCircle Family Group',
      description: 'A shared care group.',
      totalCarers: 8,
    });
    inviteServiceMock.acceptInvitation.mockRejectedValue(new Error('Group has reached the member limit'));

    renderInviteFlow(memberInviteSearch('new@example.com', 'true'));

    expect(await screen.findByText(/8 carers already linked/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /accept invitation/i }));

    expect(await screen.findByText('Invitation unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('We could not accept this invitation. Please try again.'),
    ).toBeInTheDocument();
  });
});
