import { supabase } from '../../lib/supabaseClient';
import type { Allergy, Patient } from './patient.types';

export async function getPatient(groupId: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, date_of_birth, chronic_conditions, allergies, avatar_url')
    .eq('group_id', groupId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    fullName: data.full_name as string,
    dateOfBirth: data.date_of_birth as string,
    chronicConditions: (data.chronic_conditions as string[] | null) ?? [],
    allergies: (data.allergies as Allergy[] | null) ?? [],
    avatarUrl: (data.avatar_url as string | null) ?? undefined,
  };
}

export async function uploadPatientAvatar(patientId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `patients/${patientId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function upsertPatient(
  groupId: string,
  fullName: string,
  dateOfBirth: string,
  chronicConditions: string[],
  allergies: Allergy[],
  avatarUrl?: string,
): Promise<void> {
  const payload: Record<string, unknown> = {
    group_id: groupId,
    full_name: fullName,
    date_of_birth: dateOfBirth,
    chronic_conditions: chronicConditions,
    allergies,
  };

  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;

  const { error } = await supabase
    .from('patients')
    .upsert(payload, { onConflict: 'group_id' });

  if (error) throw error;
}
