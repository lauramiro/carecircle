import { supabase } from '../../lib/supabaseClient';
import type { JournalEntry } from './journal.types';

type JournalEntryRow = {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { full_name: string | null } | null;
};

function mapJournalEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.author_id,
    authorName: row.author?.full_name?.trim() || 'Unknown carer',
    content: row.content,
    createdAt: row.created_at,
  };
}

const journalEntrySelect = `
  id,
  group_id,
  author_id,
  content,
  created_at,
  author:profiles!handover_journal_entries_author_id_fkey (
    full_name
  )
`;

export async function getJournalEntriesByGroup(groupId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('handover_journal_entries')
    .select(journalEntrySelect)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as JournalEntryRow[]).map(mapJournalEntry);
}

export async function createJournalEntry(
  groupId: string,
  content: string,
): Promise<JournalEntry> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('handover_journal_entries')
    .insert({
      group_id: groupId,
      author_id: user.id,
      content,
    })
    .select(journalEntrySelect)
    .single();

  if (error) throw new Error(error.message);
  return mapJournalEntry(data as unknown as JournalEntryRow);
}