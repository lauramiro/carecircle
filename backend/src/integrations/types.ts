export type MedicationStatus =
  | 'active'
  | 'paused'
  | 'archived'
  | 'superseded'
  | 'discontinued';
export type ScheduleType =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'as_needed';
export type ChecklistItemStatus =
  | 'due'
  | 'given'
  | 'overdue'
  | 'skipped'
  | 'archived';
export type ChecklistScheduleStatus =
  | 'pending'
  | 'done'
  | 'archived'
  | 'failed';
export type AlertStatus =
  | 'pending_push'
  | 'push_sent'
  | 'sms_sent'
  | 'cancelled'
  | 'push_failed'
  | 'sms_failed';

export interface MedicationRecord {
  id: string;
  patient_id: string;
  medication_name: string;
  dose: number;
  unit: string;
  schedule_type: ScheduleType | null;
  specific_times: string[] | null;
  interval_hours: number | null;
  days_of_week: number[] | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  status: MedicationStatus;
  perpetual: boolean;
  total_doses: number | null;
  quantity_on_hand: number | null;
  low_stock_alert_threshold_days: number;
  low_stock_alert_sent_at: string | null;
  materialization_cursor_at: string | null;
}

export interface ChecklistItemRecord {
  id: string;
  checklist_id: string;
  medication_id: string;
  medication_name: string | null;
  dose: number | null;
  dosage_unit: string | null;
  scheduled_time: string | null;
  scheduled_at: string | null;
  window_start: string | null;
  window_end: string | null;
  status: ChecklistItemStatus;
  group_id: string | null;
  patient_id: string | null;
  timezone: string;
  given_at: string | null;
  skip_reason: string | null;
  overdue_at: string | null;
  archived_at: string | null;
}

export interface ChecklistScheduleRecord {
  id: string;
  medication_id: string;
  next_compute_at: string;
  cursor_at: string | null;
  status: ChecklistScheduleStatus;
  last_error: string | null;
}

export interface MissedMedicationAlertRecord {
  id: string;
  checklist_item_id: string;
  group_id: string;
  patient_id: string;
  medication_id: string;
  patient_first_name: string;
  medication_name: string;
  dose_summary: string;
  minutes_overdue: number;
  scheduled_at: string;
  overdue_detected_at: string;
  push_body: string;
  sms_body: string;
  deep_link_url: string;
  push_recipient_user_ids: string[];
  sms_phone_numbers: string[];
  push_due_at: string;
  push_sent_at: string | null;
  sms_due_at: string | null;
  sms_sent_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  status: AlertStatus;
  push_delivery_log: unknown[];
  sms_delivery_log: unknown[];
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  platform: 'web_push' | 'fcm';
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
}

export interface GroupContext {
  groupId: string;
  patientId: string;
  preferredTimezone: string;
  patientFirstName: string;
}

export interface ActiveGroupMembers {
  groupMembersIds: string[];
  groupMembersPhoneNumbers: string[];
}

export interface ChecklistItemInsert {
  checklist_id: string;
  medication_id: string;
  medication_name: string;
  dose: number;
  dosage_unit: string;
  scheduled_time: string;
  time_of_day: string;
  window_start: string;
  window_end: string;
  scheduled_at: string;
  status: 'due';
  group_id: string;
  patient_id: string;
  timezone: string;
}

export interface AlertInsert {
  checklist_item_id: string;
  group_id: string;
  patient_id: string;
  medication_id: string;
  patient_first_name: string;
  medication_name: string;
  dose_summary: string;
  minutes_overdue: number;
  scheduled_at: string;
  push_body: string;
  sms_body: string;
  deep_link_url: string;
  push_recipient_user_ids: string[];
  sms_phone_numbers: string[];
  status: 'pending_push';
}
