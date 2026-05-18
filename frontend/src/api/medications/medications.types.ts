export type MedicationUnit = 'mg' | 'ml' | 'mcg' | 'units';
export type MedicationStatus = 'active' | 'paused' | 'archived' | 'superseded';
export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'as_needed';
export type MedicationTimeWindow = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

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
  frequency: MedicationFrequency;
  timeOfDay: MedicationTimeWindow[] | null;
  specificTimes: string[] | null;
  instructions: string | null;
  route: string | null;
  takeWithFood: boolean | null;
  startDate: string;
  endDate: string | null;
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

export type AddMedicationPayload = {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: MedicationFrequency;
  timeOfDay: MedicationTimeWindow[];
  startDate: string;
};

export type EditMedicationPayload = Partial<
  Pick<Medication, 'medicationName' | 'dosage' | 'frequency' | 'timeOfDay' | 'instructions' | 'notes'>
>;

export const FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_times_daily: 'Three times daily',
  four_times_daily: 'Four times daily',
  as_needed: 'As needed',
};

export const TIME_WINDOWS: MedicationTimeWindow[] = [
  'Morning',
  'Afternoon',
  'Evening',
  'Night',
];
