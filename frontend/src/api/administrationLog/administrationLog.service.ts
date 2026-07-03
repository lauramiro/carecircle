import { supabase } from '../../lib/supabaseClient';
import { CHECKLIST_PROOF_BUCKET } from '@components/checklist/medicationChecklist.constants';
import type { AdministrationLogEvent, AdministrationLogStatus } from './administrationLog.types';
import {
  formatMedicationDoseLine,
  medicationDisplayName,
  deduplicateAdministrationLogEvents,
  normalizeAdministrationLogStatus,
} from '../../utils/administrationLog.utils';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseMedication(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw) && raw[0] && isRecord(raw[0])) return raw[0];
  if (isRecord(raw)) return raw;
  return null;
}

function parseDailyChecklist(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw) && raw[0] && isRecord(raw[0])) return raw[0];
  if (isRecord(raw)) return raw;
  return null;
}

/** Medication columns on `medications` (no legacy `dosage` column). */
const MEDICATION_EMBED_SELECT = 'medication_name, name, dose, unit, dosage_unit';

function medicationNameFromRow(
  row: Record<string, unknown>,
  med: Record<string, unknown> | null,
): string {
  const snapshot = (row.medication_name as string | null)?.trim();
  if (snapshot) return snapshot;
  if (med) return medicationDisplayName(med);
  return 'Medication';
}

function doseDisplayFromRow(
  row: Record<string, unknown>,
  med: Record<string, unknown> | null,
): string {
  if (row.dose != null || row.dosage_unit != null) {
    return formatMedicationDoseLine({
      dose: row.dose as number | string | null,
      unit: row.dosage_unit as string | null,
      dosage_unit: row.dosage_unit as string | null,
    });
  }
  if (med) return formatMedicationDoseLine(med);
  return '—';
}

