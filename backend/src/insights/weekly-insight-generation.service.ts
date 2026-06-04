import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';

export type InsightType =
  | 'pain_trend'
  | 'medication_adherence'
  | 'appetite_change'
  | 'journalling_gap'
  | 'shift_imbalance';

export interface InsightCard {
  insightType: InsightType;
  observation: string;
  suggestedAction: string;
  severity: 'low' | 'medium' | 'high';
  generatedAt: string;
}

export interface WeeklyInsightDigest {
  patientId: string;
  weekEndingDate: string;
  insightCards: InsightCard[];
  analysisNotes?: string;
}

interface ActivePatientRow {
  id: string;
  group_id: string;
}

interface JournalEntryRow {
  created_at: string | null;
  content: string | null;
}

interface MedicationLogRow {
  status: string;
  scheduled_time: string;
  actual_time: string | null;
  notes: string | null;
}

interface ShiftAssignmentRow {
  shift_date: string;
  shift_slot: string;
  assigned_caregiver_id: string | null;
}

@Injectable()
export class WeeklyInsightGenerationService {
  private readonly logger = new Logger(WeeklyInsightGenerationService.name);

  constructor(private readonly supabase: SupabaseAdminClient) {}

  private readonly groundingInstruction =
    'Ground all insights exclusively in the patient\'s care data from the previous 7 days. Do not invent details or general medical advice.';

  @Cron('0 0 * * 1', { name: 'weeklyInsightDigest', timeZone: 'UTC' })
  async generateWeeklyInsights() {
    this.logger.log('Starting weekly insight generation job');
    this.logger.debug(this.groundingInstruction);

    try {
      const { data: patients, error } = await this.supabase.getClient()
        .from('patients')
        .select('id, group_id')
        .eq('is_active', true)
        .not('group_id', 'is', null);

      if (error || !patients) {
        this.logger.error('Failed to fetch active patients:', error);
        return;
      }

      for (const patient of patients) {
        try {
          const insights = await this.generateInsightsForPatient(patient);
          if (insights && insights.insightCards.length > 0) {
            await this.storeInsights(insights);
          }
        } catch (err) {
          this.logger.error(`Failed to generate insights for patient ${patient.id}:`, err as any);
        }
      }

      this.logger.log('Weekly insight generation job completed');
    } catch (err) {
      this.logger.error('Weekly insight generation job failed:', err as any);
    }
  }

  public async generateInsightsForPatient(
    patient: ActivePatientRow,
  ): Promise<WeeklyInsightDigest | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekEndingDate = new Date().toISOString().split('T')[0];

    const [journalEntries, medicationLogs, shiftAssignments] = await Promise.all([
      this.getJournalEntries(patient.group_id, sevenDaysAgo),
      this.getMedicationLogs(patient.id, sevenDaysAgo),
      this.getShiftAssignments(patient.group_id, sevenDaysAgo),
    ]);

    const insightCards: InsightCard[] = [];
    const hasData =
      journalEntries.length > 0 ||
      medicationLogs.length > 0 ||
      shiftAssignments.length > 0;

    if (!hasData) {
      return null;
    }

    const painInsight = this.generatePainTrendInsight(journalEntries);
    if (painInsight) insightCards.push(painInsight);

    const adherenceInsight = this.generateAdherenceInsight(medicationLogs);
    if (adherenceInsight) insightCards.push(adherenceInsight);

    const appetiteInsight = this.generateAppetiteInsight(journalEntries);
    if (appetiteInsight) insightCards.push(appetiteInsight);

    const journalGapInsight = this.generateJournallingGapInsight(journalEntries);
    if (journalGapInsight) insightCards.push(journalGapInsight);

    const shiftInsight = this.generateShiftImbalanceInsight(shiftAssignments);
    if (shiftInsight) insightCards.push(shiftInsight);

