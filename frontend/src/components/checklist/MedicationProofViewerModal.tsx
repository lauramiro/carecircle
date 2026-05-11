import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '@lib/animation.constants';

interface MedicationProofViewerModalProps {
  open: boolean;
  shouldReduceMotion: boolean;
  medicationName: string;
  doseText: string;
  localConfirmationTime: string;
  caregiverName: string;
  photoUrl: string | null;
  loading: boolean;
  onClose: () => void;
}

export default function MedicationProofViewerModal({
  open,
  shouldReduceMotion,
  medicationName,
  doseText,
  localConfirmationTime,
  caregiverName,
  photoUrl,
  loading,
  onClose,
}: MedicationProofViewerModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
          onClick={onClose}
          variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_BACKDROP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITIONS.modal}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Medication confirmation photo"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-white shadow-xl"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={(event) => event.stopPropagation()}
            drag={shouldReduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITIONS.modal}
          >
            <button
              type="button"
              aria-label="Close photo viewer"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-full p-2"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                color: 'white',
              }}
            >
              <XIcon size={16} />
            </button>

            <div className="bg-slate-100">
              {loading ? (
                <div
                  className="flex h-[360px] items-center justify-center text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Loading confirmation photo...
                </div>
              ) : photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`Proof for ${medicationName}`}
                  className="h-[360px] w-full object-contain"
                />
              ) : (
                <div
                  className="flex h-[360px] items-center justify-center text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  No photo found for this confirmation.
                </div>
              )}
            </div>

            <div className="space-y-2 p-4">
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {medicationName} · {doseText}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Confirmed by: {caregiverName}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Confirmed at: {localConfirmationTime}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
