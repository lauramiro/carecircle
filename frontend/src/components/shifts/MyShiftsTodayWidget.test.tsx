import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MyShiftsTodayWidget from './MyShiftsTodayWidget';

vi.mock('../../hooks/shifts/useMyShifts', () => ({
  useMyShifts: () => ({
    todayByGroup: [
      {
        groupId: 'group-1',
        groupName: 'Dad Care Circle',
        shifts: [
          {
            id: '1',
            groupId: 'group-1',
            shiftDate: '2026-05-20',
            slot: 'morning',
            assignedCaregiverId: 'user-1',
            assigneeName: 'Sarah',
            updatedAt: null,
            handoverFromName: 'John',
            handoverToName: 'Emma',
          },
        ],
      },
      {
        groupId: 'group-2',
        groupName: 'Mum Care Circle',
        shifts: [
          {
            id: '2',
            groupId: 'group-2',
            shiftDate: '2026-05-20',
            slot: 'evening',
            assignedCaregiverId: 'user-1',
            assigneeName: 'Sarah',
            updatedAt: null,
            handoverFromName: null,
            handoverToName: 'Alex',
          },
        ],
      },
    ],
    todayShifts: [
      { id: '1', groupId: 'group-1', shiftDate: '2026-05-20', slot: 'morning' },
      { id: '2', groupId: 'group-2', shiftDate: '2026-05-20', slot: 'evening' },
    ],
    upcomingShifts: [],
    historyShifts: [],
    upcomingByGroup: [],
    historyByGroup: [],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

describe('MyShiftsTodayWidget', () => {
  it('shows today shifts grouped by care circle', () => {
    render(
      <MemoryRouter>
        <MyShiftsTodayWidget
          groups={[
            { id: 'group-1', name: 'Dad Care Circle' },
            { id: 'group-2', name: 'Mum Care Circle' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('My Shifts Today')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
    expect(screen.getByText('Mum Care Circle')).toBeInTheDocument();
    expect(screen.getByText(/John → Emma/)).toBeInTheDocument();
    expect(screen.getByText(/Unassigned → Alex/)).toBeInTheDocument();
  });
});
