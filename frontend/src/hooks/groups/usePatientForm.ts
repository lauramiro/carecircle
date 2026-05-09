import { useState } from 'react';
import type { Allergy } from '../../api/groups/patient.types';

export interface PatientFormValues {
  fullName: string;
  dateOfBirth: string;
}

export type PatientFormErrors = Partial<
  Record<keyof PatientFormValues | 'chronicConditions', string>
>;

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function usePatientForm(
  initial?: Partial<PatientFormValues & { chronicConditions: string[]; allergies: Allergy[] }>,
) {
  const [values, setValues] = useState<PatientFormValues>({
    fullName: initial?.fullName ?? '',
    dateOfBirth: initial?.dateOfBirth ?? '',
  });
  const [chronicConditions, setChronicConditions] = useState<string[]>(initial?.chronicConditions ?? []);
  const [allergies, setAllergies] = useState<Allergy[]>(initial?.allergies ?? []);
  const [errors, setErrors] = useState<PatientFormErrors>({});

  function validateField(name: keyof PatientFormValues, value: string): boolean {
    if (name === 'fullName') {
      if (!value.trim()) {
        setErrors((e) => ({ ...e, fullName: 'Full name is required.' }));
        return false;
      }
    }

    if (name === 'dateOfBirth') {
      if (!value) {
        setErrors((e) => ({ ...e, dateOfBirth: 'Date of birth is required.' }));
        return false;
      }
      if (value >= todayIso()) {
        setErrors((e) => ({ ...e, dateOfBirth: 'Date of birth must be in the past.' }));
        return false;
      }
    }

    setErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
    return true;
  }

  function validateForm(): boolean {
    const nameOk = validateField('fullName', values.fullName);
    const dobOk = validateField('dateOfBirth', values.dateOfBirth);

    let conditionsOk = true;
    if (chronicConditions.length === 0) {
      setErrors((e) => ({ ...e, chronicConditions: 'Add at least one condition or select None.' }));
      conditionsOk = false;
    } else {
      setErrors((e) => {
        const next = { ...e };
        delete next.chronicConditions;
        return next;
      });
    }

    return nameOk && dobOk && conditionsOk;
  }

  function updateField(name: keyof PatientFormValues, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function addCondition(condition: string) {
    const trimmed = condition.trim();
    if (!trimmed) return;
    setChronicConditions((c) => {
      if (c.includes(trimmed)) return c;
      return [...c.filter((x) => x !== 'None'), trimmed];
    });
    setErrors((e) => {
      const next = { ...e };
      delete next.chronicConditions;
      return next;
    });
  }

  function removeCondition(condition: string) {
    setChronicConditions((c) => c.filter((x) => x !== condition));
  }

  function setConditionsNone() {
    setChronicConditions(['None']);
    setErrors((e) => {
      const next = { ...e };
      delete next.chronicConditions;
      return next;
    });
  }

  function addAllergy(allergy: Allergy) {
    if (!allergy.description.trim()) return;
    setAllergies((a) => [...a, { ...allergy, description: allergy.description.trim() }]);
  }

  function removeAllergy(index: number) {
    setAllergies((a) => a.filter((_, i) => i !== index));
  }

  function resetValues(
    next: Partial<PatientFormValues & { chronicConditions: string[]; allergies: Allergy[] }>,
  ) {
    setValues({ fullName: next.fullName ?? '', dateOfBirth: next.dateOfBirth ?? '' });
    setChronicConditions(next.chronicConditions ?? []);
    setAllergies(next.allergies ?? []);
    setErrors({});
  }

  return {
    values,
    chronicConditions,
    allergies,
    errors,
    updateField,
    validateField,
    validateForm,
    resetValues,
    addCondition,
    removeCondition,
    setConditionsNone,
    addAllergy,
    removeAllergy,
  };
}
