import { Injectable, Logger } from '@nestjs/common';
import { SupabaseAdminClient } from '../supabase-admin.client';
import type {
  ChecklistItemInsert,
  ChecklistItemRecord,
  ChecklistScheduleRecord,
} from '../types';

@Injectable()
export class ChecklistRepository {
  private readonly logger = new Logger(ChecklistRepository.name);

  constructor(private readonly supabase: SupabaseAdminClient) {}

  async ensureDailyChecklist(params: {
    patientId: string;
    groupId: string;
    checklistDate: string;
  }): Promise<string> {
    const { patientId, groupId, checklistDate } = params;
    const client = this.supabase.getClient();

    const { data: existing, error: lookupErr } = await client
      .from('daily_medication_checklists')
      .select('id')
      .eq('checklist_date', checklistDate)
      .eq('patient_id', patientId)
      .maybeSingle();

    if (lookupErr) throw new Error(lookupErr.message);
    if (existing?.id) return existing.id as string;

    const { data: created, error: insertErr } = await client
      .from('daily_medication_checklists')
      .insert({
        patient_id: patientId,
        group_id: groupId,
        checklist_date: checklistDate,
        status: 'active',
      })
      .select('id')
      .single();

    if (insertErr) throw new Error(insertErr.message);
    return created.id as string;
  }

  async insertChecklistItems(items: ChecklistItemInsert[]): Promise<number> {
    if (items.length === 0) return 0;

    let inserted = 0;
    for (const item of items) {
      const { error } = await this.supabase
        .getClient()
        .from('checklist_items')
        .insert(item);
      if (error) {
        if (error.code === '23505') continue;
        this.logger.error(
          `checklist_item_insert_failed medicationId=${item.medication_id} scheduledTime=${item.scheduled_time} checklistId=${item.checklist_id} code=${error.code ?? 'unknown'} details=${error.details ?? ''} hint=${error.hint ?? ''}`,
        );
        throw new Error(
          `Failed to insert checklist item (medication=${item.medication_id}, time=${item.scheduled_time}, date=${item.scheduled_at}): ${error.message}`,
        );
      }
      inserted++;
    }
    return inserted;
  }

  async countFutureDueItems(medicationId: string): Promise<number> {
    const now = new Date().toISOString();
    const { count, error } = await this.supabase
      .getClient()
      .from('checklist_items')
      .select('id', { count: 'exact', head: true })
      .eq('medication_id', medicationId)
      .eq('status', 'due')
      .gt('scheduled_at', now);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async archiveFutureDueItems(medicationId: string): Promise<number> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('checklist_items')
      .update({
        status: 'archived',
        archived_at: now,
        updated_at: now,
      })
      .eq('medication_id', medicationId)
      .eq('status', 'due')
      .gt('scheduled_at', now)
      .select('id');

    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }

  async findById(itemId: string): Promise<ChecklistItemRecord | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('checklist_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as ChecklistItemRecord | null;
  }

  async markOverdue(itemId: string, overdueAt: string): Promise<boolean> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('checklist_items')
      .update({ status: 'overdue', overdue_at: overdueAt, updated_at: now })
      .eq('id', itemId)
      .eq('status', 'due')
      .select('id');

    if (error) throw new Error(error.message);
    return (data?.length ?? 0) > 0;
  }

  async findDueItemsPastThreshold(
    limit: number,
  ): Promise<ChecklistItemRecord[]> {
    const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('checklist_items')
      .select('*')
      .eq('status', 'due')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', threshold)
      .is('given_at', null)
      .is('skip_reason', null)
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as ChecklistItemRecord[];
  }

  async upsertSchedule(params: {
    medicationId: string;
    nextComputeAt: string;
    cursorAt: string | null;
    status: 'pending' | 'done' | 'archived' | 'failed';
    lastError?: string | null;
  }): Promise<void> {
    const client = this.supabase.getClient();
    const { medicationId, nextComputeAt, cursorAt, status, lastError } = params;

    const { data: existing } = await client
      .from('checklist_schedule')
      .select('id')
      .eq('medication_id', medicationId)
      .eq('status', 'pending')
      .maybeSingle();

    const row = {
      medication_id: medicationId,
      next_compute_at: nextComputeAt,
      cursor_at: cursorAt,
      status,
      last_error: lastError ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await client
        .from('checklist_schedule')
        .update(row)
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
      return;
    }

    const { error } = await client.from('checklist_schedule').insert(row);
    if (error) throw new Error(error.message);
  }

  async archiveSchedulesForMedication(medicationId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .getClient()
      .from('checklist_schedule')
      .update({ status: 'archived', updated_at: now })
      .eq('medication_id', medicationId)
      .neq('status', 'done');

    if (error) throw new Error(error.message);
  }

  async findPendingSchedulesDue(
    withinHours: number,
    limit: number,
  ): Promise<ChecklistScheduleRecord[]> {
    const cutoff = new Date(
      Date.now() + withinHours * 60 * 60 * 1000,
    ).toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('checklist_schedule')
      .select('*')
      .eq('status', 'pending')
      .lte('next_compute_at', cutoff)
      .order('next_compute_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as ChecklistScheduleRecord[];
  }
}
