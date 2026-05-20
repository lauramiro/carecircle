import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { BookText } from 'lucide-react';
import { useGroupDetail } from '../../hooks/groups/useGroupDetail';
import { useJournalEntries } from '../../hooks/journal/useJournalEntries';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatLocalDateTime } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/helper';

export default function GroupJournalPage() {
  const { groupId } = useParams();
  const { group, loading: groupLoading, error: groupError } = useGroupDetail(groupId);
  const {
    entries,
    loading: entriesLoading,
    error: entriesError,
    isSubmitting,
    addEntry,
  } = useJournalEntries(groupId);
  const shouldReduceMotion = useReducedMotion();
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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

  const isObserver = group.role === 'Observer';

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
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border bg-white p-5"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {entry.authorName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatLocalDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {entry.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}