import { Fragment, useDeferredValue, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { BookText, Search } from 'lucide-react';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useJournalEntries } from '../../hooks/journal/useJournalEntries';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatLocalDateTime } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/helper';
import { useAuth } from '../../contexts/AuthContext';
import type { JournalEntry } from '../../api/journal/journal.types';

const JOURNAL_EDIT_WINDOW_MS = 60 * 60 * 1000;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const pattern = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const segments = text.split(pattern);

  return segments.map((segment, index) => {
    const matches = segment.localeCompare(query, undefined, { sensitivity: 'accent' }) === 0
      || segment.toLowerCase() === query.toLowerCase();

    return matches ? (
      <mark
        key={`${segment}-${index}`}
        style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
      >
        {segment}
      </mark>
    ) : (
      <Fragment key={`${segment}-${index}`}>{segment}</Fragment>
    );
  });
}

function isEditedEntry(entry: JournalEntry): boolean {
  return new Date(entry.updatedAt).getTime() > new Date(entry.createdAt).getTime();
}

function canEditEntry(entry: JournalEntry, currentUserId: string | undefined, now: number): boolean {
  if (!currentUserId || currentUserId !== entry.authorId) return false;
  return now - new Date(entry.createdAt).getTime() <= JOURNAL_EDIT_WINDOW_MS;
}

function getEditWindowLabel(entry: JournalEntry, currentUserId: string | undefined, now: number): string | null {
  if (!currentUserId || currentUserId !== entry.authorId) return null;

  const editDeadline = new Date(entry.createdAt).getTime() + JOURNAL_EDIT_WINDOW_MS;
  if (now <= editDeadline) {
    return `Editable until ${formatLocalDateTime(new Date(editDeadline).toISOString())}`;
  }

  return 'Edit window closed';
}