    const sortedCards = insightCards.sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 } as const;
      return rank[b.severity] - rank[a.severity];
    });

    const filteredCards = sortedCards.slice(0, 4);

    return {
      patientId: patient.id,
      weekEndingDate,
      insightCards: filteredCards,
      analysisNotes:
        filteredCards.length < 2
          ? 'The weekly dataset is limited, so only the most reliable care signals are included.'
          : undefined,
    };
  }

  private async getJournalEntries(groupId: string, since: Date): Promise<JournalEntryRow[]> {
    const { data, error } = await this.supabase.getClient()
      .from('handover_journal_entries')
      .select('created_at, content')
      .eq('group_id', groupId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.warn(`Journal query error for group ${groupId}:`, error);
      return [];
    }

    return (
      data?.map((entry) => ({
        created_at: entry.created_at,
        content: entry.content,
      })) ?? []
    );
  }

  private async getMedicationLogs(patientId: string, since: Date): Promise<MedicationLogRow[]> {
    const { data, error } = await this.supabase.getClient()
      .from('medication_logs')
      .select('status, scheduled_time, actual_time, notes')
      .eq('patient_id', patientId)
      .gte('scheduled_time', since.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      this.logger.warn(`Medication log query error for patient ${patientId}:`, error);
      return [];
    }

    return (
      data?.map((log) => ({
        status: log.status,
        scheduled_time: log.scheduled_time,
        actual_time: log.actual_time,
        notes: log.notes,
      })) ?? []
    );
  }

  private async getShiftAssignments(groupId: string, since: Date): Promise<ShiftAssignmentRow[]> {
    const sinceDate = since.toISOString().split('T')[0];
    const { data, error } = await this.supabase.getClient()
      .from('weekly_shift_assignments')
      .select('shift_date, shift_slot, assigned_caregiver_id')
      .eq('group_id', groupId)
      .gte('shift_date', sinceDate)
      .order('shift_date', { ascending: true });

    if (error) {
      this.logger.warn(`Shift assignments query error for group ${groupId}:`, error);
      return [];
    }

    return (
      data?.map((shift) => ({
        shift_date: shift.shift_date,
        shift_slot: shift.shift_slot,
        assigned_caregiver_id: shift.assigned_caregiver_id,
      })) ?? []
    );
  }

  private generatePainTrendInsight(entries: JournalEntryRow[]): InsightCard | null {
    const painEntries = entries.filter((entry) =>
      entry.content?.match(/\b(pain|ache|hurt|sore|discomfort)\b/i),
    );
    if (painEntries.length < 2) {
      return null;
    }

    const splitIndex = Math.ceil(painEntries.length / 2);
    const recentPain = painEntries.slice(splitIndex).length;
    const earlierPain = painEntries.slice(0, splitIndex).length;
    const trend = recentPain > earlierPain ? 'increasing' : recentPain < earlierPain ? 'decreasing' : 'stable';

    const observation = `Journal notes mention pain ${trend}ly over the past week with ${painEntries.length} references.`;
    const suggestedAction =
      trend === 'increasing'
        ? 'Review this week\'s pain notes in handover records and confirm if additional support is needed.'
        : 'Continue monitoring pain reports and keep care handovers updated with any changes.';

    return {
      insightType: 'pain_trend',
      observation,
      suggestedAction,
      severity: trend === 'increasing' ? 'high' : 'medium',
      generatedAt: new Date().toISOString(),
    };
  }

  private generateAdherenceInsight(medicationLogs: MedicationLogRow[]): InsightCard | null {
    if (medicationLogs.length === 0) {
      return null;
    }

    const givenCount = medicationLogs.filter((log) => log.status === 'given').length;
    const adherenceRate = (givenCount / medicationLogs.length) * 100;
    const observation = `Medication adherence was ${Math.round(adherenceRate)}% over the last 7 days.`;
    const suggestedAction =
      adherenceRate >= 90
        ? 'Maintain the current medication routine and continue recording each administration.'
        : 'Check any missed or late doses in the week and update the care team to support adherence.';

    return {
      insightType: 'medication_adherence',
      observation,
      suggestedAction,
      severity: adherenceRate < 70 ? 'high' : adherenceRate < 90 ? 'medium' : 'low',
      generatedAt: new Date().toISOString(),
    };
  }

  private generateAppetiteInsight(entries: JournalEntryRow[]): InsightCard | null {
    const appetiteEntries = entries.filter((entry) =>
      entry.content?.match(/\b(appetite|hungry|eating|meal|food|snack|nausea|loss of appetite|poor appetite|not hungry)\b/i),
    );
    if (appetiteEntries.length === 0) {
      return null;
    }

    const reducedKeywords = /\b(reduced|poor|less|not hungry|lost appetite|nausea|vomit|refused food)\b/i;
    const improvedKeywords = /\b(better|normal appetite|eating well|hungry|good appetite|better appetite)\b/i;
    const reducedCount = appetiteEntries.filter((entry) => reducedKeywords.test(entry.content || '')).length;
    const improvedCount = appetiteEntries.filter((entry) => improvedKeywords.test(entry.content || '')).length;

    const trend = reducedCount > improvedCount ? 'reduced' : improvedCount > reducedCount ? 'improved' : 'changed';
    const observation =
      trend === 'reduced'
        ? 'Appetite-related notes suggest the patient is eating less or experiencing poor appetite this week.'
        : trend === 'improved'
        ? 'Appetite-related notes indicate the patient is eating more consistently this week.'
        : 'Appetite-related notes changed this week, with mixed reports on eating and meal intake.';

    return {
      insightType: 'appetite_change',
      observation,
      suggestedAction:
        trend === 'reduced'
          ? 'Flag appetite changes to the care team and note feeding preferences or digestive symptoms in handover records.'
          : 'Continue tracking meal and appetite notes to confirm whether this pattern persists.',
      severity: trend === 'reduced' ? 'medium' : 'low',
      generatedAt: new Date().toISOString(),
    };
  }

  private generateJournallingGapInsight(entries: JournalEntryRow[]): InsightCard | null {
    if (entries.length === 0) {
      return {
        insightType: 'journalling_gap',
        observation: 'No handover journal entries were recorded during the last 7 days.',
        suggestedAction: 'Encourage daily handover notes to improve visibility of the care journey.',
        severity: 'low',
        generatedAt: new Date().toISOString(),
      };
    }

    const uniqueDays = new Set(
      entries
        .map((entry) => entry.created_at?.split('T')[0] ?? '')
        .filter((date) => date),
    ).size;

    if (uniqueDays < 4) {
      return {
        insightType: 'journalling_gap',
        observation: `Journal coverage is sparse: entries were recorded on only ${uniqueDays} out of 7 days.`,
        suggestedAction: 'Increase daily journal capture so changes in symptoms and care needs are easier to identify.',
        severity: 'low',
        generatedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  private generateShiftImbalanceInsight(shifts: ShiftAssignmentRow[]): InsightCard | null {
    if (shifts.length < 3) {
      return null;
    }

    const caregiverCount = new Map<string, number>();
    for (const shift of shifts) {
      if (!shift.assigned_caregiver_id) {
        continue;
      }
      caregiverCount.set(
        shift.assigned_caregiver_id,
        (caregiverCount.get(shift.assigned_caregiver_id) ?? 0) + 1,
      );
    }

    if (caregiverCount.size < 2) {
      return null;
    }

    const totalAssignments = Array.from(caregiverCount.values()).reduce((sum, value) => sum + value, 0);
    const [topCaregiverCount] = Array.from(caregiverCount.values()).sort((a, b) => b - a);

    if (topCaregiverCount / totalAssignments <= 0.65) {
      return null;
    }

    return {
      insightType: 'shift_imbalance',
      observation: `One caregiver covered ${Math.round((topCaregiverCount / totalAssignments) * 100)}% of scheduled shifts in the last week.`,
      suggestedAction: 'Review week-to-week shift coverage and balance assignments to reduce reliance on a single caregiver.',
      severity: 'medium',
      generatedAt: new Date().toISOString(),
    };
  }

  private async storeInsights(digest: WeeklyInsightDigest) {
    const rows = digest.insightCards.map((card) => ({
      patient_id: digest.patientId,
      insight_type: card.insightType,
      suggested_action: card.suggestedAction,
      observation: card.observation,
      severity: card.severity,
      is_active: true,
      generated_at: card.generatedAt,
      created_at: new Date().toISOString(),
    }));
    const { error } = await this.supabase.getClient().from('ai_insights').insert(rows);
    
  }
}
