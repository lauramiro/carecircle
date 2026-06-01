import { Link } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { useMedicationSummary } from '@hooks/dashboard/useMedicationSummary';

interface MedicationSummaryWidgetProps {
  groupId: string;
  patientId: string;
  groupName: string;
}

interface StatCellProps {
  label: string;
  value: number;
  color: string;
}

function StatCell({ label, value, color }: StatCellProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <span className="mt-1 text-2xl font-extrabold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default function MedicationSummaryWidget({ groupId, patientId, groupName }: MedicationSummaryWidgetProps) {
  const { summary, loading, error } = useMedicationSummary(patientId, groupId);
  const today = new Date().toISOString().slice(0, 10);
  const overdueChecklistUrl = `/groups/${groupId}/checklist?filter=overdue&date=${today}`;

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
          <Pill size={16} strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Today's Medications
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
            {groupName}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          Loading medication data…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error}
        </p>
      )}

      {!loading && !error && summary.total === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          No medications scheduled for today.
        </p>
      )}

      {!loading && !error && summary.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCell label="Due today" value={summary.total} color="var(--color-text-primary)" />
          <StatCell label="Given" value={summary.given} color="var(--color-status-given)" />
          <div className="flex flex-col">
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Overdue
            </span>
            {summary.overdue > 0 ? (
              <Link
                to={overdueChecklistUrl}
                className="mt-1 text-2xl font-extrabold no-underline hover:underline"
                style={{ color: 'var(--color-status-overdue)' }}
                aria-label={`${summary.overdue} overdue medication${summary.overdue !== 1 ? 's' : ''} — view checklist`}
              >
                {summary.overdue}
              </Link>
            ) : (
              <span className="mt-1 text-2xl font-extrabold" style={{ color: 'var(--color-text-hint)' }}>
                0
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
