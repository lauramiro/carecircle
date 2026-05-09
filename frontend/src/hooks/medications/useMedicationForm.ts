import { useState } from 'react';
import type {
  AddMedicationPayload,
  MedicationFrequency,
  MedicationTimeWindow,
  MedicationUnit,
} from '../../api/medications/medications.types';
import { TIME_WINDOWS } from '../../api/medications/medications.types';

export interface MedicationFormValues {
  name: string;
  dose: string;
  unit: MedicationUnit | '';
  frequency: MedicationFrequency | '';
  timeWindows: MedicationTimeWindow[];
}

export type MedicationFormErrors = Partial<Record<keyof MedicationFormValues, string>>;

const emptyValues: MedicationFormValues = {
  name: '',
  dose: '',
  unit: '',
  frequency: '',
  timeWindows: [],
};

function validateField(
  name: keyof MedicationFormValues,
  values: MedicationFormValues,
): string | undefined {
  switch (name) {
    case 'name':
      return values.name.trim() === '' ? 'Medication name is required' : undefined;
    case 'dose': {
      const numeric = Number(values.dose);
      if (values.dose.trim() === '') return 'Dose is required';
      if (isNaN(numeric) || numeric <= 0) return 'Dose must be a positive number';
      return undefined;
    }
    case 'unit':
      return values.unit === '' ? 'Unit is required' : undefined;
    case 'frequency':
      return values.frequency === '' ? 'Frequency is required' : undefined;
    case 'timeWindows':
      return values.timeWindows.length === 0
        ? 'At least one time window must be selected'
        : undefined;
    default:
      return undefined;
  }
}

export function useMedicationForm() {
  const [values, setValues] = useState<MedicationFormValues>(emptyValues);
  const [errors, setErrors] = useState<MedicationFormErrors>({});

  function updateField<K extends keyof MedicationFormValues>(
    name: K,
    value: MedicationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function toggleTimeWindow(window: MedicationTimeWindow) {
    setValues((current) => {
      const next = current.timeWindows.includes(window)
        ? current.timeWindows.filter((w) => w !== window)
        : [...current.timeWindows, window].sort(
            (a, b) => TIME_WINDOWS.indexOf(a) - TIME_WINDOWS.indexOf(b),
          );
      return { ...current, timeWindows: next };
    });
  }

  function touchField(name: keyof MedicationFormValues) {
    const error = validateField(name, values);
    setErrors((current) => {
      if (error === undefined) {
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: error };
    });
  }

  function validateForm(): boolean {
    const fields: (keyof MedicationFormValues)[] = [
      'name',
      'dose',
      'unit',
      'frequency',
      'timeWindows',
    ];
    const nextErrors: MedicationFormErrors = {};
    for (const field of fields) {
      const error = validateField(field, values);
      if (error !== undefined) nextErrors[field] = error;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function toPayload(patientId: string): AddMedicationPayload {
    return {
      patientId,
      name: values.name.trim(),
      dose: Number(values.dose),
      unit: values.unit as MedicationUnit,
      frequency: values.frequency as MedicationFrequency,
      timeWindows: values.timeWindows,
    };
  }

  function reset() {
    setValues(emptyValues);
    setErrors({});
  }

  return {
    values,
    errors,
    updateField,
    toggleTimeWindow,
    touchField,
    validateForm,
    toPayload,
    reset,
  };
}
