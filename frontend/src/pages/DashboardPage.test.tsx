import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';

vi.mock('../hooks/shifts/useDashboardShiftWarnings', () => ({
  useDashboardShiftWarnings: () => ({
    warnings: [
      {
        groupId: 'group-001',
        groupName: 'Dad Care Circle',
        unassignedCount: 3,
        weekStart: '2026-05-18',
        weekEnd: '2026-05-24',
      },
    ],
    loading: false,
    error: null,
  }),
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';

const authMock = vi.hoisted(() => ({
  session: {
    user: {
      email: 'sarah.caregiver@example.com',
    },
  },
}));

const groupsHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    groups: [
      {
        id: 'group-care-001',
        name: 'Dad Care Circle',
        description: 'Daily support and medication coordination for Dad.',
        role: 'Admin' as const,
        createdAt: '2025-05-12T09:00:00.000Z',
        memberCount: 3,
      },
    ],
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock,
}));

vi.mock('../hooks/groups/useGroups', () => ({
  useGroups: () => groupsHookMock.value,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    groupsHookMock.value = {
      loading: false,
      error: null,
      groups: [
        {
          id: 'group-care-001',
          name: 'Dad Care Circle',
          description: 'Daily support and medication coordination for Dad.',
          role: 'Admin',
          createdAt: '2025-05-12T09:00:00.000Z',
          memberCount: 3,
        },
      ],
    };
  });

  it('shows the dashboard overview content', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/good (morning|afternoon|evening), sarah caregiver/i)).toBeInTheDocument();
    expect(screen.getByText(/overview of your care circles/i)).toBeInTheDocument();
    expect(screen.getByText('Active groups')).toBeInTheDocument();
    expect(screen.getByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText("Today's events")).toBeInTheDocument();
    expect(screen.getByText('Shift coverage alerts')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
    expect(screen.getByText(/3 uncovered shifts this week/i)).toBeInTheDocument();
    expect(screen.getByText('Groups you manage')).toBeInTheDocument();
    expect(screen.getByText('Total members')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
  });
});
