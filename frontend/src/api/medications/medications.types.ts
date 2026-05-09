export type MedicationUnit = 'mg' | 'ml' | 'mcg' | 'units';
export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'as_needed';
export type MedicationTimeWindow = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export type MedicationStatus = 'active' | 'paused' | 'archived';

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: number;
  unit: MedicationUnit;
  frequency: MedicationFrequency;
  timeWindows: MedicationTimeWindow[];
  status: MedicationStatus;
  createdAt: string;
}

export type AddMedicationPayload = Omit<Medication, 'id' | 'status' | 'createdAt'>;

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
