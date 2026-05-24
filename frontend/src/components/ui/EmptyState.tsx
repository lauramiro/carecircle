import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="rounded-2xl border bg-white px-6 py-10 text-center"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
      >
        {icon}
      </div>
      <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
