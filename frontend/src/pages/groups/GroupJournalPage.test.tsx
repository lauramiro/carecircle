import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../api/groups/groups.types';
import type { JournalEntry } from '../../api/journal/journal.types';
import GroupJournalPage from './GroupJournalPage';

const groupHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    group: {
      id: 'group-care-001',
      name: 'Dad Care Circle',
      description: 'Daily support and medication coordination for Dad.',
      role: 'Member' as const,
      createdAt: '2025-05-12T09:00:00.000Z',
      members: [],
      gpContacts: [],
      patientId: 'patient-001',
    } as Group,
  },
}));

const journalHookMock = vi.hoisted(() => ({
  value: {
    entries: [
      {
        id: 'entry-1',
        groupId: 'group-care-001',
        authorId: 'user-001',
        authorName: 'Sarah Doe',
        content: 'Medication given. GP call still needed tomorrow morning.',
        createdAt: '2025-05-12T09:00:00.000Z',
      },
    ] as JournalEntry[],
    loading: false,
    error: null as string | null,
    isSubmitting: false,
    addEntry: vi.fn().mockResolvedValue(undefined),
  },
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
}));

vi.mock('../../hooks/groups/useGroupDetail', () => ({
  useGroupDetail: () => groupHookMock.value,
}));

vi.mock('../../hooks/journal/useJournalEntries', () => ({
  useJournalEntries: () => journalHookMock.value,
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

function renderPage(groupId = 'group-care-001') {
  render(
    <MemoryRouter initialEntries={[`/groups/${groupId}/journal`]}>
      <Routes>
        <Route path="/groups/:groupId/journal" element={<GroupJournalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GroupJournalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groupHookMock.value = {
      loading: false,
      error: null,
      group: {
        id: 'group-care-001',
        name: 'Dad Care Circle',
        description: 'Daily support and medication coordination for Dad.',
        role: 'Member',
        createdAt: '2025-05-12T09:00:00.000Z',
        members: [],
        gpContacts: [],
        patientId: 'patient-001',
      } as Group,
    };
    journalHookMock.value = {
      entries: [
        {
          id: 'entry-1',
          groupId: 'group-care-001',
          authorId: 'user-001',
          authorName: 'Sarah Doe',
          content: 'Medication given. GP call still needed tomorrow morning.',
          createdAt: '2025-05-12T09:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      isSubmitting: false,
      addEntry: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('renders existing handover entries and the write form for carers', () => {
    renderPage();

    expect(screen.getByText('Handover Journal')).toBeInTheDocument();
    expect(screen.getByText('Sarah Doe')).toBeInTheDocument();
    expect(
      screen.getByText('Medication given. GP call still needed tomorrow morning.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/shift handover note/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save handover entry/i })).toBeInTheDocument();
  });

  it('submits a new journal entry for carers', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/shift handover note/i), 'Night medication handed over.');
    await user.click(screen.getByRole('button', { name: /save handover entry/i }));

    await waitFor(() => {
      expect(journalHookMock.value.addEntry).toHaveBeenCalledWith('Night medication handed over.');
    });
    expect(toastMock.success).toHaveBeenCalledWith('Handover entry saved');
  });

  it('shows observers as read-only', () => {
    groupHookMock.value = {
      loading: false,
      error: null,
      group: {
        id: 'group-care-001',
        name: 'Dad Care Circle',
        description: 'Daily support and medication coordination for Dad.',
        role: 'Observer',
        createdAt: '2025-05-12T09:00:00.000Z',
        members: [],
        gpContacts: [],
        patientId: 'patient-001',
      } as Group,
    };

    renderPage();

    expect(screen.getByText(/observers can review handover notes/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/shift handover note/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save handover entry/i })).not.toBeInTheDocument();
  });
});