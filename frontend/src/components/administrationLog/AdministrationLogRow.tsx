import type { AdministrationLogEvent } from '../../api/administrationLog/administrationLog.types';
import { administrationLogStatusLabel } from '../../utils/administrationLog.utils';
import { ImageIcon } from 'lucide-react';

const STATUS_STYLES: Record<
  AdministrationLogEvent['status'],
  { bg: string; color: string }
> = {
  given: { bg: '#E8F5E9', color: '#2E7D32' },
  skipped: { bg: 'var(--color-status-skipped-bg)', color: 'var(--color-status-skipped)' },
  overdue: { bg: 'var(--color-status-critical-bg)', color: 'var(--color-status-critical)' },
};

interface AdministrationLogRowProps {
  event: AdministrationLogEvent;
  localTimestampLabel: string;
  onOpen: () => void;
}

export default function AdministrationLogRow({ event, localTimestampLabel, onOpen }: AdministrationLogRowProps) {
  const badge = STATUS_STYLES[event.status];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left transition hover:bg-slate-50/80"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-accent-soft)' }}
      >
        {event.photoThumbnailUrl ? (
          <img src={event.photoThumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={22} strokeWidth={1.8} style={{ color: 'var(--color-text-hint)' }} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {event.medicationName}
        </p>
        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {event.doseDisplay} · {localTimestampLabel} · {event.carerName}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
        style={{ backgroundColor: badge.bg, color: badge.color }}
      >
        {administrationLogStatusLabel(event.status)}
      </span>
    </button>
  );
}
