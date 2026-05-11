import type { MedicationStatus } from '@lib/checklist';

export const STATUS_STYLES: Record<MedicationStatus, { bg: string; color: string; label: string }> = {
  due: { bg: 'var(--color-status-given-bg)', color: 'var(--color-status-given)', label: 'Due' },
  given: { bg: 'var(--color-status-given-bg)', color: 'var(--color-status-given)', label: 'Given' },
  overdue: { bg: 'var(--color-status-overdue-bg)', color: 'var(--color-status-overdue)', label: 'Overdue' },
  skipped: { bg: 'var(--color-status-skipped-bg)', color: 'var(--color-status-skipped)', label: 'Skipped' },
};

export const TIME_WINDOWS = [
  { id: 'morning', label: 'Morning', hours: [0, 11] },
  { id: 'afternoon', label: 'Afternoon', hours: [12, 17] },
  { id: 'evening', label: 'Evening', hours: [18, 20] },
  { id: 'night', label: 'Night', hours: [21, 23] },
];

export const CHECKLIST_PROOF_BUCKET = 'medication-proofs';
