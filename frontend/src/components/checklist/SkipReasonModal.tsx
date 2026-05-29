import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import type { ChecklistItemPatch } from '@api/checklist/checklist.types';
import { skipChecklistItem } from '@api/checklist/dailyChecklist.service';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';

const SKIP_REASONS = [
  { value: '', label: 'Select a reason' },
  { value: 'not_available', label: 'Medication not available' },
  { value: 'refused', label: 'Recipient refused' },
  { value: 'administered_elsewhere', label: 'Administered by someone else' },
  { value: 'other', label: 'Other reason' },
] as const;

interface SkipReasonModalProps {
  itemId: string;
  medicationName: string;
  open: boolean;
  onSkipped: (patch: ChecklistItemPatch) => void;
  onCancel: () => void;
}

export default function SkipReasonModal({
  itemId,
  medicationName,
  open,
  onSkipped,
  onCancel,
}: SkipReasonModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (!open) return null;

  function handleCancel() {
    setReason('');
    setNotes('');
    setReasonError(null);
    onCancel();
  }

  async function handleSubmit() {
    if (!reason) {
      setReasonError('Please select a reason.');
      return;
    }

    setSubmitting(true);
    try {
      const patch = await skipChecklistItem({ itemId, reason, notes });
      toast.success(`${medicationName} marked as skipped.`);
      setReason('');
      setNotes('');
      onSkipped(patch);
    } catch {
      toast.error('Could not skip medication. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          variants={shouldReduceMotion ? undefined : MODAL_BACKDROP_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-reason-title"
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl"
            style={{ borderColor: 'var(--color-border)' }}
            variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS}
            transition={TRANSITIONS.modal}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="skip-reason-title"
                  className="text-xl font-extrabold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Skip Medication
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Why is <strong>{medicationName}</strong> being skipped?
                </p>
              </div>
              <button
                type="button"
                aria-label="Close skip modal"
                onClick={handleCancel}
                className="rounded-full p-2"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <XIcon size={16} strokeWidth={1.9} />
              </button>
            </div>

            {/* Reason dropdown */}
            <div className="mt-6">
              <label
                htmlFor="skip-reason"
                className="text-xs font-bold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Reason <span style={{ color: 'var(--color-status-critical)' }}>*</span>
              </label>
              <select
                id="skip-reason"
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  setReasonError(null);
                }}
                className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none"
                style={{
                  borderColor: reasonError
                    ? 'var(--color-status-critical)'
                    : 'var(--color-border)',
                  color: reason ? 'var(--color-text-primary)' : 'var(--color-text-hint)',
                }}
              >
                {SKIP_REASONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {reasonError && (
                <p
                  className="mt-2 text-xs"
                  style={{ color: 'var(--color-status-critical)' }}
                >
                  {reasonError}
                </p>
              )}
            </div>

            {/* Optional notes */}
            <div className="mt-4">
              <label
                htmlFor="skip-notes"
                className="text-xs font-bold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Additional notes{' '}
                <span style={{ color: 'var(--color-text-hint)' }}>(optional)</span>
              </label>
              <textarea
                id="skip-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context..."
                rows={3}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-lg border px-4 text-sm font-bold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-status-overdue)' }}
              >
                {submitting ? 'Skipping...' : 'Skip medication'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}