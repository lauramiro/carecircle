import { useState } from 'react';
import type {
  AddMedicationPayload,
  EditMedicationPayload,
  Medication,
  MedicationUnit,
  ScheduleType,
} from '../../api/medications/medications.types';

export type DailyMode = 'specific_times' | 'interval';

export interface MedicationFormValues {
  name: string;
  dose: string;
  unit: MedicationUnit | '';
  scheduleType: ScheduleType | '';
  dailyMode: DailyMode | '';
  specificTimes: string[];
  intervalHours: number | '';
  intervalStartTime: string;
  daysOfWeek: number[];
  dayOfMonth: number | '';
  startDate: string;
}

export type MedicationFormErrors = Partial<
  Record<
    | 'name'
    | 'dose'
    | 'unit'
    | 'scheduleType'
    | 'dailyMode'
    | 'specificTimes'
    | 'intervalHours'
    | 'intervalStartTime'
    | 'daysOfWeek'
    | 'dayOfMonth'
    | 'startDate',
    string
  >
>;

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

const emptyValues: MedicationFormValues = {
  name: '',
  dose: '',
  unit: '',
  scheduleType: '',
  dailyMode: '',
  specificTimes: [],
  intervalHours: '',
  intervalStartTime: '',
  daysOfWeek: [],
  dayOfMonth: '',
  startDate: todayStr(),
};

