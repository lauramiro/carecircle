import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import type { GPContact } from '../../api/groups/groups.types';
import {
  CARD_VARIANTS,
  DROPDOWN_VARIANTS,
  STATIC_CARD_VARIANTS,
  STATIC_DROPDOWN_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import GPContactForm from './GPContactForm';

interface GPContactCardProps {
  contact: GPContact;
  canManage: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  onUpdate: (gpId: string, data: Omit<GPContact, 'id'>) => Promise<unknown>;
  onRemove: (gpId: string) => Promise<void>;
}

function FieldValue({ value }: { value?: string }) {
  if (!value) {
    return (
      <span className="italic" style={{ color: 'var(--color-text-hint)' }}>
        Not provided
      </span>
    );
  }

  return <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>;
}

export default function GPContactCard({
  contact,
  canManage,
  isUpdating,
  isRemoving,
  onUpdate,
  onRemove,
}: GPContactCardProps) {
  const [mode, setMode] = useState<'read' | 'edit' | 'confirmRemove'>('read');
  const shouldReduceMotion = useReducedMotion();
  const cardVariants = shouldReduceMotion ? STATIC_CARD_VARIANTS : CARD_VARIANTS;
  const formVariants = shouldReduceMotion
    ? STATIC_DROPDOWN_VARIANTS
    : DROPDOWN_VARIANTS;

  async function handleUpdate(data: Omit<GPContact, 'id'>) {
    try {
      await onUpdate(contact.id, data);
      toast.success('GP contact updated successfully');
      setMode('read');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  async function handleRemove() {
    try {
      await onRemove(contact.id);
      toast.success('GP contact removed');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  return (
    // Card entrance helps newly added GP contacts land in context.
    <motion.article
      layout
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={TRANSITIONS.card}
      className="rounded-xl border bg-white p-4"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold">GP Contact</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            General practitioner information for this care circle.
          </p>
        </div>

        {canManage && mode === 'read' && (
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={() => setMode('edit')}
              className="h-8 rounded-lg border px-3 text-xs font-bold"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-primary)',
              }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              Edit
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setMode('confirmRemove')}
              className="h-8 rounded-lg border px-3 text-xs font-bold"
              style={{
                borderColor: 'var(--color-status-critical)',
                color: 'var(--color-status-critical)',
              }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              Remove
            </motion.button>
          </div>
        )}
      </div>

      {mode === 'edit' ? (
        // Height animation keeps inline edit mode from feeling abrupt.
        <motion.div
          className="mt-4 overflow-hidden"
          variants={formVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITIONS.dropdown}
        >
          <GPContactForm
            contact={contact}
            submitLabel="Save"
            isSubmitting={isUpdating}
            onSubmit={handleUpdate}
            onCancel={() => setMode('read')}
          />
        </motion.div>
      ) : mode === 'confirmRemove' ? (
        <div
          className="mt-4 rounded-lg border p-4"
          style={{
            borderColor: 'var(--color-status-critical)',
            backgroundColor: 'var(--color-status-critical-bg)',
          }}
        >
          <p className="text-sm font-bold" style={{ color: 'var(--color-status-critical)' }}>
            Are you sure?
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            This GP contact will be removed from the group.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <motion.button
              type="button"
              onClick={() => setMode('read')}
              className="h-8 rounded-lg border px-3 text-xs font-bold"
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
              onClick={() => void handleRemove()}
              disabled={isRemoving}
              className="h-8 rounded-lg px-3 text-xs font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-status-critical)' }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            >
              {isRemoving ? 'Removing...' : 'Confirm'}
            </motion.button>
          </div>
        </div>
      ) : (
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              GP Name
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              <FieldValue value={contact.gpName} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Phone Number
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              <FieldValue value={contact.phoneNumber} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Practice Name
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              <FieldValue value={contact.practiceName} />
            </dd>
          </div>
        </dl>
      )}
    </motion.article>
  );
}
