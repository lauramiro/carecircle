import { supabase } from '../../lib/supabaseClient';
import type { Allergy, CareRecipient } from './care-recipient.types';

export async function getCareRecipient(groupId: string): Promise<CareRecipient | null> {
  const { data, error } = await supabase
    .from('care_recipients')
    .select('id, group_id, full_name, date_of_birth, avatar_url, conditions, allergies')
    .eq('group_id', groupId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    groupId: data.group_id as string,
    fullName: data.full_name as string,
    dateOfBirth: data.date_of_birth as string,
    avatarUrl: (data.avatar_url as string | null) ?? undefined,
    conditions: (data.conditions as string[] | null) ?? [],
    allergies: (data.allergies as Allergy[] | null) ?? [],
  };
}

export async function uploadCareRecipientAvatar(groupId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `care-recipients/${groupId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function upsertCareRecipient(
  groupId: string,
  fullName: string,
  dateOfBirth: string,
  conditions: string[],
  allergies: Allergy[],
  avatarUrl?: string,
): Promise<void> {
  const payload: Record<string, unknown> = {
    group_id: groupId,
    full_name: fullName,
    date_of_birth: dateOfBirth,
    conditions,
    allergies,
  };

  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;

  const { error } = await supabase
    .from('care_recipients')
    .upsert(payload, { onConflict: 'group_id' });

  if (error) throw error;
}
