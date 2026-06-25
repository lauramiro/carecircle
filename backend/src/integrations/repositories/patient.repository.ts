import { Injectable } from '@nestjs/common';
import { SupabaseAdminClient } from '../supabase-admin.client';

@Injectable()
export class PatientRepository {
  constructor(private readonly supabase: SupabaseAdminClient) {}

  async findByGroupId(groupId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('id, full_name, date_of_birth, chronic_conditions, allergies')
      .eq('group_id', groupId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async findActiveMedications(patientId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('medications')
      .select(
        'medication_name, dose, dosage_unit, schedule_type, interval_hours, start_date',
      )
      .eq('patient_id', patientId)
      .eq('status', 'active');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findRecentMedicationLogs(patientId: string, since: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('medication_logs')
      .select(
        'status, actual_time, scheduled_time, notes, medications(medication_name)',
      )
      .eq('patient_id', patientId)
      .gte('scheduled_time', since)
      .order('scheduled_time', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findRecentJournalEntries(groupId: string, since: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('handover_journal_entries')
      .select('created_at, content')
      .eq('group_id', groupId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(7);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findUpcomingAppointments(patientId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('appointments')
      .select('title, start_time, location, provider_name')
      .eq('patient_id', patientId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findRecentVitalSigns(patientId: string, since: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('vital_signs')
      .select(
        'measured_at, blood_glucose, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, notes',
      )
      .eq('patient_id', patientId)
      .gte('measured_at', since)
      .order('measured_at', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findRecentWellbeingCheckins(patientId: string, since: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('patient_wellbeing_checkins')
      .select('checkin_date, mood, appetite, mobility, pain_level, notes')
      .eq('patient_id', patientId)
      .gte('checkin_date', since.split('T')[0] ?? since)
      .order('checkin_date', { ascending: false })
      .limit(7);

    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
