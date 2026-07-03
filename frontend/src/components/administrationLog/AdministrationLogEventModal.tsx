import { AnimatePresence, motion } from 'framer-motion';
import type { AdministrationLogEvent } from '../../api/administrationLog/administrationLog.types';
import {
  administrationLogDisplayStatusLabel,
  formatAdministrationLogScheduledTime,
} from '../../utils/administrationLog.utils';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { XIcon } from 'lucide-react';

interface AdministrationLogEventModalProps {
  event: AdministrationLogEvent | null;
  onClose: () => void;
  localTimestampLabel: string;
}

export default function AdministrationLogEventModal({
  event,
  onClose,
  localTimestampLabel,
}: AdministrationLogEventModalProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4"
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
            aria-label="Medication event detail"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl"
            style={{ borderColor: 'var(--color-border)' }}
            onClick={(e) => e.stopPropagation()}
            variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITIONS.modal}
          >
            <button
              type="button"
              aria-label="Close"
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
              {event.photoFullUrl ? (
                <img
                  src={event.photoFullUrl}
                  alt=""
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <div
                  className="flex min-h-[200px] items-center justify-center px-6 py-12 text-center text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  No photo is stored for this event. Details are shown below.
                </div>
              )}
            </div>

            <div className="space-y-2 p-4">
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {event.medicationName} · {event.doseDisplay}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {administrationLogDisplayStatusLabel(event)} · {localTimestampLabel}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Carer: {event.carerName}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Scheduled: {formatAdministrationLogScheduledTime(event.scheduledTimeLabel)}
              </p>
              {event.checklistDate && (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Checklist day: {event.checklistDate}
                </p>
              )}
              {event.notes ? (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Notes: {event.notes}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
