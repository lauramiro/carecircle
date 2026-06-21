// CC-134: AI Summary Content Assembly
// Backend service to assemble complete care profile for PDF rendering

import { Injectable } from '@nestjs/common';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MedicationData {
  name: string;
  dose: string;
  unit: string;
  frequency: string;
  startDate: string;
  lastGivenTimestamp?: string;
}

export interface CareNoteEntry {
  date: string;
  content: string;
  tone?: 'positive' | 'neutral' | 'concerning';
}

export interface FlaggedPattern {
  type: string;
  observation: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GPContact {
  name: string;
  specialty: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface HospitalSummaryData {
  // Patient Details
  fullName: string;
  dateOfBirth: string;
  patientId: string;
  generatedAt: string;

  // Medical Information
  medications: MedicationData[];
  conditions: string[];
  allergies: string[];

  // Care Team
  gpContacts: GPContact[];

  // Recent Care Data
  careNotesSummary: CareNoteEntry[];

  // AI Analysis
  flaggedPatterns: FlaggedPattern[];

  // Metadata
  isValid: boolean;
  validationErrors: string[];
}

// ============================================================================
// Service Implementation
// ============================================================================

@Injectable()
export class HospitalSummaryService {
  constructor(private readonly supabase: SupabaseAdminClient) {}
  /**
   * Main method: Assemble complete care profile for hospital summary PDF
   * Fetches fresh data from Supabase and validates all required sections
   */
  async assembleHospitalSummary(
    patientId: string,
  ): Promise<HospitalSummaryData> {
    const validationErrors: string[] = [];

    try {
      // Step 1: Fetch patient details
      const patientDetails = await this.getPatientDetails(patientId);
      if (!patientDetails) {
        throw new Error('Patient not found in system');
      }

      // Step 2: Fetch current medications
      const medications = await this.getCurrentMedications(patientId);
      if (!medications || medications.length === 0) {
        validationErrors.push('No medications found for patient');
      }

      // Step 3: Fetch conditions and allergies from the patient record
      const conditions = await this.getConditions(patientId);
      const allergies = await this.getAllergies(patientId);

      if (!conditions || conditions.length === 0) {
        validationErrors.push('No conditions recorded for patient');
      }
      if (!allergies || allergies.length === 0) {
        validationErrors.push('No allergies recorded for patient');
      }

      // Step 4: Fetch GP contacts
      const gpContacts = await this.getGPContacts(patientId);
      if (!gpContacts || gpContacts.length === 0) {
        validationErrors.push('No GP contacts found for patient');
      }

      // Step 5: Fetch 7-day care notes summary
      const careNotesSummary = await this.getCareNotesSummary(patientId);
      if (!careNotesSummary || careNotesSummary.length === 0) {
        validationErrors.push('No recent care notes found (last 7 days)');
      }

      // Step 6: Get AI flagged patterns (if any exist)
      const flaggedPatterns = await this.getFlaggedPatterns(patientId);
      console.log(
        '[assembleHospitalSummary] flaggedPatterns length:',
        flaggedPatterns.length,
      );

      // Assemble complete data object
      const summaryData: HospitalSummaryData = {
        // Patient Details
        fullName: patientDetails.full_name || 'Unknown',
        dateOfBirth: patientDetails.date_of_birth || 'Unknown',
        patientId: patientId,
        generatedAt: new Date().toISOString(),

        // Medical Information
        medications: medications || [],
        conditions: conditions || [],
        allergies: allergies || [],

        // Care Team
        gpContacts: gpContacts || [],

        // Recent Care Data
        careNotesSummary: careNotesSummary || [],

        // AI Analysis
        flaggedPatterns: flaggedPatterns || [],

        // Validation
        isValid: validationErrors.length === 0,
        validationErrors: validationErrors,
      };

      return summaryData;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to assemble hospital summary: ${message}`);
    }
  }

  // ========================================================================
  // Helper Methods: Data Fetching
  // ========================================================================

  /**
   * Fetch patient details: name, DOB
   */
  private async getPatientDetails(patientId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('id, full_name, date_of_birth, chronic_conditions, allergies')
      .eq('id', patientId)
      .single();

    if (error) {
      console.error('Error fetching patient details:', error);
      return null;
    }

    return data as {
      id: string;
      full_name?: string;
      date_of_birth?: string;
      chronic_conditions?: string[];
      allergies?: string[];
    };
  }

  /**
   * Fetch current active medications with last given timestamp
   */
  private async getCurrentMedications(
    patientId: string,
  ): Promise<MedicationData[]> {
    const { data: medications, error: medError } = await this.supabase
      .getClient()
      .from('medications')
      .select(
        'id, medication_name, dose, dosage_unit, schedule_type, interval_hours, start_date, status',
      )
      .eq('patient_id', patientId)
      .eq('status', 'active');

    if (medError || !medications) {
      console.error('Error fetching medications:', medError);
      return [];
    }

    const meds = (medications || []) as {
      id: string;
      medication_name: string;
      dose?: number;
      dosage_unit?: string;
      schedule_type?: string;
      interval_hours?: number;
      start_date?: string;
      status?: string;
    }[];

    const medsWithTimestamps = await Promise.all(
      meds.map(async (med) => {
        const { data: logs } = await this.supabase
          .getClient()
          .from('medication_logs')
          .select('actual_time, scheduled_time')
          .eq('medication_id', med.id)
          .eq('status', 'given')
          .order('actual_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        const logsData = logs as {
          actual_time?: string;
          scheduled_time?: string;
        } | null;

        const frequency =
          med.schedule_type === 'interval' && med.interval_hours
            ? `every ${med.interval_hours} hours`
            : med.schedule_type || 'Unknown';

        return {
          name: med.medication_name,
          dose: med.dose?.toString() || 'Unknown',
          unit: med.dosage_unit || 'mg',
          frequency,
          startDate: med.start_date || new Date().toISOString().split('T')[0],
          lastGivenTimestamp:
            logsData?.actual_time || logsData?.scheduled_time || null,
        };
      }),
    );

    return medsWithTimestamps;
  }

  /**
   * Fetch chronic conditions for patient
   */
  private async getConditions(patientId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('chronic_conditions')
      .eq('id', patientId)
      .single();

    if (error) {
      console.error('Error fetching conditions from patient record:', error);
      return [];
    }

    return (
      (data as { chronic_conditions?: string[] })?.chronic_conditions || []
    );
  }

  /**
   * Fetch allergies for patient
   */
  private async getAllergies(patientId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('patients')
      .select('allergies')
      .eq('id', patientId)
      .single();

    if (error) {
      console.error('Error fetching allergies from patient record:', error);
      return [];
    }

    return (data as { allergies?: string[] })?.allergies || [];
  }

  /**
   * Fetch GP/doctor contacts
   */
  private async getGPContacts(patientId: string): Promise<GPContact[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('gp_contacts')
      .select('name, specialty, phone, email, address')
      .eq('patient_id', patientId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching GP contacts:', error);
      return [];
    }

    const gpData = (data || []) as {
      name: string;
      specialty: string;
      phone?: string;
      email?: string;
      address?: string;
    }[];
    return gpData.map((gp) => ({
      name: gp.name,
      specialty: gp.specialty,
      phone: gp.phone,
      email: gp.email,
      address: gp.address,
    }));
  }

  /**
   * Fetch and summarize 7-day care notes
   */
  private async getCareNotesSummary(
    patientId: string,
  ): Promise<CareNoteEntry[]> {
    // First, get the group_id for this patient
    const { data: patient, error: patientError } = await this.supabase
      .getClient()
      .from('patients')
      .select('group_id')
      .eq('id', patientId)
      .single();

    const patientData = patient as { group_id?: string } | null;
    if (patientError || !patientData?.group_id) {
      console.error('Could not find group_id for patient:', patientError);
      return [];
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await this.supabase
      .getClient()
      .from('handover_journal_entries')
      .select('created_at, content')
      .eq('group_id', patientData.group_id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching care notes:', error);
      return [];
    }

    const notesData = (data || []) as { created_at: string; content: string }[];
    return notesData.map((note) => ({
      date: new Date(note.created_at).toISOString().split('T')[0],
      // Remove any leading tone tag like [NEUTRAL], [POSITIVE], [CONCERNING]
      content: note.content.replace(/^\[[A-Z]+\]\s*/, ''),
    }));
  }
  /**
   * Fetch AI-flagged patterns or insights
   */
  private async getFlaggedPatterns(
    patientId: string,
  ): Promise<FlaggedPattern[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('ai_insights')
      .select('insight_type, observation, severity')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5); // Limit to 5 most recent patterns

    if (error) {
      console.error('Error fetching flagged patterns:', error);
      return [];
    }

    const patternsData = (data || []) as {
      insight_type: string;
      observation: string;
      severity?: 'low' | 'medium' | 'high';
    }[];
    return patternsData.map((pattern) => ({
      type: pattern.insight_type,
      observation: pattern.observation,
      severity: pattern.severity || 'low',
    }));
  }
}
