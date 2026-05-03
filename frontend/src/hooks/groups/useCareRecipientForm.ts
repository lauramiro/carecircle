import { useState } from 'react';
import type { Allergy } from '../../api/groups/care-recipient.types';

export interface CareRecipientFormValues {
  fullName: string;
  dateOfBirth: string;
}

export type CareRecipientFormErrors = Partial<
  Record<keyof CareRecipientFormValues | 'conditions', string>
>;

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function useCareRecipientForm(
  initial?: Partial<CareRecipientFormValues & { conditions: string[]; allergies: Allergy[] }>,
) {
  const [values, setValues] = useState<CareRecipientFormValues>({
    fullName: initial?.fullName ?? '',
    dateOfBirth: initial?.dateOfBirth ?? '',
  });
  const [conditions, setConditions] = useState<string[]>(initial?.conditions ?? []);
  const [allergies, setAllergies] = useState<Allergy[]>(initial?.allergies ?? []);
  const [errors, setErrors] = useState<CareRecipientFormErrors>({});

  function validateField(name: keyof CareRecipientFormValues, value: string): boolean {
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
    if (conditions.length === 0) {
      setErrors((e) => ({ ...e, conditions: 'Add at least one condition or select None.' }));
      conditionsOk = false;
    } else {
      setErrors((e) => {
        const next = { ...e };
        delete next.conditions;
        return next;
      });
    }

    return nameOk && dobOk && conditionsOk;
  }

  function updateField(name: keyof CareRecipientFormValues, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function addCondition(condition: string) {
    const trimmed = condition.trim();
    if (!trimmed) return;
    setConditions((c) => {
      if (c.includes(trimmed)) return c;
      return [...c.filter((x) => x !== 'None'), trimmed];
    });
    setErrors((e) => {
      const next = { ...e };
      delete next.conditions;
      return next;
    });
  }

  function removeCondition(condition: string) {
    setConditions((c) => c.filter((x) => x !== condition));
  }

  function setConditionsNone() {
    setConditions(['None']);
    setErrors((e) => {
      const next = { ...e };
      delete next.conditions;
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
    next: Partial<CareRecipientFormValues & { conditions: string[]; allergies: Allergy[] }>,
  ) {
    setValues({ fullName: next.fullName ?? '', dateOfBirth: next.dateOfBirth ?? '' });
    setConditions(next.conditions ?? []);
    setAllergies(next.allergies ?? []);
    setErrors({});
  }

  return {
    values,
    conditions,
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
