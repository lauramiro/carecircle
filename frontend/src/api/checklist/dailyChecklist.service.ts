import { supabase } from '../../lib/supabaseClient';

function dailyChecklistsTable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('daily_medication_checklists');
}

// ── Time window mapping (used by createChecklistItems) ──────────────
const TIME_WINDOWS = [
  { label: 'morning' as const,   start: '06:00', end: '11:59' },
  { label: 'afternoon' as const, start: '12:00', end: '16:59' },
  { label: 'evening' as const,   start: '17:00', end: '20:59' },
  { label: 'night' as const,     start: '21:00', end: '05:59' },
];

function getTimeWindow(time: string) {
  const [h, m] = time.split(':').map(Number);
  const minutes = h * 60 + m;
  if (minutes >= 21 * 60 || minutes < 6 * 60) return TIME_WINDOWS[3];
  if (minutes >= 6 * 60 && minutes < 12 * 60) return TIME_WINDOWS[0];
  if (minutes >= 12 * 60 && minutes < 17 * 60) return TIME_WINDOWS[1];
  return TIME_WINDOWS[2];
}

const DAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

function getNumericDay(jsDay: number) {
  return jsDay === 0 ? 7 : jsDay;
}

// ── Exported helpers ────────────────────────────────────────────────

/**
 * Ensures a daily checklist row exists and returns its ID.
 * Pure lookup/create – does NOT populate items.
 */
export async function getOrCreateDailyChecklistId(params: {
  patientId: string;
  groupId: string;
  checklistDate: string; // YYYY-MM-DD
}): Promise<string | null> {
  const { patientId, groupId, checklistDate } = params;
  const table = dailyChecklistsTable();

  console.log('[getOrCreateDailyChecklistId] Starting', { patientId, groupId, checklistDate });

  // 1. Try patient_id
  const { data: byPatient, error: patientErr } = await table
    .select('id')
    .eq('checklist_date', checklistDate)
    .eq('patient_id', patientId)
    .maybeSingle();

  if (patientErr) {
    console.error('[getOrCreateDailyChecklistId] patient_id lookup failed', patientErr);
  } else if (byPatient?.id) {
    console.log('[getOrCreateDailyChecklistId] Found by patient_id');
    return byPatient.id;
  }

  // 2. Try group_id
  const { data: byGroup, error: groupErr } = await table
    .select('id')
    .eq('checklist_date', checklistDate)
    .eq('group_id', groupId)
    .maybeSingle();

  if (groupErr) {
    console.error('[getOrCreateDailyChecklistId] group_id lookup failed', groupErr);
  } else if (byGroup?.id) {
    console.log('[getOrCreateDailyChecklistId] Found by group_id');
    return byGroup.id;
  }

  // 3. Create new row
  console.log('[getOrCreateDailyChecklistId] Creating new daily checklist');
  const { data: created, error: insertErr } = await table
    .insert({
      id: crypto.randomUUID(),
      patient_id: patientId,
      group_id: groupId,
      checklist_date: checklistDate,
      status: 'active',
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[getOrCreateDailyChecklistId] Create failed', insertErr);
    return null;
  }

  return created.id;
}

/**
 * Populates checklist_items from active medications if none exist.
 */
export async function populateChecklistItems(params: {
  checklistId: string;
  patientId: string;
  checklistDate: string;
}): Promise<void> {
  const hasItems = await checklistHasItems(params.checklistId);
  if (!hasItems) {
    await createChecklistItems(params);
  }
}

// ── Internal helpers ────────────────────────────────────────────────

async function checklistHasItems(checklistId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('id')
    .eq('checklist_id', checklistId)
    .limit(1);

  if (error) {
    console.error('[checklistHasItems] Error checking items', error);
    return false;
  }
  return (data && data.length > 0) ? true : false;
}

async function createChecklistItems(params: {
  checklistId: string;
  patientId: string;
  checklistDate: string;
}): Promise<void> {
  const { checklistId, patientId, checklistDate } = params;

  console.log('[createChecklistItems] Starting (medications source)', { checklistId, patientId, checklistDate });

  const date = new Date(`${checklistDate}T00:00:00`);
  const jsDay = date.getDay();
  const numericDay = getNumericDay(jsDay);

  const { data: meds, error: medsErr } = await supabase
    .from('medications')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .lte('start_date', checklistDate)
    .or(`end_date.is.null,end_date.gte.${checklistDate}`);

  if (medsErr) {
    console.error('[createChecklistItems] Fetch medications failed', medsErr);
    return;
  }

  if (!meds || meds.length === 0) {
    console.warn('[createChecklistItems] No active medications found');
    return;
  }

  const todayMeds = meds.filter((med: any) => {
    const st = med.schedule_type;
    if (!st || st === 'as_needed') return false;
    if (st === 'daily') return true;
    if (st === 'weekly') {
      const days: number[] = med.days_of_week || [];
      return days.includes(numericDay);
    }
    if (st === 'biweekly') return true;
    if (st === 'monthly') {
      return med.day_of_month === date.getDate();
    }
    return false;
  });

  if (todayMeds.length === 0) {
    console.log('[createChecklistItems] No medications scheduled for today');
    return;
  }

  const items: any[] = [];
  for (const med of todayMeds) {
    const times: string[] = med.specific_times || [];
    if (times.length === 0) continue;
    for (const time of times) {
      const window = getTimeWindow(time);
      items.push({
        id: crypto.randomUUID(),
        checklist_id: checklistId,
        medication_id: med.id,
        time_of_day: window.label,
        window_start: window.start,
        window_end: window.end,
        status: 'due',
      });
    }
  }

  if (items.length === 0) {
    console.warn('[createChecklistItems] No times to create items from');
    return;
  }

  const { error: insertErr } = await supabase.from('checklist_items').insert(items);
  if (insertErr) {
    console.error('[createChecklistItems] Insert failed', insertErr);
    return;
  }

  console.log(`[createChecklistItems] Successfully created ${items.length} checklist item(s)`);
}