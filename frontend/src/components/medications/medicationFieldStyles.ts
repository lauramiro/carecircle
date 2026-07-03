import type { CSSProperties } from 'react';

export const medicationFieldClassName =
  'medication-form-field mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none';

export const medicationTextareaClassName =
  'medication-form-field mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none';

export function medicationFieldStyle(hasError: boolean): CSSProperties {
  return {
    borderColor: hasError ? 'var(--color-status-critical)' : 'var(--color-border)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-input-bg)',
  };
}
