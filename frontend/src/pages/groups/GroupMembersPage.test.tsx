import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../api/groups/groups.types';
import GroupMembersPage from './GroupMembersPage';

const groupHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    group: {
      id: 'group-care-001',
      patientId: 'patient-1',
      name: 'Dad Care Circle',
      description: 'Daily support and medication coordination for Dad.',
      role: 'Admin' as const,
      createdAt: '2025-05-12T09:00:00.000Z',
      members: [
        { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin' as const, joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' as const },
        { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member' as const, joinedAt: '2025-05-13T10:20:00.000Z', status: 'Suspended' as const },
      ],
      gpContacts: [],
    } as Group,
  },
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupHookMock.value,
}));

vi.mock('../../components/groups/InviteMemberModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Invite modal</div> : null),
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

function renderPage(groupId = 'group-care-001') {
  render(
    <MemoryRouter initialEntries={[`/groups/${groupId}/members`]}>
      <Routes>
        <Route path="/groups/:groupId/members" element={<GroupMembersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GroupMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupHookMock.value = {
      loading: false,
      error: null,
      group: {
        id: 'group-care-001',
        patientId: 'patient-1',
        name: 'Dad Care Circle',
        description: 'Daily support and medication coordination for Dad.',
        role: 'Admin',
        createdAt: '2025-05-12T09:00:00.000Z',
        members: [
          { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin', joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' },
          { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member', joinedAt: '2025-05-13T10:20:00.000Z', status: 'Suspended' },
        ],
        gpContacts: [],
      } as Group,
    };
  });

  it('renders members for the care circle', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('shows invite button when group has fewer than eight members', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
  });

  it('hides invite button when group has eight members', () => {
    groupHookMock.value = {
      loading: false,
      error: null,
      group: {
        id: 'group-care-005',
        patientId: 'patient-5',
        name: 'Medication Helpers',
        description: 'Shared medication reminders across the family.',
        role: 'Admin',
        createdAt: '2025-01-21T16:10:00.000Z',
        members: Array.from({ length: 8 }, (_, index) => ({
          id: `member-${index}`,
          name: `Member ${index}`,
          email: `member${index}@example.com`,
          role: 'Member' as const,
          joinedAt: '2025-01-21T16:10:00.000Z',
          status: 'Active' as const,
        })),
        gpContacts: [],
      } as Group,
    };

    renderPage('group-care-005');

    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
  });

  it('asks for confirmation before changing a member role', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText(/change role for john/i), 'Admin');

    const roleDialog = screen.getByRole('dialog', { name: /change member role/i });
    expect(roleDialog).toBeInTheDocument();

    await user.click(within(roleDialog).getByRole('button', { name: /change role/i }));

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.getByLabelText(/change role for john/i)).toHaveValue('Admin');
    expect(toastMock.success).toHaveBeenCalledWith('John is now Admin');
  });

  it('hides member actions when active user is not an admin', () => {
    groupHookMock.value = {
      loading: false,
      error: null,
      group: {
        id: 'group-care-002',
        patientId: 'patient-2',
        name: 'Mum Recovery Team',
        description: 'Post-surgery care planning and appointment tracking.',
        role: 'Member',
        createdAt: '2025-04-28T13:30:00.000Z',
        members: [
          { id: 'member-4', name: 'Amara', email: 'amara@example.com', role: 'Admin', joinedAt: '2025-04-28T13:30:00.000Z', status: 'Active' },
          { id: 'member-5', name: 'Sarah', email: 'sarah@example.com', role: 'Member', joinedAt: '2025-04-29T09:15:00.000Z', status: 'Active' },
        ],
        gpContacts: [],
      } as Group,
    };

    renderPage('group-care-002');

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/change role/i)).not.toBeInTheDocument();
  });
});
