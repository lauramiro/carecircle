import type { ReactNode } from 'react';
import { formatDate } from '../../utils/formatters';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  showDate?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  showDate = false,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className="mb-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: 'var(--color-text-hint)' }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {showDate ? (
          <div
            className="rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {formatDate(new Date().toISOString())}
          </div>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
