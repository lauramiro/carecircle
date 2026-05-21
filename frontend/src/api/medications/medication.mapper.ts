import { normalizeTime } from '@lib/time';
import type { MedicationRow } from '@lib/supabaseTables';
import type { Medication, MedicationStatus, ScheduleType } from './medications.types';

function normalizeTimes(times: string[] | null | undefined): string[] | null {
  if (!times?.length) return null;
  return times.map(normalizeTime);
}

export function medicationFromRow(row: MedicationRow): Medication {
  return {
    id: row.id,
    patientId: row.patient_id,
    medicationName: row.medication_name,
    genericName: row.name,
    dosage: `${row.dose} ${row.unit}`,
    form: row.form,
    prescribedBy: row.prescribed_by,
    prescribedDate: row.prescribed_date,
    prescriptionNumber: row.prescription_number,
    scheduleType: row.schedule_type as ScheduleType | null,
    specificTimes: normalizeTimes(row.specific_times),
    intervalHours: row.interval_hours,
    daysOfWeek: row.days_of_week,
    dayOfMonth: row.day_of_month,
    instructions: row.instructions,
    route: row.route,
    takeWithFood: row.take_with_food,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as MedicationStatus,
    discontinuedDate: row.discontinued_date,
    discontinuedReason: row.discontinued_reason,
    refillsRemaining: row.refills_remaining,
    lastRefillDate: row.last_refill_date,
    pharmacy: row.pharmacy,
    pharmacyPhone: row.pharmacy_phone,
    sideEffects: row.side_effects,
    notes: row.notes,
    version: row.version ?? 1,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}
