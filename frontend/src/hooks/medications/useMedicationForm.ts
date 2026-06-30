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
export type CourseDurationMode = 'perpetual' | 'end_date' | 'total_doses' | '';

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
  quantityOnHand: string;
  endDate: string;
  courseDurationMode: CourseDurationMode;
  perpetual: boolean;
  totalDoses: string;
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
    | 'quantityOnHand'
    | 'endDate'
    | 'perpetual'
    | 'totalDoses'
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
  quantityOnHand: '',
  endDate: '',
  courseDurationMode: 'perpetual',
  perpetual: true,
  totalDoses: '',
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

  if (values.quantityOnHand !== '') {
    optional.quantityOnHand = Number(values.quantityOnHand);
  }

  if (values.courseDurationMode === 'perpetual') optional.perpetual = true;
  if (values.courseDurationMode === 'end_date' && values.endDate) optional.endDate = values.endDate;
  if (values.courseDurationMode === 'total_doses' && values.totalDoses !== '') {
    optional.totalDoses = Number(values.totalDoses);
  }
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

  if (st !== 'as_needed') {
    if (!values.courseDurationMode) {
      errors.perpetual = 'Choose exactly one: ongoing (perpetual), end date, or total doses';
    } else if (values.courseDurationMode === 'end_date') {
      if (!values.endDate) errors.endDate = 'End date is required';
    } else if (values.courseDurationMode === 'total_doses') {
      if (values.totalDoses === '') {
        errors.totalDoses = 'Total doses is required';
      } else {
        const total = Number(values.totalDoses);
        if (isNaN(total) || total < 1 || !Number.isInteger(total)) {
          errors.totalDoses = 'Total doses must be a whole number of 1 or more';
        }
      }
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

  if (values.quantityOnHand !== '') {
    const quantity = Number(values.quantityOnHand);
    if (isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      errors.quantityOnHand = 'Quantity must be a whole number of 0 or more';
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
      ...(type !== 'as_needed' && current.scheduleType === 'as_needed'
        ? {
            courseDurationMode: 'perpetual' as CourseDurationMode,
            perpetual: true,
            endDate: '',
            totalDoses: '',
          }
        : {}),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.scheduleType;
      return next;
    });
  }

  function setCourseDurationMode(mode: CourseDurationMode) {
    setValues((current) => ({
      ...current,
      courseDurationMode: mode,
      perpetual: mode === 'perpetual',
      endDate: mode === 'end_date' ? current.endDate : '',
      totalDoses: mode === 'total_doses' ? current.totalDoses : '',
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.perpetual;
      if (mode !== 'end_date') delete next.endDate;
      if (mode !== 'total_doses') delete next.totalDoses;
      return next;
    });
  }

  function setDailyMode(mode: DailyMode) {
    setValues((current) => ({ ...current, dailyMode: mode }));
    setErrors((current) => {
      const next = { ...current };
      delete next.dailyMode;
      return next;
    });
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
    const isInterval = med.scheduleType === 'daily' && med.intervalHours !== null;

    const scheduleFields: Pick<
      MedicationFormValues,
      | 'scheduleType'
      | 'dailyMode'
      | 'specificTimes'
      | 'intervalHours'
      | 'intervalStartTime'
      | 'daysOfWeek'
      | 'dayOfMonth'
    > = {
      scheduleType: med.scheduleType ?? '',
      dailyMode: med.scheduleType === 'daily' ? (isInterval ? 'interval' : 'specific_times') : '',
      specificTimes: isInterval ? [] : (med.specificTimes ?? ['']),
      intervalHours: isInterval ? (med.intervalHours ?? '') : '',
      intervalStartTime: isInterval ? (med.specificTimes?.[0] ?? '') : '',
      daysOfWeek: med.daysOfWeek ?? [],
      dayOfMonth: med.dayOfMonth ?? '',
    };

    const courseDurationMode: CourseDurationMode =
      med.endDate != null && med.endDate !== ''
        ? 'end_date'
        : med.totalDoses != null
          ? 'total_doses'
          : med.scheduleType === 'as_needed'
            ? ''
            : 'perpetual';

    setValues({
      name: med.medicationName,
      dose: String(dose),
      unit: unit as MedicationUnit,
      startDate: med.startDate,
      form: med.form ?? '',
      route: med.route ?? '',
      instructions: med.instructions ?? '',
      takeWithFood: med.takeWithFood === true,
      quantityOnHand: med.quantityOnHand != null ? String(med.quantityOnHand) : '',
      endDate: med.endDate ?? '',
      courseDurationMode,
      perpetual:
        courseDurationMode === 'perpetual' ||
        (med.perpetual ??
          (med.scheduleType !== 'as_needed' && !med.endDate && med.totalDoses == null)),
      totalDoses: med.totalDoses != null ? String(med.totalDoses) : '',
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
      quantityOnHand: values.quantityOnHand !== '' ? Number(values.quantityOnHand) : null,
      endDate: values.courseDurationMode === 'end_date' ? values.endDate || null : null,
      perpetual: values.courseDurationMode === 'perpetual' ? true : undefined,
      totalDoses:
        values.courseDurationMode === 'total_doses' && values.totalDoses !== ''
          ? Number(values.totalDoses)
          : null,
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
    setCourseDurationMode,
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
