import { type FormEvent, useId, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EditMedicationPayload, Medication } from '../../api/medications/medications.types';
import { checkDuplicateName } from '../../api/medications/medications.service';
import { useMedicationForm } from '../../hooks/medications/useMedicationForm';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getSchedulePreview } from '../../utils/formatMedicationSchedule';
import MedicationScheduleFields from './MedicationScheduleFields';

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
  const {
    values,
    errors,
    updateField,
    setScheduleType,
    setDailyMode,
    setSpecificTime,
    addSpecificTime,
    removeSpecificTime,
    toggleDayOfWeek,
    touchField,
    validateForm,
    toEditPayload,
    initFromMedication,
  } = useMedicationForm();
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [awaitingDuplicateConfirm, setAwaitingDuplicateConfirm] = useState(false);

  useEffect(() => {
    initFromMedication(initialValues);
    setDuplicateWarning(null);
    setAwaitingDuplicateConfirm(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) return;

    if (
      !awaitingDuplicateConfirm &&
      values.name.trim().toLowerCase() !== initialValues.medicationName.toLowerCase()
    ) {
      const isDuplicate = await checkDuplicateName(initialValues.patientId, values.name.trim());
      if (isDuplicate) {
        setDuplicateWarning(values.name.trim());
        setAwaitingDuplicateConfirm(true);
        return;
      }
    }

    await onSubmit(toEditPayload());
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
              A medication named <strong>{duplicateWarning}</strong> already exists for this
              patient. Are you sure you want to save this name?
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
          <MedicationScheduleFields
            formId={formId}
            values={values}
            errors={errors}
            setScheduleType={setScheduleType}
            setDailyMode={setDailyMode}
            updateField={updateField}
            setSpecificTime={setSpecificTime}
            addSpecificTime={addSpecificTime}
            removeSpecificTime={removeSpecificTime}
            toggleDayOfWeek={toggleDayOfWeek}
            touchField={touchField}
          />
          {(() => {
            const preview = getSchedulePreview(values);
            return preview ? (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Schedule: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{preview}</span>
              </p>
            ) : null;
          })()}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor={`${formId}-start-date`}
            className="text-xs font-bold"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Start date <span style={{ color: 'var(--color-status-critical)' }}>*</span>
          </label>
          <input
            id={`${formId}-start-date`}
            type="date"
            value={values.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            onBlur={() => touchField('startDate')}
            aria-invalid={Boolean(errors.startDate)}
            aria-describedby={errors.startDate ? `${formId}-start-date-error` : undefined}
            className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            style={{
              borderColor: errors.startDate ? 'var(--color-status-critical)' : 'var(--color-border)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'white',
            }}
          />
          {errors.startDate && (
            <p
              id={`${formId}-start-date-error`}
              className="mt-1 text-xs"
              style={{ color: 'var(--color-status-critical)' }}
            >
              {errors.startDate}
            </p>
          )}
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
