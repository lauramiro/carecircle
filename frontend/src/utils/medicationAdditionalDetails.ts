import type { Medication } from '../api/medications/medications.types';
import { formatDate } from './formatters';

export type MedicationDetailRow = {
  label: string;
  value: string;
};

export function getMedicationAdditionalDetails(medication: Medication): MedicationDetailRow[] {
  const rows: MedicationDetailRow[] = [];

  if (medication.form) {
    rows.push({ label: 'Form', value: medication.form });
  }
  if (medication.route) {
    rows.push({ label: 'Route', value: medication.route });
  }
  if (medication.instructions) {
    rows.push({ label: 'Instructions', value: medication.instructions });
  }
  if (medication.takeWithFood === true) {
    rows.push({ label: 'Take with food', value: 'Yes' });
  } else if (medication.takeWithFood === false) {
    rows.push({ label: 'Take with food', value: 'No' });
  }
  if (medication.endDate) {
    rows.push({ label: 'End date', value: formatDate(medication.endDate) });
  }
  if (medication.prescribedDate) {
    rows.push({ label: 'Prescribed date', value: formatDate(medication.prescribedDate) });
  }
  if (medication.prescriptionNumber) {
    rows.push({ label: 'Prescription number', value: medication.prescriptionNumber });
  }
  if (medication.refillsRemaining != null) {
    rows.push({ label: 'Refills remaining', value: String(medication.refillsRemaining) });
  }
  if (medication.lastRefillDate) {
    rows.push({ label: 'Last refill date', value: formatDate(medication.lastRefillDate) });
  }
  if (medication.pharmacy) {
    rows.push({ label: 'Pharmacy', value: medication.pharmacy });
  }
  if (medication.pharmacyPhone) {
    rows.push({ label: 'Pharmacy phone', value: medication.pharmacyPhone });
  }
  if (medication.sideEffects?.length) {
    rows.push({ label: 'Side effects', value: medication.sideEffects.join(', ') });
  }
  if (medication.notes) {
    rows.push({ label: 'Notes', value: medication.notes });
  }

  return rows;
}

export function hasMedicationAdditionalDetails(medication: Medication): boolean {
  return getMedicationAdditionalDetails(medication).length > 0;
}
