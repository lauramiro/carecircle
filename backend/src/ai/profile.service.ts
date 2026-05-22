import { Injectable } from '@nestjs/common';
import { supabase } from '../lib/supabase';
import type { CareProfileContext } from '../prompts/care-profile.prompt';

@Injectable()
export class ProfileService {
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
      .single();

    if (patientError || !patient) {
      throw new Error(`Patient not found for group ${groupId}`);
    }

    const patientId = patient.id;

    // Fetch active medications
    const { data: medications } = await supabase
      .from('medications')
      .select('medication_name, dose, dosage_unit, frequency, start_date')
      .eq('patient_id', patientId)
      .eq('status', 'active');

    // Fetch last 7 days of medication logs
    const { data: logs } = await supabase
      .from('medication_logs')
      .select('status, actual_time, notes, medications(medication_name)')
      .eq('patient_id', patientId)
      .gte('scheduled_time', sevenDaysAgoStr)
      .order('scheduled_time', { ascending: false })
      .limit(20);

    // Fetch last 7 journal entries
    const { data: journal } = await supabase
      .from('journal_entries')
      .select('created_at, content')
      .eq('patient_id', patientId)
      .gte('created_at', sevenDaysAgoStr)
      .order('created_at', { ascending: false })
      .limit(7);

    // Fetch next 3 appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('title, start_time, location, provider_name')
      .eq('patient_id', patientId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);

    return {
      patientName: patient.full_name,
      dateOfBirth: patient.date_of_birth,
      conditions: (patient.chronic_conditions as string[]) ?? [],
      allergies: (patient.allergies as string[]) ?? [],
      medications: (medications ?? []).map((m: any) => ({
        name: m.medication_name,
        dose: m.dose,
        dosage_unit: m.dosage_unit,
        frequency: m.frequency,
        startDate: m.start_date,
      })),
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