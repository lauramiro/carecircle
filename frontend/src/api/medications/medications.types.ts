export type MedicationUnit = 'mg' | 'ml' | 'mcg' | 'units';
export type MedicationStatus = 'active' | 'paused' | 'archived' | 'superseded';
export type ScheduleType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'as_needed';

export interface Medication {
  id: string;
  patientId: string;
  medicationName: string;
  genericName: string | null;
  dosage: string;
  form: string | null;
  prescribedBy: string | null;
  prescribedDate: string | null;
  prescriptionNumber: string | null;
  scheduleType: ScheduleType | null;
  specificTimes: string[] | null;
  intervalHours: number | null;
  daysOfWeek: number[] | null;
  dayOfMonth: number | null;
  instructions: string | null;
  route: string | null;
  takeWithFood: boolean | null;
  startDate: string;
  endDate: string | null;
  perpetual?: boolean;
  totalDoses?: number | null;
  status: MedicationStatus;
  discontinuedDate: string | null;
  discontinuedReason: string | null;
  refillsRemaining: number | null;
  lastRefillDate: string | null;
  pharmacy: string | null;
  pharmacyPhone: string | null;
  sideEffects: string[] | null;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type MedicationOptionalFields = {
  form?: string;
  route?: string;
  instructions?: string;
  takeWithFood?: boolean;
  endDate?: string;
  perpetual?: boolean;
  totalDoses?: number;
  prescribedDate?: string;
  prescriptionNumber?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  refillsRemaining?: number;
  lastRefillDate?: string;
  sideEffects?: string[];
  notes?: string;
};

export type AddMedicationPayload = {
  patientId: string;
  medicationName: string;
  dosage: string;
  startDate: string;
  scheduleType: ScheduleType;
  specificTimes?: string[];
  intervalHours?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
} & MedicationOptionalFields;

export type EditMedicationPayload = Partial<
  Pick<
    Medication,
    | 'medicationName'
    | 'dosage'
    | 'scheduleType'
    | 'specificTimes'
    | 'intervalHours'
    | 'daysOfWeek'
    | 'dayOfMonth'
    | 'startDate'
    | 'form'
    | 'route'
    | 'instructions'
    | 'takeWithFood'
    | 'endDate'
    | 'perpetual'
    | 'totalDoses'
    | 'prescribedDate'
    | 'prescriptionNumber'
    | 'pharmacy'
    | 'pharmacyPhone'
    | 'refillsRemaining'
    | 'lastRefillDate'
    | 'sideEffects'
    | 'notes'
  >
>;

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  as_needed: 'As needed',
};

export const SCHEDULE_TYPES: ScheduleType[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'as_needed',
];

export const DAY_LABELS: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Every 1 hour' },
  { value: 2, label: 'Every 2 hours' },
  { value: 3, label: 'Every 3 hours' },
  { value: 4, label: 'Every 4 hours' },
  { value: 6, label: 'Every 6 hours' },
  { value: 8, label: 'Every 8 hours' },
  { value: 12, label: 'Every 12 hours' },
];