function validateAll(values: MedicationFormValues): MedicationFormErrors {
  const errors: MedicationFormErrors = {};

  if (values.name.trim() === '') errors.name = 'Medication name is required';

  if (values.dose.trim() === '') {
    errors.dose = 'Dose is required';
  } else {
    const n = Number(values.dose);
    if (isNaN(n) || n <= 0) errors.dose = 'Dose must be a positive number';
  }

  if (values.unit === '') errors.unit = 'Unit is required';
  if (values.scheduleType === '') errors.scheduleType = 'Schedule is required';
  if (values.startDate === '') errors.startDate = 'Start date is required';

  const st = values.scheduleType;
  if (st === 'daily') {
    if (values.dailyMode === '') {
      errors.dailyMode = 'Select a scheduling mode';
    } else if (values.dailyMode === 'specific_times') {
      if (values.specificTimes.length === 0 || values.specificTimes.some((t) => t === '')) {
        errors.specificTimes = 'At least one time is required';
      }
    } else {
      if (values.intervalHours === '') errors.intervalHours = 'Select a repeat interval';
      if (values.intervalStartTime === '') errors.intervalStartTime = 'Start time is required';
    }
  } else if (st === 'weekly') {
    if (values.daysOfWeek.length === 0) errors.daysOfWeek = 'Select at least one day';
    if (values.specificTimes.length === 0 || values.specificTimes.some((t) => t === '')) {
      errors.specificTimes = 'At least one time is required';
    }
  } else if (st === 'biweekly') {
    if (values.specificTimes.length === 0 || values.specificTimes.some((t) => t === '')) {
      errors.specificTimes = 'At least one time is required';
    }
  } else if (st === 'monthly') {
    const d = Number(values.dayOfMonth);
    if (values.dayOfMonth === '' || isNaN(d) || d < 1 || d > 31) {
      errors.dayOfMonth = 'Enter a valid day of month (1-31)';
    }
    if (values.specificTimes.length === 0 || values.specificTimes.some((t) => t === '')) {
      errors.specificTimes = 'At least one time is required';
    }
  }

  return errors;
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

  function setScheduleType(type: ScheduleType) {
    setValues((current) => ({
      ...current,
      scheduleType: type,
      dailyMode: type === 'daily' ? (current.dailyMode || 'specific_times') : '',
    }));
  }

  function setDailyMode(mode: DailyMode) {
    setValues((current) => ({ ...current, dailyMode: mode }));
  }

  function setSpecificTime(index: number, time: string) {
    setValues((current) => {
      const next = [...current.specificTimes];
      next[index] = time;
      return { ...current, specificTimes: next };
    });
  }

  function addSpecificTime(time = '') {
    setValues((current) => ({
      ...current,
      specificTimes: [...current.specificTimes, time],
    }));
  }

  function removeSpecificTime(index: number) {
    setValues((current) => ({
      ...current,
      specificTimes: current.specificTimes.filter((_, i) => i !== index),
    }));
  }

  function toggleDayOfWeek(day: number) {
    setValues((current) => {
      const next = current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((d) => d !== day)
        : [...current.daysOfWeek, day].sort((a, b) => a - b);
      return { ...current, daysOfWeek: next };
    });
  }

  function initFromMedication(med: Medication) {
    const parts = med.dosage.split(' ');

    let scheduleFields: Pick<
      MedicationFormValues,
      | 'scheduleType'
      | 'dailyMode'
      | 'specificTimes'
      | 'intervalHours'
      | 'intervalStartTime'
      | 'daysOfWeek'
      | 'dayOfMonth'
    >;

    const isInterval = med.scheduleType === 'daily' && med.intervalHours !== null;
    scheduleFields = {
      scheduleType: med.scheduleType ?? '',
      dailyMode: med.scheduleType === 'daily' ? (isInterval ? 'interval' : 'specific_times') : '',
      specificTimes: isInterval ? [] : (med.specificTimes ?? ['']),
      intervalHours: isInterval ? (med.intervalHours ?? '') : '',
      intervalStartTime: isInterval ? (med.specificTimes?.[0] ?? '') : '',
      daysOfWeek: med.daysOfWeek ?? [],
      dayOfMonth: med.dayOfMonth ?? '',
    };

    setValues({
      name: med.medicationName,
      dose: parts[0] ?? '',
      unit: (parts[1] ?? 'mg') as MedicationUnit,
      startDate: med.startDate,
      ...scheduleFields,
    });
    setErrors({});
  }

  function touchField(name: keyof MedicationFormErrors) {
    const allErrors = validateAll(values);
    setErrors((current) => {
      if (allErrors[name] === undefined) {
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: allErrors[name] };
    });
  }

  function validateForm(): boolean {
    const nextErrors = validateAll(values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function toPayload(patientId: string): AddMedicationPayload {
    const base = {
      patientId,
      medicationName: values.name.trim(),
      dosage: `${values.dose} ${values.unit as MedicationUnit}`,
      startDate: values.startDate,
      scheduleType: values.scheduleType as ScheduleType,
    };

    const st = values.scheduleType;
    if (st === 'daily') {
      if (values.dailyMode === 'specific_times') {
        return { ...base, specificTimes: values.specificTimes };
      }
      return {
        ...base,
        intervalHours: values.intervalHours as number,
        specificTimes: [values.intervalStartTime],
      };
    }
    if (st === 'weekly') {
      return { ...base, specificTimes: values.specificTimes, daysOfWeek: values.daysOfWeek };
    }
    if (st === 'biweekly') {
      return { ...base, specificTimes: values.specificTimes };
    }
    if (st === 'monthly') {
      return {
        ...base,
        specificTimes: values.specificTimes,
        dayOfMonth: values.dayOfMonth as number,
      };
    }
    return base; // as_needed
  }

  function toEditPayload(): EditMedicationPayload {
    const base: EditMedicationPayload = {
      medicationName: values.name.trim(),
      dosage: `${values.dose} ${values.unit as MedicationUnit}`,
      scheduleType: values.scheduleType as ScheduleType,
      startDate: values.startDate,
    };

    const st = values.scheduleType;
    if (st === 'daily') {
      if (values.dailyMode === 'specific_times') {
        return { ...base, specificTimes: values.specificTimes, intervalHours: null };
      }
      return {
        ...base,
        intervalHours: values.intervalHours as number,
        specificTimes: [values.intervalStartTime],
      };
    }
    if (st === 'weekly') {
      return {
        ...base,
        specificTimes: values.specificTimes,
        daysOfWeek: values.daysOfWeek,
        intervalHours: null,
        dayOfMonth: null,
      };
    }
    if (st === 'biweekly') {
      return {
        ...base,
        specificTimes: values.specificTimes,
        intervalHours: null,
        daysOfWeek: null,
        dayOfMonth: null,
      };
    }
    if (st === 'monthly') {
      return {
        ...base,
        specificTimes: values.specificTimes,
        dayOfMonth: values.dayOfMonth as number,
        intervalHours: null,
        daysOfWeek: null,
      };
    }
    // as_needed
    return { ...base, specificTimes: null, intervalHours: null, daysOfWeek: null, dayOfMonth: null };
  }

  function reset() {
    setValues({ ...emptyValues, startDate: todayStr() });
    setErrors({});
  }

  return {
    values,
    errors,
    updateField,
    setScheduleType,
    setDailyMode,
    setSpecificTime,
    addSpecificTime,
    removeSpecificTime,
    toggleDayOfWeek,
    initFromMedication,
    touchField,
    validateForm,
    toPayload,
    toEditPayload,
    reset,
  };
}