function matchesDateRange(entry: JournalEntry, startDate: string, endDate: string): boolean {
  const createdAt = new Date(entry.createdAt).getTime();

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    if (createdAt < start) return false;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`).getTime();
    if (createdAt > end) return false;
  }

  return true;
}

export default function GroupJournalPage() {
  const { groupId } = useParams();
  const { session } = useAuth();
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const {
    entries,
    loading: entriesLoading,
    error: entriesError,
    isSubmitting,
    updatingEntryId,
    addEntry,
    editEntry,
  } = useJournalEntries(groupId);
  const shouldReduceMotion = useReducedMotion();
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const now = Date.now();
  const currentUserId = session?.user?.id;
  const isObserver = group?.role === 'Observer';
  const filteredEntries = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.toLowerCase();

    return entries.filter((entry) => {
      const matchesQuery = !normalizedQuery
        || entry.content.toLowerCase().includes(normalizedQuery)
        || entry.authorName.toLowerCase().includes(normalizedQuery);

      return matchesQuery && matchesDateRange(entry, startDate, endDate);
    });
  }, [deferredSearchQuery, endDate, entries, startDate]);

  if (!groupId) return <Navigate to="/groups/list" replace />;

  if (groupLoading) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Handover Journal</h1>
        <div
          className="mt-6 rounded-xl border bg-white p-6 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Loading journal...
        </div>
      </section>
    );
  }

  if (groupError || !group) {
    return (
      <section>
        <h1 className="text-2xl font-extrabold">Handover Journal</h1>
        <div
          className="mt-6 rounded-xl border p-6 text-sm"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
            color: 'var(--color-status-critical)',
          }}
        >
          {groupError ?? 'Group not found.'}
        </div>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setFormError('Enter a handover note before saving.');
      return;
    }

    try {
      await addEntry(trimmedContent);
      setContent('');
      setFormError(null);
      toast.success('Handover entry saved');
    } catch (error) {
      setFormError(getErrorMessage(error) || 'Unable to save the handover entry.');
    }
  }

  async function handleEditSubmit(entryId: string) {
    const trimmedContent = editingContent.trim();
    if (!trimmedContent) {
      setEditError('Enter a handover note before saving changes.');
      return;
    }

    try {
      await editEntry(entryId, trimmedContent);
      setEditingEntryId(null);
      setEditingContent('');
      setEditError(null);
      toast.success('Handover entry updated');
    } catch (error) {
      setEditError(getErrorMessage(error) || 'Unable to update the handover entry.');
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            Handover Journal
          </h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Record shift handovers for {group.name} so the next carer can pick up quickly.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <article
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <BookText size={20} strokeWidth={1.9} color="var(--color-primary)" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                New handover entry
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Timestamped automatically when saved.
              </p>
            </div>
          </div>

          {isObserver ? (
            <div
              className="mt-4 rounded-lg border p-4 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Observers can review handover notes but cannot add new entries.
            </div>
          ) : (
            <form className="mt-4" onSubmit={handleSubmit}>
              <label
                htmlFor="handover-content"
                className="text-xs font-bold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Shift handover note
              </label>
              <textarea
                id="handover-content"
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  if (formError) setFormError(null);
                }}
                rows={7}
                className="mt-2 w-full rounded-lg border p-3 text-sm outline-none"
                style={{
                  borderColor: formError ? 'var(--color-status-critical)' : 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                placeholder="Summarise the shift, pending tasks, and anything the next carer should know."
              />
              {formError && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-status-critical)' }}>
                  {formError}
                </p>
              )}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 h-10 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                style={{ backgroundColor: 'var(--color-primary)' }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                {isSubmitting ? 'Saving...' : 'Save handover entry'}
              </motion.button>
            </form>
          )}
        </article>

        <div>
          <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[minmax(0,1fr)_180px_180px]" style={{ borderColor: 'var(--color-border)' }}>
            <label className="block">
              <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Search entries
              </span>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} color="var(--color-text-secondary)" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by keyword"
                  className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                End date
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </label>
          </div>

          {entriesError && (
            <div
              className="mb-4 rounded-xl border p-4 text-sm"
              style={{
                borderColor: 'var(--color-status-critical)',
                backgroundColor: 'var(--color-status-critical-bg)',
                color: 'var(--color-status-critical)',
              }}
            >
              {entriesError}
            </div>
          )}

          {entriesLoading ? (
            <div
              className="rounded-xl border bg-white p-6 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Loading entries...
            </div>
          ) : entries.length === 0 ? (
            <div
              className="rounded-xl border bg-white p-6 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              No handover entries yet.
            </div>
          ) : filteredEntries.length === 0 ? (
            <div
              className="rounded-xl border bg-white p-6 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              No matching handover entries.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const canEdit = !isObserver && canEditEntry(entry, currentUserId, now);
                const editWindowLabel = getEditWindowLabel(entry, currentUserId, now);
                const isEditing = editingEntryId === entry.id;
                const isEdited = isEditedEntry(entry);

                return (
                <article
                  key={entry.id}
                  className="rounded-xl border bg-white p-5"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {renderHighlightedText(entry.authorName, deferredSearchQuery)}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatLocalDateTime(entry.createdAt)}
                        {isEdited && (
                          <span
                            className="rounded-full px-2 py-0.5 font-bold"
                            style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                          >
                            Edited
                          </span>
                        )}
                      </p>
                      {editWindowLabel && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {editWindowLabel}
                        </p>
                      )}
                    </div>
                    {canEdit && !isEditing && (
                      <motion.button
                        type="button"
                        onClick={() => {
                          setEditingEntryId(entry.id);
                          setEditingContent(entry.content);
                          setEditError(null);
                        }}
                        className="h-9 rounded-lg border px-3 text-xs font-bold"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                      >
                        Edit entry
                      </motion.button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-3">
                      <textarea
                        aria-label={`Edit journal entry by ${entry.authorName}`}
                        value={editingContent}
                        onChange={(event) => {
                          setEditingContent(event.target.value);
                          if (editError) setEditError(null);
                        }}
                        rows={5}
                        className="w-full rounded-lg border p-3 text-sm outline-none"
                        style={{
                          borderColor: editError ? 'var(--color-status-critical)' : 'var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
                      />
                      {editError && (
                        <p className="mt-2 text-sm" style={{ color: 'var(--color-status-critical)' }}>
                          {editError}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <motion.button
                          type="button"
                          onClick={() => void handleEditSubmit(entry.id)}
                          disabled={updatingEntryId === entry.id}
                          className="h-10 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                        >
                          {updatingEntryId === entry.id ? 'Saving...' : 'Save changes'}
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => {
                            setEditingEntryId(null);
                            setEditingContent('');
                            setEditError(null);
                          }}
                          className="h-10 rounded-lg border px-4 text-sm font-bold"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {renderHighlightedText(entry.content, deferredSearchQuery)}
                    </p>
                  )}
                </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}