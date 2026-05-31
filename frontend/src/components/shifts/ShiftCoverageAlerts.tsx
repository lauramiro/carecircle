import { AlertTriangle, ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SHIFT_SLOTS } from '../../api/shifts/shift.types';
import type { ShiftWarningSummary } from '../../api/shifts/shift.types';

const SESSIONS_PER_WEEK = 7 * SHIFT_SLOTS.length;

interface ShiftCoverageAlertsProps {
  warnings: ShiftWarningSummary[];
  loading: boolean;
  error: string | null;
}

export default function ShiftCoverageAlerts({
  warnings,
  loading,
  error,
}: ShiftCoverageAlertsProps) {
  return (
    <section
      className="rounded-2xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: 'var(--color-status-overdue-bg)',
              color: 'var(--color-status-overdue)',
            }}
          >
            <CalendarDays size={20} strokeWidth={1.9} />
          </span>
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-wide"
              style={{ color: 'var(--color-text-hint)' }}
            >
              Weekly roster
            </p>
            <h2 className="text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              Shift coverage gaps
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Sessions you still need to assign as primary carer this week.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--color-text-hint)' }}>
          Checking weekly coverage…
        </p>
      ) : error ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error}
        </p>
      ) : warnings.length === 0 ? (
        <p
          className="mt-4 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-muted)',
            color: 'var(--color-text-secondary)',
          }}
        >
          All sessions are covered this week in the groups you manage.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {warnings.map((warning) => {
            const coveredCount = SESSIONS_PER_WEEK - warning.unassignedCount;

            return (
              <li
                key={warning.groupId}
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-muted)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {warning.groupName}
                    </p>
                    <div
                      className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: 'var(--color-status-overdue-bg)',
                        color: 'var(--color-status-overdue)',
                      }}
                    >
                      <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold">
                          {warning.unassignedCount} of {SESSIONS_PER_WEEK} sessions need coverage
                        </p>
                        <p className="mt-0.5 text-xs opacity-90">
                          {coveredCount === 0
                            ? 'No carers assigned yet this week.'
                            : `${coveredCount} session${coveredCount === 1 ? '' : 's'} already covered.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/groups/${warning.groupId}/shifts`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold no-underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Assign shifts
                  <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
