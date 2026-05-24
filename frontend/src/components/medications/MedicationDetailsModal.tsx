import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Medication } from '../../api/medications/medications.types';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getMedicationAdditionalDetails } from '../../utils/medicationAdditionalDetails';

interface MedicationDetailsModalProps {
  medication: Medication | null;
  open: boolean;
  onClose: () => void;
}

export default function MedicationDetailsModal({
  medication,
  open,
  onClose,
}: MedicationDetailsModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const modalVariants = shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS;
  const details = medication ? getMedicationAdditionalDetails(medication) : [];

  return (
    <AnimatePresence>
      {open && medication && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4"
          role="presentation"
          variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_BACKDROP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITIONS.modal}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="medication-details-title"
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border bg-white p-5 shadow-xl"
            style={{ borderColor: 'var(--color-border)' }}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITIONS.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="medication-details-title"
                  className="text-lg font-extrabold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {medication.medicationName}
                </h2>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Additional details
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border p-1.5"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {details.length === 0 ? (
              <p className="mt-5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                No additional details have been recorded for this medication.
              </p>
            ) : (
              <dl className="mt-5 space-y-4">
                {details.map((row) => (
                  <div key={row.label}>
                    <dt className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                      {row.label}
                    </dt>
                    <dd
                      className="mt-1 text-sm whitespace-pre-wrap"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-6 flex justify-end">
              <motion.button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border px-4 text-xs font-bold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
