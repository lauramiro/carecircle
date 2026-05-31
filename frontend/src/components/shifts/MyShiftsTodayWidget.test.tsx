import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MyShiftsTodayWidget from './MyShiftsTodayWidget';

vi.mock('../../hooks/shifts/useMyShifts', () => ({
  useMyShifts: () => ({
    todayShifts: [
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
    upcomingShifts: [],
    historyShifts: [],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

describe('MyShiftsTodayWidget', () => {
  it('shows today shift handover details', () => {
    render(
      <MemoryRouter>
        <MyShiftsTodayWidget groupId="group-1" groupName="Dad Care Circle" />
      </MemoryRouter>,
    );

    expect(screen.getByText('My Shifts Today')).toBeInTheDocument();
    expect(screen.getByText(/Handover from: John/)).toBeInTheDocument();
    expect(screen.getByText(/Handover to: Emma/)).toBeInTheDocument();
  });
});
