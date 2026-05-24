import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { MedicationFormErrors, MedicationFormValues } from '../../hooks/medications/useMedicationForm';

interface MedicationAdditionalFieldsProps {
  formId: string;
  values: MedicationFormValues;
  errors: MedicationFormErrors;
  updateField: <K extends keyof MedicationFormValues>(name: K, value: MedicationFormValues[K]) => void;
  touchField: (name: keyof MedicationFormErrors) => void;
  defaultExpanded?: boolean;
}

const FORM_SUGGESTIONS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Patch', 'Cream', 'Inhaler'];
const ROUTE_SUGGESTIONS = ['Oral', 'Topical', 'Sublingual', 'Injection', 'Inhaled', 'Rectal'];

export default function MedicationAdditionalFields({
  formId,
  values,
  errors,
  updateField,
  touchField,
  defaultExpanded = false,
}: MedicationAdditionalFieldsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const fieldStyle = (hasError: boolean) => ({
    borderColor: hasError ? 'var(--color-status-critical)' : 'var(--color-border)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'white',
  });

  return (
    <div className="md:col-span-2 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div>
          <p className="text-sm font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Additional details
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Optional — form, route, pharmacy, instructions, and more
          </p>
        </div>
        <ChevronDown
          size={18}
          style={{
            color: 'var(--color-text-secondary)',
            transform: expanded ? 'rotate(180deg)' : undefined,
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {expanded && (
        <div className="grid gap-4 border-t px-4 pb-4 pt-4 md:grid-cols-2" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <label htmlFor={`${formId}-form`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Form
            </label>
            <input
              id={`${formId}-form`}
              type="text"
              list={`${formId}-form-suggestions`}
              value={values.form}
              onChange={(e) => updateField('form', e.target.value)}
              placeholder="e.g. Tablet"
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
            <datalist id={`${formId}-form-suggestions`}>
              {FORM_SUGGESTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor={`${formId}-route`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Route
            </label>
            <input
              id={`${formId}-route`}
              type="text"
              list={`${formId}-route-suggestions`}
              value={values.route}
              onChange={(e) => updateField('route', e.target.value)}
              placeholder="e.g. Oral"
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
            <datalist id={`${formId}-route-suggestions`}>
              {ROUTE_SUGGESTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label htmlFor={`${formId}-instructions`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Instructions
            </label>
            <textarea
              id={`${formId}-instructions`}
              value={values.instructions}
              onChange={(e) => updateField('instructions', e.target.value)}
              placeholder="How this medication should be taken..."
              rows={2}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-prescribed-date`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Prescribed date
            </label>
            <input
              id={`${formId}-prescribed-date`}
              type="date"
              value={values.prescribedDate}
              onChange={(e) => updateField('prescribedDate', e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-prescription-number`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Prescription number
            </label>
            <input
              id={`${formId}-prescription-number`}
              type="text"
              value={values.prescriptionNumber}
              onChange={(e) => updateField('prescriptionNumber', e.target.value)}
              placeholder="Rx number"
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-refills`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Refills remaining
            </label>
            <input
              id={`${formId}-refills`}
              type="number"
              min="0"
              step="1"
              value={values.refillsRemaining}
              onChange={(e) => updateField('refillsRemaining', e.target.value)}
              onBlur={() => touchField('refillsRemaining')}
              placeholder="e.g. 3"
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(Boolean(errors.refillsRemaining))}
            />
            {errors.refillsRemaining && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-status-critical)' }}>
                {errors.refillsRemaining}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${formId}-last-refill`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Last refill date
            </label>
            <input
              id={`${formId}-last-refill`}
              type="date"
              value={values.lastRefillDate}
              onChange={(e) => updateField('lastRefillDate', e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-pharmacy`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Pharmacy
            </label>
            <input
              id={`${formId}-pharmacy`}
              type="text"
              value={values.pharmacy}
              onChange={(e) => updateField('pharmacy', e.target.value)}
              placeholder="Pharmacy name"
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div>
            <label htmlFor={`${formId}-pharmacy-phone`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Pharmacy phone
            </label>
            <input
              id={`${formId}-pharmacy-phone`}
              type="tel"
              value={values.pharmacyPhone}
              onChange={(e) => updateField('pharmacyPhone', e.target.value)}
              placeholder="+44 ..."
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={`${formId}-side-effects`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Side effects
            </label>
            <input
              id={`${formId}-side-effects`}
              type="text"
              value={values.sideEffectsText}
              onChange={(e) => updateField('sideEffectsText', e.target.value)}
              placeholder="Comma-separated, e.g. nausea, dizziness"
              className="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={`${formId}-notes`} className="text-xs font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Notes
            </label>
            <textarea
              id={`${formId}-notes`}
              value={values.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any other notes about this medication..."
              rows={2}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={fieldStyle(false)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
              <input
                type="checkbox"
                checked={values.takeWithFood}
                onChange={(e) => updateField('takeWithFood', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Take with food
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
