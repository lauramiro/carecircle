import { useState } from 'react';

export interface ProfileFormValues {
  fullName: string;
  dateOfBirth: string;
}

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function useProfileForm(initial?: Partial<ProfileFormValues>) {
  const [values, setValues] = useState<ProfileFormValues>({
    fullName: initial?.fullName ?? '',
    dateOfBirth: initial?.dateOfBirth ?? '',
  });
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  function validateField(name: keyof ProfileFormValues, value: string): boolean {
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
    return nameOk && dobOk;
  }

  function updateField(name: keyof ProfileFormValues, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function resetValues(next: Partial<ProfileFormValues>) {
    setValues({ fullName: next.fullName ?? '', dateOfBirth: next.dateOfBirth ?? '' });
    setErrors({});
  }

  return { values, errors, updateField, validateField, validateForm, resetValues };
}
