import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { toLocalDateString } from './local_date';

const JOB_INTERVAL = process.env.OVERDUE_CHECK_INTERVAL || '*/5 * * * *';

function isOverdue(
  scheduledTime: string,
  checklistDate: string,
  now: Date,
): boolean {
  const scheduledAt = new Date(`${checklistDate}T${scheduledTime}:00`);
  return now > scheduledAt;
}

export function startOverdueDetectionJob() {
  console.log(`[OverdueDetectionJob] Starting with interval: ${JOB_INTERVAL}`);

  cron.schedule(JOB_INTERVAL, async () => {
    try {
      await checkAndUpdateOverdueItems();
    } catch (err) {
      console.error('[OverdueDetectionJob] Error:', err);
    }
  });
}

export async function checkAndUpdateOverdueItems() {
  const now = new Date();
  const today = toLocalDateString(now);

  const { data: checklists, error: fetchError } = await supabase
    .from('daily_medication_checklists')
    .select(`
      id,
      checklist_date,
      patient_id,
      items:checklist_items(
        id,
        medication_id,
        status,
        scheduled_time,
        window_start,
        given_at,
        skip_reason
      )
    `)
    .eq('checklist_date', today);

  if (fetchError) throw fetchError;
  if (!checklists?.length) return;

  for (const checklist of checklists) {
    for (const item of checklist.items ?? []) {
      if (item.status !== 'due') continue;
      if (item.given_at || item.skip_reason) continue;

      const scheduledTime = item.scheduled_time;
      if (!scheduledTime) continue;
      if (!isOverdue(scheduledTime, checklist.checklist_date, now)) continue;

      await supabase
        .from('checklist_items')
        .update({ status: 'overdue', updated_at: now.toISOString() })
        .eq('id', item.id);

      await supabase.from('medication_logs').insert({
        medication_id: item.medication_id,
        patient_id: checklist.patient_id,
        status: 'overdue',
        scheduled_time: scheduledTime,
        created_at: now.toISOString(),
      });
    }
  }
}
