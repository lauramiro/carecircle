import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@lib/supabaseClient';
import { summarizeChecklist, rowToChecklistItem, type ChecklistItem, type ChecklistSummary } from '@lib/checklist';
import type { ChecklistItemRow } from '@lib/supabaseTables';
import { fetchChecklistItems } from '@api/checklist/dailyChecklist.service';
import { toLocalDateString } from '@lib/dates';

export interface MedicationSummaryState {
  summary: ChecklistSummary;
  checklistId: string | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_SUMMARY: ChecklistSummary = { total: 0, due: 0, given: 0, overdue: 0, skipped: 0, remaining: 0 };

export function useMedicationSummary(patientId: string, groupId: string): MedicationSummaryState {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = toLocalDateString();

  useEffect(() => {
    if (!patientId || !groupId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    async function loadSummary() {
      try {
        const { data, error: checklistError } = await supabase
          .from('daily_medication_checklists')
          .select('id')
          .eq('checklist_date', today)
          .eq('patient_id', patientId)
          .maybeSingle();

        if (!active) return;
        if (checklistError) {
          setError('Failed to load medication data.');
          return;
        }
        if (!data?.id) {
          setChecklistId(null);
          setItems([]);
          return;
        }
        setChecklistId(data.id);
        const fetched = await fetchChecklistItems(data.id, today);
        if (active) setItems(fetched);
      } catch {
        if (active) setError('Failed to load medication data.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSummary();

    return () => { active = false; };
  }, [patientId, groupId, today]);

  useEffect(() => {
    if (!checklistId) return;

    const channel = supabase
      .channel(`dashboard-checklist-${checklistId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items', filter: `checklist_id=eq.${checklistId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const row = payload.new as ChecklistItemRow;
            try {
              const updated = rowToChecklistItem(row);
              setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            } catch { /* skip malformed rows */ }
            return;
          }
          if (payload.eventType === 'INSERT') {
            try {
              const inserted = rowToChecklistItem(payload.new as ChecklistItemRow);
              setItems((prev) => (prev.some((i) => i.id === inserted.id) ? prev : [...prev, inserted]));
            } catch { /* skip */ }
            return;
          }
          if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [checklistId]);

  const summary = useMemo(() => summarizeChecklist(items), [items]);

  return { summary: loading ? EMPTY_SUMMARY : summary, checklistId, loading, error };
}
