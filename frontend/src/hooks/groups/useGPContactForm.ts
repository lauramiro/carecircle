import { useState } from 'react';
import type { GPContact } from '../../api/groups/groups.types';

export interface GPContactFormValues {
  gpName: string;
  phoneNumber: string;
  practiceName: string;
}

export type GPContactFormPayload = Omit<GPContact, 'id'>;

const phoneNumberPattern = /^[-0-9 +]*$/;
const phoneNumberError =
  'Phone number can only contain digits, spaces, +, and -';

function toFormValues(contact?: GPContact): GPContactFormValues {
  return {
    gpName: contact?.gpName ?? '',
    phoneNumber: contact?.phoneNumber ?? '',
    practiceName: contact?.practiceName ?? '',
  };
}

function toPayload(values: GPContactFormValues): GPContactFormPayload {
  return {
    gpName: values.gpName.trim() || undefined,
    phoneNumber: values.phoneNumber.trim() || undefined,
    practiceName: values.practiceName.trim() || undefined,
  };
}

export function useGPContactForm(initialContact?: GPContact) {
  const [values, setValues] = useState<GPContactFormValues>(
    toFormValues(initialContact),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof GPContactFormValues, string>>>(
    {},
  );

  function validateField(name: keyof GPContactFormValues, value: string): boolean {
    if (name === 'phoneNumber' && !phoneNumberPattern.test(value)) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        phoneNumber: phoneNumberError,
      }));
      return false;
    }

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
    return true;
  }

  function validateForm(): boolean {
    return validateField('phoneNumber', values.phoneNumber);
  }

  function updateField(name: keyof GPContactFormValues, value: string) {
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
  }

  return {
    values,
    errors,
    updateField,
    validateField,
    validateForm,
    toPayload: () => toPayload(values),
  };
}
