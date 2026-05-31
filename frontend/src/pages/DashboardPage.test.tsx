import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
}));

vi.mock('../components/dashboard/MedicationSummaryWidget', () => ({
  default: () => <div data-testid="medication-summary-widget" />,
}));

vi.mock('../components/dashboard/OnDutyCarerWidget', () => ({
  default: () => <div data-testid="on-duty-carer-widget" />,
}));

vi.mock('../components/dashboard/NextAppointmentWidget', () => ({
  default: () => <div data-testid="next-appointment-widget" />,
}));

vi.mock('../components/dashboard/LatestJournalEntryWidget', () => ({
  default: () => <div data-testid="latest-journal-entry-widget" />,
}));

vi.mock('../components/dashboard/AiInsightWidget', () => ({
  default: () => <div data-testid="ai-insight-widget" />,
}));

vi.mock('../components/shifts/MyShiftsTodayWidget', () => ({
  default: () => <div data-testid="my-shifts-today-widget" />,
}));

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
        role: 'primary_carer' as 'primary_carer' | 'secondary_carer' | 'observer',
        createdAt: '2025-05-12T09:00:00.000Z',
        memberCount: 3,
        patientId: 'patient-001',
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
          role: 'primary_carer' as const,
          createdAt: '2025-05-12T09:00:00.000Z',
          memberCount: 3,
          patientId: 'patient-001',
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
    expect(screen.getByText('Shift coverage gaps')).toBeInTheDocument();
    expect(screen.getAllByText('Dad Care Circle').length).toBeGreaterThan(0);
    expect(screen.getByText(/3 of 28 sessions need coverage/i)).toBeInTheDocument();
    expect(screen.getByText('Groups you manage')).toBeInTheDocument();
    expect(screen.getByText('Total members')).toBeInTheDocument();
  });

  it('renders care status widgets for the first group', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('medication-summary-widget')).toBeInTheDocument();
    expect(screen.getByTestId('on-duty-carer-widget')).toBeInTheDocument();
    expect(screen.getByTestId('next-appointment-widget')).toBeInTheDocument();
    expect(screen.getByTestId('latest-journal-entry-widget')).toBeInTheDocument();
    expect(screen.getByTestId('ai-insight-widget')).toBeInTheDocument();
    expect(screen.getByTestId('my-shifts-today-widget')).toBeInTheDocument();
  });

  it('does not render widgets when there are no groups', () => {
    groupsHookMock.value = { loading: false, error: null, groups: [] };
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('medication-summary-widget')).not.toBeInTheDocument();
    expect(screen.queryByTestId('on-duty-carer-widget')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-shifts-today-widget')).not.toBeInTheDocument();
  });

  it('hides shift coverage gaps when the user is not a primary carer anywhere', () => {
    groupsHookMock.value = {
      loading: false,
      error: null,
      groups: [
        {
          id: 'group-care-002',
          name: 'Mum',
          description: 'Desc',
          role: 'secondary_carer' as 'primary_carer' | 'secondary_carer' | 'observer',
          createdAt: '2025-05-12T09:00:00.000Z',
          memberCount: 2,
          patientId: 'patient-002',
        },
      ],
    };

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Shift coverage gaps')).not.toBeInTheDocument();
  });
});
