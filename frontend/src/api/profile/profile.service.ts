import { supabase } from '../../lib/supabaseClient';
import type { UserProfile } from './profile.types';

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, date_of_birth, avatar_url')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    fullName: data.full_name as string,
    dateOfBirth: data.date_of_birth as string,
    avatarUrl: (data.avatar_url as string | null) ?? undefined,
  };
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

export async function upsertProfile(
  userId: string,
  fullName: string,
  dateOfBirth: string,
  avatarUrl?: string,
): Promise<void> {
  const payload: Record<string, unknown> = {
    id: userId,
    full_name: fullName,
    date_of_birth: dateOfBirth,
  };

  if (avatarUrl !== undefined) {
    payload.avatar_url = avatarUrl;
  }

  const { error } = await supabase.from('profiles').upsert(payload);
  if (error) throw error;
}
