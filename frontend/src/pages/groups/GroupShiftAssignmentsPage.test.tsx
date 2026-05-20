import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../api/groups/groups.types';
import type { WeeklyShiftAssignment } from '../../api/shifts/shift.types';
import GroupShiftAssignmentsPage from './GroupShiftAssignmentsPage';

vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));

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
        { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member' as const, joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' as const },
      ],
      gpContacts: [],
      patientId: 'patient-001',
    } as Group,
  },
}));

const shiftHookMock = vi.hoisted(() => ({
  value: {
    assignments: [
      {
        id: 'assignment-1',
        groupId: 'group-care-001',
        shiftDate: '2026-05-18',
        slot: 'morning',
        assignedCaregiverId: 'member-1',
        assigneeName: 'Sarah',
        updatedAt: '2026-05-18T08:00:00.000Z',
      },
      {
        id: null,
        groupId: 'group-care-001',
        shiftDate: '2026-05-18',
        slot: 'afternoon',
        assignedCaregiverId: null,
        assigneeName: null,
        updatedAt: null,
      },
      {
        id: null,
        groupId: 'group-care-001',
        shiftDate: '2026-05-19',
        slot: 'morning',
        assignedCaregiverId: null,
        assigneeName: null,
        updatedAt: null,
      },
      {
        id: null,
        groupId: 'group-care-001',
        shiftDate: '2026-05-19',
        slot: 'afternoon',
        assignedCaregiverId: null,
        assigneeName: null,
        updatedAt: null,
      },
    ] as WeeklyShiftAssignment[],
    loading: false,
    error: null as string | null,
    savingKey: null as string | null,
    saveAssignment: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupHookMock.value,
}));

vi.mock('../../hooks/shifts/useWeeklyShiftAssignments', () => ({
  useWeeklyShiftAssignments: () => shiftHookMock.value,
}));

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/groups/group-care-001/shifts']}>
      <Routes>
        <Route path="/groups/:groupId/shifts" element={<GroupShiftAssignmentsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GroupShiftAssignmentsPage', () => {
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
          { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member', joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' },
        ],
        gpContacts: [],
        patientId: 'patient-001',
      } as Group,
    };
    shiftHookMock.value = {
      assignments: [
        {
          id: 'assignment-1',
          groupId: 'group-care-001',
          shiftDate: '2026-05-18',
          slot: 'morning',
          assignedCaregiverId: 'member-1',
          assigneeName: 'Sarah',
          updatedAt: '2026-05-18T08:00:00.000Z',
        },
        {
          id: null,
          groupId: 'group-care-001',
          shiftDate: '2026-05-18',
          slot: 'afternoon',
          assignedCaregiverId: null,
          assigneeName: null,
          updatedAt: null,
        },
      ],
      loading: false,
      error: null,
      savingKey: null,
      saveAssignment: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('renders the weekly shift grid and uncovered warning state', () => {
    renderPage();

    expect(screen.getByText('Dad Care Circle Shift Coverage')).toBeInTheDocument();
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    expect(screen.getByText(/uncovered shift/i)).toBeInTheDocument();
    expect(screen.getAllByText('Coverage needed').length).toBeGreaterThan(0);
  });

  it('allows admin users to assign a member to a slot', async () => {
    const user = userEvent.setup();
    renderPage();

    const afternoonSelect = screen.getByLabelText('Afternoon shift on Mon 18 May');
    await user.selectOptions(afternoonSelect, 'member-2');

    await waitFor(() => {
      expect(shiftHookMock.value.saveAssignment).toHaveBeenCalledWith({
        groupId: 'group-care-001',
        shiftDate: '2026-05-18',
        slot: 'afternoon',
        assignedCaregiverId: 'member-2',
      });
    });
  });

  it('renders read-only controls for non-admin users', () => {
    groupHookMock.value = {
      ...groupHookMock.value,
      group: { ...groupHookMock.value.group!, role: 'Member' as const },
    };

    renderPage();

    expect(screen.getByLabelText('Morning shift on Mon 18 May')).toBeDisabled();
    expect(screen.getByLabelText('Afternoon shift on Mon 18 May')).toBeDisabled();
  });
});