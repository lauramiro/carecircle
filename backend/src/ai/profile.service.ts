import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { supabase } from '../lib/supabase';
import type { CareProfileContext } from '../prompts/care-profile.prompt';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  /**
   * Fetches the full care profile for a patient.
   * Re-fetched on every request — never cached.
   */
  async getCareProfile(groupId: string): Promise<CareProfileContext> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // Fetch patient base info
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, full_name, date_of_birth, chronic_conditions, allergies')
      .eq('group_id', groupId)
      .maybeSingle();

    if (patientError || !patient) {
      this.logger.error(`Patient not found for group ${groupId}`, {
        groupId,
        supabaseError: patientError,
      } as any);
      throw new NotFoundException(`Patient not found for group ${groupId}`);
    }

    const patientId = patient.id;

    // Fetch active medications
    const { data: medications, error: medicationsError } = await supabase
      .from('medications')
      .select('medication_name, dose, dosage_unit, schedule_type, interval_hours, start_date')
      .eq('patient_id', patientId)
      .eq('status', 'active');
    if (medicationsError) {
      this.logger.warn(`Medications query error for patient ${patientId}:`, medicationsError);
    } else {
      this.logger.log(`Fetched ${medications?.length ?? 0} active medications for patient ${patientId}`);
    }

    // Fetch last 7 days of medication logs
    const { data: logs, error: logsError } = await supabase
      .from('medication_logs')
      .select('status, actual_time, notes, medications(medication_name)')
      .eq('patient_id', patientId)
      .gte('scheduled_time', sevenDaysAgoStr)
      .order('scheduled_time', { ascending: false })
      .limit(20);
    if (logsError) {
      this.logger.warn(`Medication logs query error for patient ${patientId}:`, logsError);
    } else {
      this.logger.log(`Fetched ${logs?.length ?? 0} medication logs for patient ${patientId}`);
    }

    // Fetch last 7 journal entries (from handover_journal_entries table)
    const { data: journal, error: journalError } = await supabase
      .from('handover_journal_entries')
      .select('created_at, content')
      .eq('group_id', groupId)
      .gte('created_at', sevenDaysAgoStr)
      .order('created_at', { ascending: false })
      .limit(7);
    if (journalError) {
      this.logger.warn(`Journal query error for patient ${patientId}:`, journalError);
    } else {
      this.logger.log(`Fetched ${journal?.length ?? 0} journal entries for patient ${patientId}`);
    }

    // Fetch next 3 appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('title, start_time, location, provider_name')
      .eq('patient_id', patientId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);
    if (appointmentsError) {
      this.logger.warn(`Appointments query error for patient ${patientId}:`, appointmentsError);
    } else {
      this.logger.log(`Fetched ${appointments?.length ?? 0} upcoming appointments for patient ${patientId}`);
    }

    return {
      patientName: patient.full_name,
      dateOfBirth: patient.date_of_birth,
      conditions: (patient.chronic_conditions as string[]) ?? [],
      allergies: (patient.allergies as string[]) ?? [],
      medications: (medications ?? []).map((m: any) => {
        const frequency = m.schedule_type === 'interval' && m.interval_hours
          ? `every ${m.interval_hours} hours`
          : (m.schedule_type ?? 'unspecified');
        return {
          name: m.medication_name,
          dose: m.dose,
          dosage_unit: m.dosage_unit,
          frequency,
          startDate: m.start_date,
        };
      }),
      recentLogs: (logs ?? []).map((l: any) => ({
        medicationName: l.medications?.medication_name ?? 'Unknown',
        status: l.status,
        loggedAt: l.actual_time ?? l.scheduled_time,
        notes: l.notes,
      })),
      recentJournalEntries: (journal ?? []).map((j: any) => ({
        date: j.created_at,
        entry: j.content,
      })),
      upcomingAppointments: (appointments ?? []).map((a: any) => ({
        title: a.title,
        date: a.start_time,
        location: a.location,
        provider: a.provider_name,
      })),
    };
  }
}