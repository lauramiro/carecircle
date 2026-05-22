import type { KeyboardEvent } from 'react';
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

  function handleKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <tr
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="cursor-pointer border-b transition last:border-b-0 hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
      style={{
        borderColor: 'var(--color-border)',
        outlineColor: 'var(--color-primary)',
      }}
      aria-label={`${event.medicationName}, ${administrationLogStatusLabel(event.status)}, ${localTimestampLabel}`}
    >
      <td className="w-12 px-3 py-2">
        <div
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-accent-soft)' }}
        >
          {event.photoThumbnailUrl ? (
            <img src={event.photoThumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={16} strokeWidth={1.8} style={{ color: 'var(--color-text-hint)' }} aria-hidden />
          )}
        </div>
      </td>
      <td className="px-3 py-2 font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {event.medicationName}
      </td>
      <td className="whitespace-nowrap px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
        {event.doseDisplay}
      </td>
      <td className="max-w-[140px] truncate px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
        {event.carerName}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {localTimestampLabel}
      </td>
      <td className="px-3 py-2 text-right">
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {administrationLogStatusLabel(event.status)}
        </span>
      </td>
    </tr>
  );
}
