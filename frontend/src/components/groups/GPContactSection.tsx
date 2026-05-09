import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import type { GPContact, GroupRole } from '../../api/groups/groups.types';
import {
  DROPDOWN_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  STATIC_DROPDOWN_VARIANTS,
  STATIC_PAGE_VARIANTS,
  TRANSITIONS,
} from '../../lib/animation.constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import GPContactCard from './GPContactCard';
import GPContactForm from './GPContactForm';

interface GPContactSubmittingState {
  add: boolean;
  update: boolean;
  remove: boolean;
}

interface GPContactSectionProps {
  groupId: string;
  gpContacts: GPContact[];
  userRole: GroupRole;
  isSubmitting: GPContactSubmittingState;
  onAddGP: (data: Omit<GPContact, 'id'>) => Promise<unknown>;
  onUpdateGP: (gpId: string, data: Omit<GPContact, 'id'>) => Promise<unknown>;
  onRemoveGP: (gpId: string) => Promise<void>;
}

export default function GPContactSection({
  groupId,
  gpContacts,
  userRole,
  isSubmitting,
  onAddGP,
  onUpdateGP,
  onRemoveGP,
}: GPContactSectionProps) {
  const [addingContact, setAddingContact] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const canManageGPContacts = userRole === 'Admin';
  const containerVariants = shouldReduceMotion
    ? STATIC_PAGE_VARIANTS
    : STAGGER_CONTAINER_VARIANTS;
  const formVariants = shouldReduceMotion
    ? STATIC_DROPDOWN_VARIANTS
    : DROPDOWN_VARIANTS;

  async function handleAdd(data: Omit<GPContact, 'id'>) {
    try {
      await onAddGP(data);
      toast.success('GP contact added successfully');
      setAddingContact(false);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  return (
    <section
      className="mt-5 rounded-xl border bg-white p-4"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold">GP Contacts</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Keep general practitioner details close to the care plan.
          </p>
        </div>

        {canManageGPContacts && (
          <motion.button
            type="button"
            data-group-id={groupId}
            onClick={() => setAddingContact(true)}
            className="h-9 rounded-lg px-4 text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          >
            + Add GP Contact
          </motion.button>
        )}
      </div>

      {gpContacts.length === 0 && (
        <div
          className="mt-4 rounded-lg border p-4 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {canManageGPContacts
            ? 'No GP contacts added yet'
            : 'No GP contact information available'}
        </div>
      )}

      <motion.div
        className="mt-4 space-y-3"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence>
          {gpContacts.map((contact) => (
            <GPContactCard
              key={contact.id}
              contact={contact}
              canManage={canManageGPContacts}
              isUpdating={isSubmitting.update}
              isRemoving={isSubmitting.remove}
              onUpdate={onUpdateGP}
              onRemove={onRemoveGP}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {canManageGPContacts && addingContact && (
          // Height animation makes the optional add form feel attached to the section.
          <motion.div
            className="mt-4 overflow-hidden rounded-xl border p-4"
            style={{ borderColor: 'var(--color-border)' }}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITIONS.dropdown}
          >
            <GPContactForm
              submitLabel="Add GP Contact"
              isSubmitting={isSubmitting.add}
              onSubmit={handleAdd}
              onCancel={() => setAddingContact(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
