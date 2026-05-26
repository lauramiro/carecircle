import { render, screen } from '@testing-library/react';
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
      patientId: 'patient-1',
      name: 'Dad Care Circle',
      description: 'Daily support and medication coordination for Dad.',
      role: 'Admin' as const,
      canSchedule: true,
      createdAt: '2025-05-12T09:00:00.000Z',
      members: [
        { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin' as const, joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' as const },
        { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member' as const, joinedAt: '2025-05-13T10:20:00.000Z', status: 'Suspended' as const },
      ],
      gpContacts: [],
    } as Group,
  },
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupHookMock.value,
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
        patientId: 'patient-1',
        name: 'Dad Care Circle',
        description: 'Daily support and medication coordination for Dad.',
        role: 'Admin',
        canSchedule: true,
        createdAt: '2025-05-12T09:00:00.000Z',
        members: [
          { id: 'member-1', name: 'Sarah', email: 'sarah@example.com', role: 'Admin', joinedAt: '2025-05-12T09:00:00.000Z', status: 'Active' },
          { id: 'member-2', name: 'John', email: 'john@example.com', role: 'Member', joinedAt: '2025-05-13T10:20:00.000Z', status: 'Suspended' },
        ],
        gpContacts: [],
      } as Group,
    };
  });

  it('renders group overview without the members table', () => {
    renderPage();

    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
    expect(screen.getByText('Daily support and medication coordination for Dad.')).toBeInTheDocument();
    expect(screen.getAllByText('12 May 2025').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('Sarah')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /members/i })).toHaveAttribute('href', '/groups/group-care-001/members');
  });

  it('renders GP contacts from the group detail data', () => {
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
        gpContacts: [
          {
            id: 'gp-003',
            gpName: 'Dr. Aisha Morgan',
            phoneNumber: '+44 161 555 0148',
            practiceName: 'Riverside Health Clinic',
          },
        ],
      } as Group,
    };

    renderPage('group-care-002');

    expect(screen.getByText('GP Contacts')).toBeInTheDocument();
    expect(screen.getByText('Dr. Aisha Morgan')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ add gp contact/i })).not.toBeInTheDocument();
  });
});
