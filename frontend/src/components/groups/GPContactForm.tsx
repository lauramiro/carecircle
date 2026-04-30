import { type FormEvent, useId } from 'react';
import { motion } from 'framer-motion';
import type { GPContact } from '../../api/groups/groups.types';
import { useGPContactForm } from '../../hooks/groups/useGPContactForm';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface GPContactFormProps {
  contact?: GPContact;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (data: Omit<GPContact, 'id'>) => Promise<void>;
  onCancel: () => void;
}

export default function GPContactForm({
  contact,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: GPContactFormProps) {
  const formId = useId();
  const shouldReduceMotion = useReducedMotion();
  const { values, errors, updateField, validateField, validateForm, toPayload } =
    useGPContactForm(contact);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) return;

    await onSubmit(toPayload());
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor={`${formId}-gp-name`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            GP Name
          </label>
          <input
            id={`${formId}-gp-name`}
            type="text"
            value={values.gpName}
            onChange={(event) => updateField('gpName', event.target.value)}
            placeholder="Dr. Jane Smith"
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor={`${formId}-phone-number`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Phone Number
          </label>
          <input
            id={`${formId}-phone-number`}
            type="tel"
            value={values.phoneNumber}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
            onBlur={(event) => validateField('phoneNumber', event.target.value)}
            placeholder="+44 20 7946 0000"
            aria-invalid={Boolean(errors.phoneNumber)}
            aria-describedby={
              errors.phoneNumber ? `${formId}-phone-number-error` : undefined
            }
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: errors.phoneNumber
                ? 'var(--color-status-critical)'
                : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {errors.phoneNumber && (
            <p
              id={`${formId}-phone-number-error`}
              className="mt-2 text-xs"
              style={{ color: 'var(--color-status-critical)' }}
            >
              {errors.phoneNumber}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`${formId}-practice-name`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Practice Name
          </label>
          <input
            id={`${formId}-practice-name`}
            type="text"
            value={values.practiceName}
            onChange={(event) => updateField('practiceName', event.target.value)}
            placeholder="Carewell Medical Centre"
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <motion.button
          type="button"
          onClick={onCancel}
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
          type="submit"
          disabled={isSubmitting}
          className="h-9 rounded-lg px-4 text-xs font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-primary)' }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </motion.button>
      </div>
    </form>
  );
}
