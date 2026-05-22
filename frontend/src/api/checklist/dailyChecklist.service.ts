import { supabase } from '@lib/supabaseClient';
import type { Medication } from '@api/medications/medications.types';
import { getMedicationsByPatient } from '@api/medications/medications.service';
import {
  computeDoseTimesForDate,
  deriveWindowBounds,
} from '@lib/medicationSchedule';
import { rowToChecklistItem, type ChecklistItem } from '@lib/checklist';
import { withDisplayStatus } from '@lib/checklistStatus';
import { parseLocalDateString } from '@lib/dates';
import { parseDosageString } from '@lib/dosage';
import type { ChecklistItemInsert, ChecklistItemRow } from '@lib/supabaseTables';

export { getCurrentCarerProfileId, markChecklistItemGiven, skipChecklistItem } from './checklistMutations.service';

const TERMINAL_ITEM_STATUSES = new Set(['given', 'skipped']);

type SyncItemRow = Pick<ChecklistItemRow, 'id' | 'medication_id' | 'scheduled_time' | 'status'>;

function checklistSlotKey(medicationId: string, scheduledTime: string): string {
  return `${medicationId}:${scheduledTime}`;
}

function buildChecklistItemInsert(
  med: Medication,
  checklistId: string,
  scheduledTime: string,
): ChecklistItemInsert {
  const { dose, unit } = parseDosageString(med.dosage);
  const bounds = deriveWindowBounds(scheduledTime);

  return {
    id: crypto.randomUUID(),
    checklist_id: checklistId,
    medication_id: med.id,
    medication_name: med.medicationName,
    dose,
    dosage_unit: unit,
    scheduled_time: scheduledTime,
    time_of_day: scheduledTime,
    window_start: bounds.window_start,
    window_end: bounds.window_end,
    status: 'due',
  };
}

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

export async function syncChecklistItems(params: {
  checklistId: string;
  patientId: string;
  checklistDate: string;
}): Promise<void> {
  const { checklistId, patientId, checklistDate } = params;

  if (!patientId.trim()) {
    throw new Error('patient_id is required to sync checklist items.');
  }

  const date = parseLocalDateString(checklistDate);
  const activeMeds = (await getMedicationsByPatient(patientId)).filter((m) => m.status === 'active');

  const { data: existingRows, error: existingErr } = await supabase
    .from('checklist_items')
    .select('id, medication_id, scheduled_time, status')
    .eq('checklist_id', checklistId);

  if (existingErr) {
    throw new Error(existingErr.message ?? 'Failed to load checklist items for sync.');
  }

  const rows = (existingRows ?? []) as SyncItemRow[];
  const expectedKeys = new Set<string>();

  for (const med of activeMeds) {
    for (const scheduledTime of computeDoseTimesForDate(med, date)) {
      expectedKeys.add(checklistSlotKey(med.id, scheduledTime));
    }
  }

  const existingKeys = new Set(
    rows.map((row) => checklistSlotKey(row.medication_id, row.scheduled_time ?? '')),
  );

  const staleIds = rows
    .filter((row) => {
      if (TERMINAL_ITEM_STATUSES.has(row.status)) return false;
      return !expectedKeys.has(checklistSlotKey(row.medication_id, row.scheduled_time ?? ''));
    })
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const { error: deleteErr } = await supabase.from('checklist_items').delete().in('id', staleIds);
    if (deleteErr) {
      throw new Error(deleteErr.message ?? 'Failed to remove stale checklist items.');
    }
  }

  const toInsert: ChecklistItemInsert[] = [];

  for (const med of activeMeds) {
    for (const scheduledTime of computeDoseTimesForDate(med, date)) {
      if (existingKeys.has(checklistSlotKey(med.id, scheduledTime))) continue;
      toInsert.push(buildChecklistItemInsert(med, checklistId, scheduledTime));
    }
  }

  if (toInsert.length === 0) return;

  const { error: insertErr } = await supabase.from('checklist_items').insert(toInsert);
  if (insertErr) {
    throw new Error(insertErr.message ?? 'Failed to insert checklist items.');
  }
}

export async function fetchChecklistItems(
  checklistId: string,
  checklistDate: string,
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('checklist_id', checklistId);

  if (error) throw new Error(error.message);

  const now = new Date();
  return (data ?? []).map((row) => withDisplayStatus(rowToChecklistItem(row), checklistDate, now));
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

  await syncChecklistItems({
    checklistId,
    patientId: params.patientId,
    checklistDate: params.checklistDate,
  });

  const items = await fetchChecklistItems(checklistId, params.checklistDate);
  return { checklistId, items };
}
