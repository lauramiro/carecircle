import { supabase } from '../../lib/supabaseClient';
import type { UpsertCheckinPayload, WellbeingCheckin } from './checkins.types';

type CheckinRow = {
  id: string;
  patient_id: string;
  group_id: string;
  caregiver_id: string;
  created_at: string;
  updated_at: string;
  checkin_date: string;
  mood: number;
  appetite: string;
  mobility: string;
  pain_level: number;
  notes: string | null;
};

function fromRow(row: CheckinRow): WellbeingCheckin {
  return {
    id: row.id,
    patientId: row.patient_id,
    groupId: row.group_id,
    caregiverId: row.caregiver_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkinDate: row.checkin_date,
    mood: row.mood,
    appetite: row.appetite as WellbeingCheckin['appetite'],
    mobility: row.mobility as WellbeingCheckin['mobility'],
    painLevel: row.pain_level,
    notes: row.notes,
  };
}

const checkinSelect = `
  id, patient_id, group_id, caregiver_id,
  created_at, updated_at, checkin_date,
  mood, appetite, mobility, pain_level, notes
`;

/**
 * Fetches the check-in for a given patient on a specific local calendar date.
 * Returns null if no check-in exists yet.
 */
export async function getTodayCheckin(
  patientId: string,
  checkinDate: string,
): Promise<WellbeingCheckin | null> {
  const { data, error } = await supabase
    .from('patient_wellbeing_checkins')
    .select(checkinSelect)
    .eq('patient_id', patientId)
    .eq('checkin_date', checkinDate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? fromRow(data as CheckinRow) : null;
}

/**
 * Inserts or overwrites (upserts) a patient wellbeing check-in.
 * The UNIQUE constraint on (patient_id, checkin_date) means a second
 * submission for the same day will update all columns in-place.
 */
export async function upsertCheckin(
  payload: UpsertCheckinPayload,
): Promise<WellbeingCheckin> {
  const { data, error } = await supabase
    .from('patient_wellbeing_checkins')
    .upsert(
      {
        patient_id: payload.patientId,
        group_id: payload.groupId,
        caregiver_id: payload.caregiverId,
        checkin_date: payload.checkinDate,
        mood: payload.mood,
        appetite: payload.appetite,
        mobility: payload.mobility,
        pain_level: payload.painLevel,
        notes: payload.notes,
      },
      { onConflict: 'patient_id,checkin_date' },
    )
    .select(checkinSelect)
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as CheckinRow);
}
