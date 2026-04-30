import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
        { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin' as const },
        { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member' as const },
      ],
    },
  },
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupHookMock.value,
}));

vi.mock('../../components/groups/InviteMemberModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Invite modal</div> : null),
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
          { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin' },
          { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member' },
        ],
      },
    };
  });

  it('renders group details', () => {
    renderPage();

    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
    expect(screen.getByText('Daily support and medication coordination for Dad.')).toBeInTheDocument();
    expect(screen.getByText('group-care-001')).toBeInTheDocument();
    expect(screen.getByText('12 May 2025')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
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
        })),
      },
    };

    renderPage('group-care-005');

    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
  });
});
