import { Loader2 } from 'lucide-react';

export default function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-lg px-4 py-3 flex items-center gap-2"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Loader2
          size={18}
          style={{ color: 'var(--color-primary)' }}
          className="animate-spin"
        />
        <p
          className="text-sm"
          style={{
            color: 'var(--color-text-secondary)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
        >
          Care Assistant is thinking...
        </p>
      </div>
    </div>
  );
}
