import type { ChecklistDoseStatus } from '@lib/checklist';

export const STATUS_STYLES: Record<ChecklistDoseStatus, { bg: string; color: string; label: string }> = {
  due: { bg: 'var(--color-status-given-bg)', color: 'var(--color-status-given)', label: 'Due' },
  given: { bg: 'var(--color-status-given-bg)', color: 'var(--color-status-given)', label: 'Given' },
  overdue: { bg: 'var(--color-status-overdue-bg)', color: 'var(--color-status-overdue)', label: 'Overdue' },
  skipped: { bg: 'var(--color-status-skipped-bg)', color: 'var(--color-status-skipped)', label: 'Skipped' },
};

export const CHECKLIST_PROOF_BUCKET = 'medication-proofs';
