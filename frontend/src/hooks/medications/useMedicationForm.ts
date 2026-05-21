import { useState } from 'react';
import { toLocalDateString } from '../../lib/dates';
import { parseDosageString } from '../../lib/dosage';
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
  form: string;
  route: string;
  instructions: string;
  takeWithFood: boolean;
  endDate: string;
  prescribedDate: string;
  prescriptionNumber: string;
  pharmacy: string;
  pharmacyPhone: string;
  refillsRemaining: string;
  lastRefillDate: string;
  sideEffectsText: string;
  notes: string;
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
    | 'startDate'
    | 'endDate'
    | 'refillsRemaining',
    string
  >
>;

function todayStr(): string {
  return toLocalDateString();
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
  form: '',
  route: '',
  instructions: '',
  takeWithFood: false,
  endDate: '',
  prescribedDate: '',
  prescriptionNumber: '',
  pharmacy: '',
  pharmacyPhone: '',
  refillsRemaining: '',
  lastRefillDate: '',
  sideEffectsText: '',
  notes: '',
};

function parseSideEffectsText(text: string): string[] | undefined {
  const items = text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function formatSideEffects(sideEffects: string[] | null): string {
  return sideEffects?.join(', ') ?? '';
}

function buildOptionalFields(values: MedicationFormValues) {
  const optional: Record<string, unknown> = {};

  const form = values.form.trim();
  if (form) optional.form = form;

  const route = values.route.trim();
  if (route) optional.route = route;

  const instructions = values.instructions.trim();
  if (instructions) optional.instructions = instructions;

  if (values.takeWithFood) optional.takeWithFood = true;

  if (values.endDate) optional.endDate = values.endDate;
  if (values.prescribedDate) optional.prescribedDate = values.prescribedDate;

  const prescriptionNumber = values.prescriptionNumber.trim();
  if (prescriptionNumber) optional.prescriptionNumber = prescriptionNumber;

  const pharmacy = values.pharmacy.trim();
  if (pharmacy) optional.pharmacy = pharmacy;

  const pharmacyPhone = values.pharmacyPhone.trim();
  if (pharmacyPhone) optional.pharmacyPhone = pharmacyPhone;

  if (values.refillsRemaining !== '') {
    optional.refillsRemaining = Number(values.refillsRemaining);
  }

  if (values.lastRefillDate) optional.lastRefillDate = values.lastRefillDate;

  const sideEffects = parseSideEffectsText(values.sideEffectsText);
  if (sideEffects) optional.sideEffects = sideEffects;

  const notes = values.notes.trim();
  if (notes) optional.notes = notes;

  return optional;
}

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
  } else   if (st === 'monthly') {
    const d = Number(values.dayOfMonth);
    if (values.dayOfMonth === '' || isNaN(d) || d < 1 || d > 31) {
      errors.dayOfMonth = 'Enter a valid day of month (1-31)';
    }
    if (values.specificTimes.length === 0 || values.specificTimes.some((t) => t === '')) {
      errors.specificTimes = 'At least one time is required';
    }
  }

  if (values.endDate && values.startDate && values.endDate < values.startDate) {
    errors.endDate = 'End date cannot be before start date';
  }

  if (values.refillsRemaining !== '') {
    const refills = Number(values.refillsRemaining);
    if (isNaN(refills) || refills < 0 || !Number.isInteger(refills)) {
      errors.refillsRemaining = 'Refills must be a whole number of 0 or more';
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
    const { dose, unit } = parseDosageString(med.dosage);

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
      dose: String(dose),
      unit: unit as MedicationUnit,
      startDate: med.startDate,
      form: med.form ?? '',
      route: med.route ?? '',
      instructions: med.instructions ?? '',
      takeWithFood: med.takeWithFood === true,
      endDate: med.endDate ?? '',
      prescribedDate: med.prescribedDate ?? '',
      prescriptionNumber: med.prescriptionNumber ?? '',
      pharmacy: med.pharmacy ?? '',
      pharmacyPhone: med.pharmacyPhone ?? '',
      refillsRemaining: med.refillsRemaining != null ? String(med.refillsRemaining) : '',
      lastRefillDate: med.lastRefillDate ?? '',
      sideEffectsText: formatSideEffects(med.sideEffects),
      notes: med.notes ?? '',
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
      ...buildOptionalFields(values),
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
    return base;
  }

  function toEditPayload(): EditMedicationPayload {
    const base: EditMedicationPayload = {
      medicationName: values.name.trim(),
      dosage: `${values.dose} ${values.unit as MedicationUnit}`,
      scheduleType: values.scheduleType as ScheduleType,
      startDate: values.startDate,
      form: values.form.trim() || null,
      route: values.route.trim() || null,
      instructions: values.instructions.trim() || null,
      takeWithFood: values.takeWithFood ? true : null,
      endDate: values.endDate || null,
      prescribedDate: values.prescribedDate || null,
      prescriptionNumber: values.prescriptionNumber.trim() || null,
      pharmacy: values.pharmacy.trim() || null,
      pharmacyPhone: values.pharmacyPhone.trim() || null,
      refillsRemaining: values.refillsRemaining !== '' ? Number(values.refillsRemaining) : null,
      lastRefillDate: values.lastRefillDate || null,
      sideEffects: parseSideEffectsText(values.sideEffectsText) ?? null,
      notes: values.notes.trim() || null,
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
