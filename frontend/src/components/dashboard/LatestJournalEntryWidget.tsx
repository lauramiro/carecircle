import { NotebookText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLatestJournalEntry } from '@hooks/dashboard/useLatestJournalEntry';
import { truncateText } from '../../utils/formatters';

interface LatestJournalEntryWidgetProps {
  groupId: string;
  groupName: string;
}

const SNIPPET_LENGTH = 100;

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LatestJournalEntryWidget({ groupId, groupName }: LatestJournalEntryWidgetProps) {
  const { entry, loading, error } = useLatestJournalEntry(groupId);
  const journalUrl = `/groups/${groupId}/journal`;

  return (
    <article
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          <NotebookText size={16} strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Latest Journal Entry
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
            {groupName}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          Loading journal entry…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error}
        </p>
      )}

      {!loading && !error && !entry && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No journal entries yet.
        </p>
      )}

      {!loading && !error && entry && (
        <Link
          to={journalUrl}
          className="block rounded-lg no-underline"
          aria-label="Open journal entry"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {entry.authorName}
            </p>
            <p className="shrink-0 text-xs" style={{ color: 'var(--color-text-hint)' }}>
              {formatEntryDate(entry.createdAt)}
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {truncateText(entry.content, SNIPPET_LENGTH)}
          </p>
        </Link>
      )}
    </article>
  );
}
