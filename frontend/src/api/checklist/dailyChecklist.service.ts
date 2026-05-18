import { supabase } from '../../lib/supabaseClient';

/** Until `database.types.ts` includes checklist tables, query without the strict `Database` generic. */
function dailyChecklistsTable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table missing from generated `Database`
  return (supabase as any).from('daily_medication_checklists');
}

/**
 * Resolves the `daily_medication_checklists` row for a calendar day.
 * Tries `patient_id` first, then `family_id` (some deployments key the checklist by care group id).
 */
export async function fetchDailyChecklistId(params: {
  patientId: string;
  groupId: string;
  checklistDate: string;
}): Promise<string | null> {
  const { patientId, groupId, checklistDate } = params;

  const { data: byPatient, error: patientErr } = await dailyChecklistsTable()
    .select('id')
    .eq('checklist_date', checklistDate)
    .eq('patient_id', patientId)
    .maybeSingle();

  if (patientErr) {
    console.error('[fetchDailyChecklistId] patient_id lookup failed', patientErr);
  } else if (byPatient?.id) {
    return byPatient.id;
  }

  const { data: byFamily, error: familyErr } = await dailyChecklistsTable()
    .select('id')
    .eq('checklist_date', checklistDate)
    .eq('family_id', groupId)
    .maybeSingle();

  if (familyErr) {
    console.error('[fetchDailyChecklistId] family_id lookup failed', familyErr);
    return null;
  }

  return byFamily?.id ?? null;
}
