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
}));

describe('DashboardPage', () => {
  it('shows the dashboard overview content', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Good morning, Caregiver')).toBeInTheDocument();
    expect(screen.getByText(/overview of your care circles/i)).toBeInTheDocument();
    expect(screen.getByText('Active groups')).toBeInTheDocument();
    expect(screen.getByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText("Today's events")).toBeInTheDocument();
    expect(screen.getByText('Shift coverage alerts')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
    expect(screen.getByText(/3 uncovered shifts this week/i)).toBeInTheDocument();
  });
});
