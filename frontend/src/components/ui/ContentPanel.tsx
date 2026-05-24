import type { ReactNode } from 'react';

interface ContentPanelProps {
  children: ReactNode;
  tone?: 'default' | 'error';
}

export function ContentPanel({ children, tone = 'default' }: ContentPanelProps) {
  return (
    <div
      className="rounded-xl border bg-white p-6 text-sm"
      style={{
        borderColor: tone === 'error' ? 'var(--color-status-critical)' : 'var(--color-border)',
        backgroundColor: tone === 'error' ? 'var(--color-status-critical-bg)' : 'var(--color-card)',
        color: tone === 'error' ? 'var(--color-status-critical)' : 'var(--color-text-secondary)',
      }}
    >
      {children}
    </div>
  );
}

export function LoadingPanel({ message }: { message: string }) {
  return <ContentPanel>{message}</ContentPanel>;
}

export function ErrorPanel({ message }: { message: string }) {
  return <ContentPanel tone="error">{message}</ContentPanel>;
}
