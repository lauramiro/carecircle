import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { PatientRepository } from '../integrations/repositories/patient.repository';
import { CareGroupRepository } from '../integrations/repositories/care-group.repository';
import { SupabaseAdminClient } from '../integrations/supabase-admin.client';
import { buildWeeklyDigestPrompt } from '../prompts/weekly-digest.prompt';
import { PushDispatchService } from '../alerts/push-dispatch.service';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly patientRepo: PatientRepository,
    private readonly groupRepo: CareGroupRepository,
    private readonly supabase: SupabaseAdminClient,
    private readonly pushDispatch: PushDispatchService,
  ) {}

  async generateAllWeeklyDigests() {
    const groups = await this.groupRepo.findAllGroups();
    this.logger.log(`Generating weekly digests for ${groups.length} groups`);

    for (const group of groups) {
      try {
        await this.generateWeeklyDigest(group.id as string);
      } catch (err: unknown) {
        this.logger.error(
          `Failed to generate digest for group ${group.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  async generateWeeklyDigest(groupId: string) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const patient = await this.patientRepo.findByGroupId(groupId);
    if (!patient) return;

    const patientId = patient.id as string;

    const [logs, journal, vitals] = await Promise.all([
      this.patientRepo.findRecentMedicationLogs(
        patientId,
        startDate.toISOString(),
      ),
      this.patientRepo.findRecentJournalEntries(
        groupId,
        startDate.toISOString(),
      ),
      this.patientRepo.findRecentVitalSigns(patientId, startDate.toISOString()),
    ]);

    const prompt = buildWeeklyDigestPrompt({
      patientName: patient.full_name as string,
      startDate: startDateStr,
      endDate: endDateStr,
      medicationLogs: logs.map((l) => {
        const lr = l as Record<string, unknown>;
        return {
          medicationName:
            (lr.medications as { medication_name?: string })?.medication_name ??
            'Unknown',
          status: lr.status as "given" | "skipped" | "overdue",
          loggedAt: (lr.actual_time ?? lr.scheduled_time) as string,
          notes: lr.notes as string | undefined,
        };
      }),
      journalEntries: journal.map((j) => {
        const jr = j as Record<string, unknown>;
        return {
          date: jr.created_at as string,
          entry: jr.content as string,
        };
      }),
      vitalSigns: vitals.map((v) => {
        const vr = v as Record<string, unknown>;
        return {
          measuredAt: vr.measured_at as string,
          bloodGlucose: vr.blood_glucose as number | undefined,
          bpSystolic: vr.blood_pressure_systolic as number | undefined,
          bpDiastolic: vr.blood_pressure_diastolic as number | undefined,
          heartRate: vr.heart_rate as number | undefined,
          notes: vr.notes as string | undefined,
        };
      }),
    });

    const insights = await this.aiService.generateInsights(prompt);
    if (!insights || insights.length === 0) {
      this.logger.warn(`No insights generated for group ${groupId}`);
      return;
    }

    const db = this.supabase.getClient();

    // 1. Create Weekly Digest record
    const result = await db
      .from('weekly_digests')
      .insert({
        group_id: groupId,
        start_date: startDateStr,
        end_date: endDateStr,
      })
      .select()
      .single();
    const digestError = result.error;
    const digest = result.data as { id: string };

    if (digestError) {
      if (digestError.code === '23505') {
        this.logger.warn(
          `Digest already exists for group ${groupId} starting ${startDateStr}`,
        );
        return;
      }
      throw new Error(digestError.message);
    }

    // 2. Create Insight Cards
    const { error: cardsError } = await db.from('insight_cards').insert(
      insights.map(
        (ins: {
          type: string;
          title: string;
          description: string;
          trend_direction?: string;
          data_link?: string;
        }) => ({
          digest_id: digest.id,
          type: ins.type,
          title: ins.title,
          description: ins.description,
          trend_direction: ins.trend_direction,
          data_link: ins.data_link?.replace(':groupId', groupId),
        }),
      ),
    );

    if (cardsError) throw new Error(cardsError.message);

    // 3. Notify Group Members
    await this.notifyGroupMembers(groupId, digest.id);

    this.logger.log(`Weekly digest generated for group ${groupId}`);
  }

  private async notifyGroupMembers(groupId: string, digestId: string) {
    const groupMembersResult =
      await this.groupRepo.listActiveGroupMembers(groupId);
    const groupMembersIds = groupMembersResult.groupMembersIds;
    const db = this.supabase.getClient();

    const title = 'New Weekly Digest Ready';
    const body =
      'Your weekly care summary is now available in the Insights tab.';
    const url = `/groups/${groupId}/insights?digestId=${digestId}`;

    for (const userId of groupMembersIds) {
      // In-app
      await db.from('notifications').insert({
        user_id: userId,
        type: 'weekly_digest',
        title,
        body,
        action_url: url,
        related_entity_type: 'weekly_digest',
        related_entity_id: digestId,
      });

      // Push
      await this.pushDispatch
        .sendToUsers([userId], { title, body, url })
        .catch(() => {});
    }
  }

  async getLatestInsights(groupId: string, userId: string) {
    const db = this.supabase.getClient();

    const { data: digest, error: digestError } = await db
      .from('weekly_digests')
      .select('id, start_date, end_date')
      .eq('group_id', groupId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (digestError) throw new Error(digestError.message);
    if (!digest) return { digest: null, cards: [] };

    const { data: cards, error: cardsError } = await db
      .from('insight_cards')
      .select('*')
      .eq('digest_id', digest.id);

    if (cardsError) throw new Error(cardsError.message);

    const { data: dismissals } = await db
      .from('user_insight_dismissals')
      .select('insight_card_id')
      .eq('user_id', userId);

    const dismissedIds = new Set(
      dismissals?.map((d: { insight_card_id: string }) => d.insight_card_id) ??
        [],
    );

    return {
      digest,
      cards: cards.filter((c: { id: string }) => !dismissedIds.has(c.id)),
    };
  }

  async getArchivedDigests(groupId: string) {
    const db = this.supabase.getClient();

    // Get all digests except the latest one
    const { data: latestDigest } = await db
      .from('weekly_digests')
      .select('id')
      .eq('group_id', groupId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const query = db
      .from('weekly_digests')
      .select('*, insight_cards(*)')
      .eq('group_id', groupId)
      .order('start_date', { ascending: false });

    if (latestDigest) {
      query.neq('id', latestDigest.id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data as unknown[]) ?? [];
  }

  async dismissInsight(userId: string, cardId: string) {
    const db = this.supabase.getClient();
    const { error } = await db.from('user_insight_dismissals').insert({
      user_id: userId,
      insight_card_id: cardId,
    });
    if (error && error.code !== '23505') throw new Error(error.message);
  }
}
