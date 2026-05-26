import type { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabaseClient';
import type { CreateWellbeingCheckInInput, WellbeingCheckIn } from './wellbeing.types';

type WellbeingCheckInRow = Database['public']['Tables']['primary_carer_wellbeing_checkins']['Row'];

export function getCurrentWeekStartIso(now = new Date()): string {
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offsetFromMonday = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - offsetFromMonday);
  return utcDate.toISOString().slice(0, 10);
}

function mapWellbeingCheckIn(row: WellbeingCheckInRow): WellbeingCheckIn {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    weekStart: row.week_start,
    sleepQuality: row.sleep_quality,
    stressLevel: row.stress_level,
    overwhelmLevel: row.overwhelm_level,
    socialConnection: row.social_connection,
    overallMood: row.overall_mood,
    compositeScore: row.composite_score,
  };
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');
  return user.id;
}

export async function isCurrentUserPrimaryCarer(): Promise<boolean> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('care_givers')
    .select('group_id')
    .eq('caregiver_id', userId)
    .eq('status', 'active')
    .eq('role_in_care', 'primary_carer')
    .limit(1);

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export async function getCurrentUserWellbeingCheckIns(weeks = 8): Promise<WellbeingCheckIn[]> {
  const userId = await getCurrentUserId();
  const cutoffDate = new Date(`${getCurrentWeekStartIso()}T00:00:00.000Z`);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - Math.max(0, weeks - 1) * 7);

  const { data, error } = await supabase
    .from('primary_carer_wellbeing_checkins')
    .select('*')
    .eq('carer_id', userId)
    .gte('week_start', cutoffDate.toISOString().slice(0, 10))
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as WellbeingCheckInRow[]).map(mapWellbeingCheckIn);
}

export async function createWellbeingCheckIn(
  input: CreateWellbeingCheckInInput,
): Promise<WellbeingCheckIn> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('primary_carer_wellbeing_checkins')
    .insert({
      carer_id: userId,
      sleep_quality: input.sleepQuality,
      stress_level: input.stressLevel,
      overwhelm_level: input.overwhelmLevel,
      social_connection: input.socialConnection,
      overall_mood: input.overallMood,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already completed this week\'s wellbeing check-in.');
    }
    throw new Error(error.message);
  }

  return mapWellbeingCheckIn(data as WellbeingCheckInRow);
}