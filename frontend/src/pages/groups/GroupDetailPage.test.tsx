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
import GroupDetailPage from './GroupDetailPage';

const groupHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    group: {
      id: 'group-care-001',
      name: 'Dad Care Circle',
      description: 'Daily support and medication coordination for Dad.',
      role: 'Admin' as const,
      createdAt: '2025-05-12T09:00:00.000Z',
      members: [
        { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin' as const, joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' as const },
        { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member' as const, joinedAt: '2025-05-13T10:20:00.000Z', status: 'Suspended' as const },
      ],
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
    <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GroupDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupHookMock.value = {
      loading: false,
      error: null,
      group: {
        id: 'group-care-001',
        name: 'Dad Care Circle',
        description: 'Daily support and medication coordination for Dad.',
        role: 'Admin',
        createdAt: '2025-05-12T09:00:00.000Z',
        members: [
          { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin', joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' },
          { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member', joinedAt: '2025-05-13T10:20:00.000Z', status: 'Suspended' },
        ],
      } as Group,
    };
  });

  it('renders group details', () => {
    renderPage();

    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
    expect(screen.getByText('Daily support and medication coordination for Dad.')).toBeInTheDocument();
    expect(screen.getByText('group-care-001')).toBeInTheDocument();
    expect(screen.getAllByText('12 May 2025')).toHaveLength(2);
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('sarah@example.com')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('13 May 2025')).toBeInTheDocument();
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
      } as Group,
    };

    renderPage('group-care-005');

    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
  });

  it('asks for confirmation before changing a member role', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /suspend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/change role for john/i), 'Admin');

    const roleDialog = screen.getByRole('dialog', { name: /change member role/i });
    expect(roleDialog).toBeInTheDocument();
    expect(screen.getByLabelText(/change role for john/i)).toHaveValue('Member');

    await user.click(within(roleDialog).getByRole('button', { name: /change role/i }));

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.getByLabelText(/change role for john/i)).toHaveValue('Admin');
    expect(toastMock.success).toHaveBeenCalledWith('John is now Admin');
  });

  it('can cancel a pending role change without changing the table', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText(/change role for john/i), 'Admin');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.getByLabelText(/change role for john/i)).toHaveValue('Member');
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('confirms suspend, reactivate, and remove actions with toast feedback', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /reactivate/i }));
    const reactivateDialog = screen.getByRole('dialog', { name: /reactivate member/i });
    expect(reactivateDialog).toBeInTheDocument();
    await user.click(within(reactivateDialog).getByRole('button', { name: /^reactivate$/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(toastMock.success).toHaveBeenCalledWith('John reactivated');

    await user.click(screen.getAllByRole('button', { name: /suspend/i })[0]);
    const suspendDialog = screen.getByRole('dialog', { name: /suspend member/i });
    expect(suspendDialog).toBeInTheDocument();
    await user.click(within(suspendDialog).getByRole('button', { name: /^suspend$/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith('Sarah suspended');

    await user.click(screen.getAllByRole('button', { name: /remove/i })[1]);
    const removeDialog = screen.getByRole('dialog', { name: /remove member/i });
    expect(removeDialog).toBeInTheDocument();
    await user.click(within(removeDialog).getByRole('button', { name: /^remove$/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.queryByText('John')).not.toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith('John removed from group');
  });

  it('can cancel a pending status change without changing the table', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /reactivate/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('hides member actions when active user is not an admin', () => {
    groupHookMock.value = {
      loading: false,
      error: null,
      group: {
        id: 'group-care-002',
        name: 'Mum Recovery Team',
        description: 'Post-surgery care planning and appointment tracking.',
        role: 'Member',
        createdAt: '2025-04-28T13:30:00.000Z',
        members: [
          { id: 'member-4', name: 'Amara', email: 'amara@example.com', role: 'Admin', joinedAt: '2025-04-28T13:30:00.000Z', status: 'Active' },
          { id: 'member-5', name: 'Sarah', email: 'sarah@example.com', role: 'Member', joinedAt: '2025-04-29T09:15:00.000Z', status: 'Active' },
        ],
      } as Group,
    };

    renderPage('group-care-002');

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/change role/i)).not.toBeInTheDocument();
  });
});
