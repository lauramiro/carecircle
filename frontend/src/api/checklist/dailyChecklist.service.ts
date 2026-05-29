import { supabase } from '@lib/supabaseClient';
import { rowToChecklistItem, type ChecklistItem } from '@lib/checklist';

export { getCurrentCarerProfileId, markChecklistItemGiven, skipChecklistItem } from './checklistMutations.service';

export async function getOrCreateDailyChecklistId(params: {
  patientId: string;
  groupId: string;
  checklistDate: string;
}): Promise<string | null> {
  const { patientId, groupId, checklistDate } = params;

  if (!patientId.trim()) {
    throw new Error('patient_id is required to load or create a daily checklist.');
  }

  const { data: existing, error: lookupErr } = await supabase
    .from('daily_medication_checklists')
    .select('id')
    .eq('checklist_date', checklistDate)
    .eq('patient_id', patientId)
    .maybeSingle();

  if (lookupErr) {
    throw new Error(lookupErr.message ?? 'Failed to look up daily checklist.');
  }

  if (existing?.id) return existing.id;

  const { data: created, error: insertErr } = await supabase
    .from('daily_medication_checklists')
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
    throw new Error(insertErr.message ?? 'Failed to create daily checklist.');
  }

  return created.id;
}

export async function fetchChecklistItems(
  checklistId: string,
  _checklistDate: string,
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('checklist_id', checklistId)
    .neq('status', 'archived');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => rowToChecklistItem(row));
}

export async function loadDailyChecklist(params: {
  patientId: string;
  groupId: string;
  checklistDate: string;
}): Promise<{ checklistId: string | null; items: ChecklistItem[] }> {
  const checklistId = await getOrCreateDailyChecklistId(params);
  if (!checklistId) {
    return { checklistId: null, items: [] };
  }

  const items = await fetchChecklistItems(checklistId, params.checklistDate);
  return { checklistId, items };
}
