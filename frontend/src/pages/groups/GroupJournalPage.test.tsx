import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Group } from '../../api/groups/groups.types';
import type { JournalEntry } from '../../api/journal/journal.types';
import GroupJournalPage from './GroupJournalPage';

vi.setSystemTime(new Date('2025-05-12T09:30:00.000Z'));

const groupHookMock = vi.hoisted(() => ({
  value: {
    loading: false,
    error: null as string | null,
    group: {
      id: 'group-care-001',
      name: 'Dad Care Circle',
      description: 'Daily support and medication coordination for Dad.',
      role: 'Member' as const,
      canSchedule: true,
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
        updatedAt: '2025-05-12T09:00:00.000Z',
      },
    ] as JournalEntry[],
    loading: false,
    error: null as string | null,
    isSubmitting: false,
    updatingEntryId: null as string | null,
    addEntry: vi.fn().mockResolvedValue(undefined),
    editEntry: vi.fn().mockResolvedValue(undefined),
  },
}));

const authHookMock = vi.hoisted(() => ({
  value: {
    session: { user: { id: 'user-001' } },
    loading: false,
    signOut: vi.fn(),
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

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authHookMock.value,
}));

vi.mock('react-toastify', () => ({
  toast: toastMock,
}));

function renderPage(groupId = 'group-care-001') {
  return render(
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
        canSchedule: true,
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
          updatedAt: '2025-05-12T09:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      isSubmitting: false,
      updatingEntryId: null,
      addEntry: vi.fn().mockResolvedValue(undefined),
      editEntry: vi.fn().mockResolvedValue(undefined),
    };
    authHookMock.value = {
      session: { user: { id: 'user-001' } },
      loading: false,
      signOut: vi.fn(),
    };
  });

  it('renders existing handover entries and the write form for carers', () => {
    renderPage();

    expect(screen.getByText('Handover journal')).toBeInTheDocument();
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

  it('filters entries in real time and highlights keyword matches', async () => {
    const user = userEvent.setup();
    journalHookMock.value = {
      entries: [
        {
          id: 'entry-1',
          groupId: 'group-care-001',
          authorId: 'user-001',
          authorName: 'Sarah Doe',
          content: 'Medication given. GP call still needed tomorrow morning.',
          createdAt: '2025-05-12T09:00:00.000Z',
          updatedAt: '2025-05-12T09:00:00.000Z',
        },
        {
          id: 'entry-2',
          groupId: 'group-care-001',
          authorId: 'user-002',
          authorName: 'John Doe',
          content: 'Breakfast prepared and hydration completed.',
          createdAt: '2025-05-11T09:00:00.000Z',
          updatedAt: '2025-05-11T09:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      isSubmitting: false,
      updatingEntryId: null,
      addEntry: vi.fn().mockResolvedValue(undefined),
      editEntry: vi.fn().mockResolvedValue(undefined),
    };

    const { container } = renderPage();

    await user.type(screen.getByPlaceholderText(/search by keyword/i), 'Medication');

    expect(screen.getByText((_content, element) =>
      element?.textContent === 'Medication given. GP call still needed tomorrow morning.')).toBeInTheDocument();
    expect(screen.queryByText(/Breakfast prepared/i)).not.toBeInTheDocument();
    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0);
  });

  it('filters entries by date range alone or combined with keyword search', async () => {
    const user = userEvent.setup();
    journalHookMock.value = {
      entries: [
        {
          id: 'entry-1',
          groupId: 'group-care-001',
          authorId: 'user-001',
          authorName: 'Sarah Doe',
          content: 'Medication given. GP call still needed tomorrow morning.',
          createdAt: '2025-05-12T09:00:00.000Z',
          updatedAt: '2025-05-12T09:00:00.000Z',
        },
        {
          id: 'entry-2',
          groupId: 'group-care-001',
          authorId: 'user-002',
          authorName: 'John Doe',
          content: 'Medication stock counted for next week.',
          createdAt: '2025-05-10T09:00:00.000Z',
          updatedAt: '2025-05-10T09:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      isSubmitting: false,
      updatingEntryId: null,
      addEntry: vi.fn().mockResolvedValue(undefined),
      editEntry: vi.fn().mockResolvedValue(undefined),
    };

    renderPage();

    await user.type(screen.getByLabelText(/start date/i), '2025-05-11');
    expect(screen.getByText(/GP call still needed/i)).toBeInTheDocument();
    expect(screen.queryByText(/stock counted/i)).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search by keyword/i));
    await user.type(screen.getByPlaceholderText(/search by keyword/i), 'stock');
    expect(screen.getByText(/No matching handover entries/i)).toBeInTheDocument();
  });

  it('shows the edit window and lets the author edit their own recent entry', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText(/Editable until/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /edit entry/i }));

    const editor = screen.getByLabelText(/edit journal entry by sarah doe/i);
    await user.clear(editor);
    await user.type(editor, 'Medication given and GP called.');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(journalHookMock.value.editEntry).toHaveBeenCalledWith(
        'entry-1',
        'Medication given and GP called.',
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith('Handover entry updated');
  });

  it('shows the edited label and hides editing after the 60-minute window closes', () => {
    journalHookMock.value = {
      entries: [
        {
          id: 'entry-1',
          groupId: 'group-care-001',
          authorId: 'user-001',
          authorName: 'Sarah Doe',
          content: 'Medication given. GP call still needed tomorrow morning.',
          createdAt: '2025-05-12T07:00:00.000Z',
          updatedAt: '2025-05-12T07:20:00.000Z',
        },
      ],
      loading: false,
      error: null,
      isSubmitting: false,
      updatingEntryId: null,
      addEntry: vi.fn().mockResolvedValue(undefined),
      editEntry: vi.fn().mockResolvedValue(undefined),
    };

    renderPage();

    expect(screen.getByText('Edited')).toBeInTheDocument();
    expect(screen.getByText(/Edit window closed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit entry/i })).not.toBeInTheDocument();
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
        canSchedule: false,
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
    expect(screen.queryByRole('button', { name: /edit entry/i })).not.toBeInTheDocument();
  });
});