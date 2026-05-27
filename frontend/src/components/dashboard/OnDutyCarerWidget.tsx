import { User, AlertTriangle } from 'lucide-react';
import { useOnDutyCarer } from '@hooks/dashboard/useOnDutyCarer';

interface OnDutyCarerWidgetProps {
  groupId: string;
  groupName: string;
}

export default function OnDutyCarerWidget({ groupId, groupName }: OnDutyCarerWidgetProps) {
  const { carerName, shiftEnd, noCarerAssigned, loading, error } = useOnDutyCarer(groupId);

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
          <User size={16} strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            On Duty
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
            {groupName}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-text-hint)' }}>
          Loading shift data…
        </p>
      )}

      {!loading && error && (
        <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
          {error}
        </p>
      )}

      {!loading && !error && noCarerAssigned && (
        <div
          className="flex items-start gap-2 rounded-lg p-3"
          style={{
            backgroundColor: 'var(--color-status-overdue-bg, #FEF3E2)',
            color: 'var(--color-status-overdue)',
          }}
        >
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold">No carer assigned</p>
            <p className="text-xs">No shift is currently covered for this care circle.</p>
          </div>
        </div>
      )}

      {!loading && !error && carerName && (
        <div>
          <p className="text-base font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            {carerName}
          </p>
          {shiftEnd && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Shift ends at {shiftEnd}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
