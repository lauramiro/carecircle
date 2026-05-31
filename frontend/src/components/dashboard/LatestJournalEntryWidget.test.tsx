import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LatestJournalEntryWidget from './LatestJournalEntryWidget';
import type { JournalEntry } from '../../api/journal/journal.types';

const hookMock = vi.hoisted(() => ({
  value: {
    entry: null as JournalEntry | null,
    loading: false,
    error: null as string | null,
  },
}));

vi.mock('@hooks/dashboard/useLatestJournalEntry', () => ({
  useLatestJournalEntry: () => hookMock.value,
}));

const BASE_ENTRY: JournalEntry = {
  id: 'entry-1',
  groupId: 'g1',
  authorId: 'user-1',
  authorName: 'Jane Doe',
  content: 'Patient had a quiet morning. Took all medications on time. Appetite was good at lunch.',
  createdAt: '2026-05-27T08:00:00.000Z',
  updatedAt: '2026-05-27T08:00:00.000Z',
};

function renderWidget() {
  return render(
    <MemoryRouter>
      <LatestJournalEntryWidget groupId="g1" groupName="Dad Care Circle" />
    </MemoryRouter>,
  );
}

describe('LatestJournalEntryWidget', () => {
  beforeEach(() => {
    hookMock.value = { entry: null, loading: false, error: null };
  });

  it('shows the widget title and group name', () => {
    renderWidget();
    expect(screen.getByText('Latest Journal Entry')).toBeInTheDocument();
    expect(screen.getByText('Dad Care Circle')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    hookMock.value = { entry: null, loading: true, error: null };
    renderWidget();
    expect(screen.getByText('Loading journal entry…')).toBeInTheDocument();
  });

  it('shows error state', () => {
    hookMock.value = { entry: null, loading: false, error: 'Failed to load journal entry.' };
    renderWidget();
    expect(screen.getByText('Failed to load journal entry.')).toBeInTheDocument();
  });

  it('shows empty state when no entries exist', () => {
    renderWidget();
    expect(screen.getByText('No journal entries yet.')).toBeInTheDocument();
  });

  it('shows author name and truncated snippet', () => {
    hookMock.value = { entry: BASE_ENTRY, loading: false, error: null };
    renderWidget();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    // Full content is 88 chars — no truncation needed
    expect(screen.getByText(/Patient had a quiet morning/)).toBeInTheDocument();
  });

  it('truncates snippet at 100 characters', () => {
    const longContent = 'A'.repeat(150);
    hookMock.value = {
      entry: { ...BASE_ENTRY, content: longContent },
      loading: false,
      error: null,
    };
    renderWidget();
    const snippet = screen.getByText(/A+…/);
    expect(snippet.textContent).toHaveLength(100);
  });

  it('renders the entry as a link to the journal page', () => {
    hookMock.value = { entry: BASE_ENTRY, loading: false, error: null };
    renderWidget();
    const link = screen.getByRole('link', { name: /open journal entry/i });
    expect(link).toHaveAttribute('href', '/groups/g1/journal');
  });
});
