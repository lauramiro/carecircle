import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: supabaseMock,
}));

import {
  createJournalEntry,
  getJournalEntriesByGroup,
  updateJournalEntry,
} from './journal.service';

describe('journal service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads journal entries in reverse chronological order', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'entry-2',
          group_id: 'group-001',
          author_id: 'user-2',
          content: 'Second shift update',
          created_at: '2025-05-12T12:00:00.000Z',
          updated_at: '2025-05-12T12:00:00.000Z',
          author: { full_name: 'John Doe' },
        },
        {
          id: 'entry-1',
          group_id: 'group-001',
          author_id: 'user-1',
          content: 'First shift update',
          created_at: '2025-05-12T09:00:00.000Z',
          updated_at: '2025-05-12T09:00:00.000Z',
          author: { full_name: 'Sarah Doe' },
        },
      ],
      error: null,
    });

    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ select });

    const entries = await getJournalEntriesByGroup('group-001');

    expect(supabaseMock.from).toHaveBeenCalledWith('handover_journal_entries');
    expect(eq).toHaveBeenCalledWith('group_id', 'group-001');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(entries.map((entry) => entry.id)).toEqual(['entry-2', 'entry-1']);
    expect(entries[0]).toMatchObject({
      authorName: 'John Doe',
      content: 'Second shift update',
    });
  });

  it('creates a journal entry for the authenticated user', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'entry-3',
        group_id: 'group-001',
        author_id: 'user-123',
        content: 'New handover note',
        created_at: '2025-05-12T14:00:00.000Z',
        updated_at: '2025-05-12T14:00:00.000Z',
        author: { full_name: 'Alex Carer' },
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    supabaseMock.from.mockReturnValue({ insert });

    const entry = await createJournalEntry('group-001', 'New handover note');

    expect(insert).toHaveBeenCalledWith({
      group_id: 'group-001',
      author_id: 'user-123',
      content: 'New handover note',
    });
    expect(entry).toMatchObject({
      id: 'entry-3',
      authorName: 'Alex Carer',
      content: 'New handover note',
    });
  });

  it('updates a journal entry for the authenticated author', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'entry-3',
        group_id: 'group-001',
        author_id: 'user-123',
        content: 'Corrected handover note',
        created_at: '2025-05-12T14:00:00.000Z',
        updated_at: '2025-05-12T14:12:00.000Z',
        author: { full_name: 'Alex Carer' },
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eqAuthor = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqAuthor });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    supabaseMock.from.mockReturnValue({ update });

    const entry = await updateJournalEntry('entry-3', 'Corrected handover note');

    expect(update).toHaveBeenCalledWith({ content: 'Corrected handover note' });
    expect(eqId).toHaveBeenCalledWith('id', 'entry-3');
    expect(eqAuthor).toHaveBeenCalledWith('author_id', 'user-123');
    expect(entry).toMatchObject({
      id: 'entry-3',
      content: 'Corrected handover note',
      updatedAt: '2025-05-12T14:12:00.000Z',
    });
  });
});