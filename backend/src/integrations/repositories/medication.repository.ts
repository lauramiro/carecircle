/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { SupabaseAdminClient } from '../supabase-admin.client';
import type { MedicationRecord } from '../types';

@Injectable()
export class MedicationRepository {
  constructor(private readonly supabase: SupabaseAdminClient) {}

  async findById(id: string): Promise<MedicationRecord | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as MedicationRecord | null;
  }

  async findActiveNonAsNeeded(limit = 500): Promise<MedicationRecord[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .select('*')
      .eq('status', 'active')
      .neq('schedule_type', 'as_needed')
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as MedicationRecord[];
  }

  async findPendingLowStockAlertCandidates(
    limit = 100,
  ): Promise<MedicationRecord[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .select('*')
      .eq('status', 'active')
      .not('quantity_on_hand', 'is', null)
      .is('low_stock_alert_sent_at', null)
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as MedicationRecord[];
  }

  async updateMaterializationCursor(
    medicationId: string,
    cursorAt: string | null,
  ): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('medications')
      .update({
        materialization_cursor_at: cursorAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicationId);

    if (error) throw new Error(error.message);
  }

  async resetMaterializationCursor(medicationId: string): Promise<void> {
    await this.updateMaterializationCursor(medicationId, null);
  }

  async updateStatus(
    medicationId: string,
    status: string,
  ): Promise<MedicationRecord> {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', medicationId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as MedicationRecord;
  }

  async insert(row: Record<string, unknown>): Promise<MedicationRecord> {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .insert(row)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as MedicationRecord;
  }

  async update(
    medicationId: string,
    changes: Record<string, unknown>,
  ): Promise<MedicationRecord> {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', medicationId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as MedicationRecord;
  }

  async markLowStockAlertSent(
    medicationId: string,
    sentAt: string,
  ): Promise<MedicationRecord | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .update({
        low_stock_alert_sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq('id', medicationId)
      .is('low_stock_alert_sent_at', null)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as MedicationRecord | null;
  }

  async clearLowStockAlertSent(
    medicationId: string,
    sentAt: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('medications')
      .update({
        low_stock_alert_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', medicationId)
      .eq('low_stock_alert_sent_at', sentAt);

    if (error) throw new Error(error.message);
  }
}
