import { AnimatePresence, motion } from 'framer-motion';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface MemberActionConfirmationModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function MemberActionConfirmationModal({
  open,
  title,
  message,
  confirmLabel,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: MemberActionConfirmationModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const modalVariants = shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS;

  return (
    <AnimatePresence>
      {open && (
        // Backdrop fade keeps destructive action confirmation calm and clear.
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4"
          role="presentation"
          variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_BACKDROP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITIONS.modal}
        >
          {/* Panel motion reinforces that the user is entering a confirmation step. */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-action-title"
            className="w-full max-w-sm rounded-2xl border bg-white p-5 shadow-xl"
            style={{ borderColor: 'var(--color-border)' }}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITIONS.modal}
          >
            <h2 id="member-action-title" className="text-lg font-extrabold">
              {title}
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <motion.button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="h-9 rounded-lg border px-4 text-xs font-bold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className="h-9 rounded-lg px-4 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
