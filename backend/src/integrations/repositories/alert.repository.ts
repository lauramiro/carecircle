/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { SupabaseAdminClient } from '../supabase-admin.client';
import type {
  AlertInsert,
  AlertStatus,
  MissedMedicationAlertRecord,
} from '../types';

@Injectable()
export class AlertRepository {
  constructor(private readonly supabase: SupabaseAdminClient) {}

  async insertAlert(
    alert: AlertInsert,
  ): Promise<MissedMedicationAlertRecord | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('missed_medications_alert')
      .insert(alert)
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') return null;
      throw new Error(error.message);
    }
    return data as MissedMedicationAlertRecord;
  }

  async updateAfterPush(
    alertId: string,
    params: {
      pushSentAt: string;
      smsDueAt: string;
      status: AlertStatus;
      pushDeliveryLog: unknown[];
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('missed_medications_alert')
      .update({
        push_sent_at: params.pushSentAt,
        sms_due_at: params.smsDueAt,
        status: params.status,
        push_delivery_log: params.pushDeliveryLog,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw new Error(error.message);
  }

  async findSmsDueAlerts(
    limit: number,
  ): Promise<MissedMedicationAlertRecord[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('missed_medications_alert')
      .select('*')
      .in('status', ['push_sent', 'push_failed'])
      .is('sms_sent_at', null)
      .is('cancelled_at', null)
      .lte('sms_due_at', now)
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as MissedMedicationAlertRecord[];
  }

  async markSmsSent(
    alertId: string,
    params: {
      smsSentAt: string;
      smsDeliveryLog: unknown[];
      status: AlertStatus;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('missed_medications_alert')
      .update({
        sms_sent_at: params.smsSentAt,
        sms_delivery_log: params.smsDeliveryLog,
        status: params.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw new Error(error.message);
  }

  async cancelOpenAlert(
    checklistItemId: string,
    reason: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .getClient()
      .from('missed_medications_alert')
      .update({
        cancelled_at: now,
        cancellation_reason: reason,
        status: 'cancelled',
        updated_at: now,
      })
      .eq('checklist_item_id', checklistItemId)
      .in('status', ['pending_push', 'push_sent', 'push_failed'])
      .is('sms_sent_at', null);

    if (error) throw new Error(error.message);
  }

  async cancelOpenAlertsForMedication(
    medicationId: string,
    reason: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .getClient()
      .from('missed_medications_alert')
      .update({
        cancelled_at: now,
        cancellation_reason: reason,
        status: 'cancelled',
        updated_at: now,
      })
      .eq('medication_id', medicationId)
      .in('status', ['pending_push', 'push_sent', 'push_failed'])
      .is('sms_sent_at', null);

    if (error) throw new Error(error.message);
  }

  /**
   * Returns the most recent alert row for a given checklist item — used after
   * cancellation to retrieve the group_id and push_recipient_user_ids needed
   * to fire a silent dismiss push to all other group devices.
   */
  async findCancelledAlertByItemId(
    checklistItemId: string,
  ): Promise<Pick<
    MissedMedicationAlertRecord,
    'id' | 'group_id' | 'push_recipient_user_ids' | 'checklist_item_id'
  > | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('missed_medications_alert')
      .select('id, group_id, push_recipient_user_ids, checklist_item_id')
      .eq('checklist_item_id', checklistItemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  }
}
