import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useInviteMember } from '../../hooks/groups/useInviteMember';
import {
  MODAL_BACKDROP_VARIANTS,
  MODAL_PANEL_VARIANTS,
  STATIC_MODAL_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface InviteMemberModalProps {
  groupId: string;
  open: boolean;
  onClose: () => void;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }

  return null;
}

export default function InviteMemberModal({
  groupId,
  open,
  onClose,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const { inviting, sendInvite } = useInviteMember(groupId);
  const shouldReduceMotion = useReducedMotion();
  const modalVariants = shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_PANEL_VARIANTS;

  async function handleSubmit() {
    const validationError = validateEmail(email);
    setEmailError(validationError);
    if (validationError) return;

    try {
      await sendInvite(email);
      toast.success(`Invite sent to ${email}`);
      setEmail('');
      onClose();
    } catch {
      toast.error('Could not send invite. Please try again.');
    }
  }

  function handleCancel() {
    setEmail('');
    setEmailError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        // Backdrop fade helps focus attention on the modal task.
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4"
          role="presentation"
          variants={shouldReduceMotion ? STATIC_MODAL_VARIANTS : MODAL_BACKDROP_VARIANTS}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITIONS.modal}
        >
          {/* Panel motion makes modal appearance feel intentional without being flashy. */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-member-title"
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl"
            style={{ borderColor: 'var(--color-border)' }}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITIONS.modal}
          >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-member-title" className="text-xl font-extrabold">
              Invite Member
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Send an invitation to join this care circle.
            </p>
          </div>
          <motion.button
            type="button"
            aria-label="Close invite modal"
            onClick={handleCancel}
            className="rounded-full p-2"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            <X size={16} strokeWidth={1.9} />
          </motion.button>
        </div>

        <div className="mt-6">
          <label
            htmlFor="invite-email"
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Email address
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
            }}
            placeholder="john@example.com"
            className="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: emailError
                ? 'var(--color-status-critical)'
                : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {emailError && (
            <p className="mt-2 text-xs" style={{ color: 'var(--color-status-critical)' }}>
              {emailError}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <motion.button
            type="button"
            onClick={handleCancel}
            className="h-10 rounded-lg border px-4 text-sm font-bold"
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
            onClick={() => void handleSubmit()}
            disabled={inviting}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </motion.button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
