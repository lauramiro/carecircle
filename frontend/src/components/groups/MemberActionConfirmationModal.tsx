interface MemberActionConfirmationModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function MemberActionConfirmationModal({
  open,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: MemberActionConfirmationModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-action-title"
        className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-xl"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 id="member-action-title" className="text-lg font-extrabold">
          {title}
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border px-4 text-xs font-bold"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-lg px-4 text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
