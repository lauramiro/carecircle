import { type FormEvent, useId, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EditMedicationPayload, Medication, MedicationUnit, MedicationFrequency } from '../../api/medications/medications.types';
import {
  FREQUENCY_LABELS,
  TIME_WINDOWS,
} from '../../api/medications/medications.types';
import { checkDuplicateName } from '../../api/medications/medications.service';
import { useMedicationForm } from '../../hooks/medications/useMedicationForm';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface EditMedicationFormProps {
  initialValues: Medication;
  isSubmitting: boolean;
  onSubmit: (changes: EditMedicationPayload) => Promise<void>;
  onCancel: () => void;
}

const UNIT_OPTIONS = ['mg', 'ml', 'mcg', 'units'] as const;

export default function EditMedicationForm({
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: EditMedicationFormProps) {
  const formId = useId();
  const shouldReduceMotion = useReducedMotion();
  const { values, errors, updateField, toggleTimeWindow, touchField, validateForm } =
    useMedicationForm();
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [awaitingDuplicateConfirm, setAwaitingDuplicateConfirm] = useState(false);

  useEffect(() => {
    const parts = initialValues.dosage.split(' ');
    updateField('name', initialValues.medicationName);
    updateField('dose', parts[0] ?? '');
    updateField('unit', (parts[1] ?? 'mg') as MedicationUnit);
    updateField('frequency', initialValues.frequency);
    updateField('timeWindows', initialValues.timeOfDay ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) return;

    if (!awaitingDuplicateConfirm && values.name.trim().toLowerCase() !== initialValues.medicationName.toLowerCase()) {
      const isDuplicate = await checkDuplicateName(initialValues.patientId, values.name.trim());
      if (isDuplicate) {
        setDuplicateWarning(values.name.trim());
        setAwaitingDuplicateConfirm(true);
        return;
      }
    }

    const changes: EditMedicationPayload = {
      medicationName: values.name.trim(),
      dosage: `${values.dose} ${values.unit as MedicationUnit}`,
      frequency: values.frequency as MedicationFrequency,
      timeOfDay: values.timeWindows,
    };

    await onSubmit(changes);
    setDuplicateWarning(null);
    setAwaitingDuplicateConfirm(false);
  }

  function handleCancelDuplicate() {
    setDuplicateWarning(null);
    setAwaitingDuplicateConfirm(false);
  }

  const fieldStyle = (hasError: boolean) => ({
    borderColor: hasError ? 'var(--color-status-critical)' : 'var(--color-border)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'white',
  });

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
      <AnimatePresence>
        {duplicateWarning && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border p-4 text-sm"
            style={{
              borderColor: 'var(--color-status-warning, #f59e0b)',
              backgroundColor: 'var(--color-status-warning-bg, #fffbeb)',
              color: 'var(--color-status-warning-text, #92400e)',
            }}
            role="alert"
          >
            <p className="font-bold">Duplicate medication</p>
            <p className="mt-1">
              A medication named <strong>{duplicateWarning}</strong> already exists for
              this patient. Are you sure you want to save this name?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleCancelDuplicate}
                className="h-8 rounded-lg border px-3 text-xs font-bold"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 rounded-lg px-3 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--color-status-warning, #f59e0b)' }}
              >
                Save anyway
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor={`${formId}-name`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Medication name <span style={{ color: 'var(--color-status-critical)' }}>*</span>
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            value={values.name}
            onChange={(e) => updateField('name', e.target.value)}
            onBlur={() => touchField('name')}
            placeholder="e.g. Amlodipine"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={fieldStyle(Boolean(errors.name))}
          />
          {errors.name && (
            <p
              id={`${formId}-name-error`}
              className="mt-1 text-xs"
              style={{ color: 'var(--color-status-critical)' }}
            >
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`${formId}-dose`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Dose <span style={{ color: 'var(--color-status-critical)' }}>*</span>
          </label>
          <input
            id={`${formId}-dose`}
            type="number"
            min="0"
            step="any"
            value={values.dose}
            onChange={(e) => updateField('dose', e.target.value)}
            onBlur={() => touchField('dose')}
            placeholder="e.g. 500"
            aria-invalid={Boolean(errors.dose)}
            aria-describedby={errors.dose ? `${formId}-dose-error` : undefined}
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={fieldStyle(Boolean(errors.dose))}
          />
          {errors.dose && (
            <p
              id={`${formId}-dose-error`}
              className="mt-1 text-xs"
              style={{ color: 'var(--color-status-critical)' }}
            >
              {errors.dose}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`${formId}-unit`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Unit <span style={{ color: 'var(--color-status-critical)' }}>*</span>
          </label>
          <select
            id={`${formId}-unit`}
            value={values.unit}
            onChange={(e) => updateField('unit', e.target.value as typeof values.unit)}
            onBlur={() => touchField('unit')}
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={errors.unit ? `${formId}-unit-error` : undefined}
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={fieldStyle(Boolean(errors.unit))}
          >
            <option value="">Select unit</option>
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {errors.unit && (
            <p
              id={`${formId}-unit-error`}
              className="mt-1 text-xs"
              style={{ color: 'var(--color-status-critical)' }}
            >
              {errors.unit}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor={`${formId}-frequency`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Frequency <span style={{ color: 'var(--color-status-critical)' }}>*</span>
          </label>
          <select
            id={`${formId}-frequency`}
            value={values.frequency}
            onChange={(e) =>
              updateField('frequency', e.target.value as typeof values.frequency)
            }
            onBlur={() => touchField('frequency')}
            aria-invalid={Boolean(errors.frequency)}
            aria-describedby={errors.frequency ? `${formId}-frequency-error` : undefined}
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={fieldStyle(Boolean(errors.frequency))}
          >
            <option value="">Select frequency</option>
            {(Object.entries(FREQUENCY_LABELS) as [string, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
          {errors.frequency && (
            <p
              id={`${formId}-frequency-error`}
              className="mt-1 text-xs"
              style={{ color: 'var(--color-status-critical)' }}
            >
              {errors.frequency}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <fieldset>
            <legend
              className="text-xs font-bold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Time windows{' '}
              <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </legend>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-describedby={errors.timeWindows ? `${formId}-timewindows-error` : undefined}
            >
              {TIME_WINDOWS.map((window) => {
                const checked = values.timeWindows.includes(window);
                return (
                  <label
                    key={window}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold select-none"
                    style={{
                      borderColor: checked
                        ? 'var(--color-primary)'
                        : errors.timeWindows
                          ? 'var(--color-status-critical)'
                          : 'var(--color-border)',
                      backgroundColor: checked
                        ? 'var(--color-primary-light, #eff6ff)'
                        : 'white',
                      color: checked
                        ? 'var(--color-primary)'
                        : 'var(--color-text-secondary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleTimeWindow(window)}
                    />
                    {window}
                  </label>
                );
              })}
            </div>
            {errors.timeWindows && (
              <p
                id={`${formId}-timewindows-error`}
                className="mt-1 text-xs"
                style={{ color: 'var(--color-status-critical)' }}
              >
                {errors.timeWindows}
              </p>
            )}
          </fieldset>
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
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </motion.button>
      </div>
    </form>
  );
}