async function resolveLatestProofPublicUrl(checklistItemId: string): Promise<string | null> {
  try {
    const folderPath = `checklist-proofs/${checklistItemId}`;
    const { data: files, error } = await supabase.storage
      .from(CHECKLIST_PROOF_BUCKET)
      .list(folderPath, { limit: 5, sortBy: { column: 'name', order: 'desc' } });
    if (error || !files?.length) return null;
    const first = files.find(f => f.name);
    if (!first?.name) return null;
    const path = `${folderPath}/${first.name}`;
    const { data } = supabase.storage.from(CHECKLIST_PROOF_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

async function loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', unique);
  if (error || !data) return map;
  for (const row of data as { id: string; full_name: string | null }[]) {
    map.set(row.id, row.full_name?.trim() || 'Unknown carer');
  }
  return map;
}

export interface FetchAdministrationLogOptions {
  /** When true, resolves first proof image per “given” row (extra storage calls). */
  includeProofThumbnails?: boolean;
}

/**
 * Loads checklist-backed medication events for a care group (given / skipped / overdue).
 * Optional `medication_logs` rows for the same patient are merged when `patientId` is set.
 */
export async function fetchAdministrationLogEvents(
  groupId: string,
  patientId: string | null,
  options: FetchAdministrationLogOptions = {},
): Promise<AdministrationLogEvent[]> {
  const { includeProofThumbnails = false } = options;

  const { data: checklists, error: clError } = await supabase
    .from('daily_medication_checklists')
    .select('id')
    .eq('group_id', groupId);

  if (clError) {
    console.error('[administrationLog] daily_medication_checklists', clError);
  }

  const checklistIds = (checklists ?? []).map((r: { id: string }) => r.id).filter(Boolean);
  const out: AdministrationLogEvent[] = [];

  if (checklistIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select(
        `
        id,
        status,
        given_at,
        updated_at,
        skip_reason,
        skip_notes,
        given_by_carer_id,
        medication_name,
        dose,
        dosage_unit,
        scheduled_time,
        time_of_day,
        medications ( ${MEDICATION_EMBED_SELECT} ),
        daily_medication_checklists ( checklist_date )
      `,
      )
      .in('checklist_id', checklistIds)
      .in('status', ['given', 'skipped', 'overdue']);

    if (itemsError) {
      console.error('[administrationLog] checklist_items', itemsError);
    } else {
      const rows = (items ?? []) as Record<string, unknown>[];
      const carerIds = rows
        .map(r => r.given_by_carer_id as string | null)
        .filter((x): x is string => Boolean(x));
      const profileMap = await loadProfileNames(carerIds);

      for (const row of rows) {
        const status = row.status as AdministrationLogStatus;
        if (status !== 'given' && status !== 'skipped' && status !== 'overdue') continue;

        const med = parseMedication(row.medications);
        const dmc = parseDailyChecklist(row.daily_medication_checklists);
        const checklistDate = (dmc?.checklist_date as string | undefined) ?? undefined;
        const medName = medicationNameFromRow(row, med);
        const doseDisplay = doseDisplayFromRow(row, med);

        const occurred =
          status === 'given' && row.given_at
            ? (row.given_at as string)
            : (row.updated_at as string) || (row.given_at as string) || new Date().toISOString();

        const carerId = (row.given_by_carer_id as string | null) ?? null;
        const carerName =
          status === 'skipped'
            ? carerId
              ? profileMap.get(carerId) ?? 'Unknown carer'
              : '—'
            : carerId
              ? profileMap.get(carerId) ?? 'Unknown carer'
              : status === 'overdue'
                ? '—'
                : 'Unknown carer';

        let photoFullUrl: string | null = null;
        if (status === 'given' && includeProofThumbnails) {
          photoFullUrl = await resolveLatestProofPublicUrl(row.id as string);
        }

        out.push({
          id: `checklist:${String(row.id)}`,
          source: 'checklist_item',
          occurredAtIso: occurred,
          status,
          medicationName: medName,
          doseDisplay,
          carerName,
          checklistDate,
          scheduledTimeLabel:
            (row.scheduled_time as string | undefined) ??
            (row.time_of_day as string | undefined),
          notes: (row.skip_notes as string | null) ?? null,
          photoThumbnailUrl: photoFullUrl,
          photoFullUrl,
        });
      }
    }
  }

  if (patientId) {
    const { data: logs, error: logError } = await supabase
      .from('medication_logs')
      .select(
        `
        id,
        status,
        created_at,
        scheduled_time,
        dosage_taken,
        notes,
        logged_by,
        medication_id,
        medications ( ${MEDICATION_EMBED_SELECT} )
      `,
      )
      .eq('patient_id', patientId)
      .in('status', ['overdue', 'given', 'skipped', 'taken', 'missed']);

    if (logError) {
      if (logError.code !== 'PGRST116' && logError.code !== '42P01') {
        console.error('[administrationLog] medication_logs', logError);
      }
    } else {
      const logRows = (logs ?? []) as Record<string, unknown>[];
      const logCarerIds = logRows
        .map(r => r.logged_by as string | null)
        .filter((x): x is string => Boolean(x));
      const logProfileMap = await loadProfileNames(logCarerIds);

      for (const row of logRows) {
        const st = normalizeAdministrationLogStatus(row.status as string);
        if (!st) continue;
        const med = parseMedication(row.medications);
        const loggedBy = row.logged_by as string | null;
        const medName = med ? medicationDisplayName(med) : 'Medication';
        const doseDisplay =
          typeof row.dosage_taken === 'string' && row.dosage_taken.trim()
            ? row.dosage_taken
            : med
              ? formatMedicationDoseLine(med)
              : '—';
        const carerName = loggedBy ? logProfileMap.get(loggedBy) ?? 'Unknown carer' : '—';

        out.push({
          id: `log:${String(row.id)}`,
          source: 'medication_log',
          occurredAtIso: (row.created_at as string) || new Date().toISOString(),
          status: st,
          medicationName: medName,
          doseDisplay,
          carerName,
          scheduledTimeLabel: row.scheduled_time as string | undefined,
          notes: (row.notes as string | null) ?? null,
          photoThumbnailUrl: null,
          photoFullUrl: null,
        });
      }
    }
  }

  return deduplicateAdministrationLogEvents(out);
}
