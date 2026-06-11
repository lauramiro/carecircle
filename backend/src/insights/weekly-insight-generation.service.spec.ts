import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeeklyInsightGenerationService } from './weekly-insight-generation.service';
import type { SupabaseAdminClient } from '../integrations/supabase-admin.client';

const mockSupabaseResponse = (table: string) => {
  switch (table) {
    case 'patients':
      return { data: [{ id: 'patient-001', group_id: 'group-001' }], error: null };
    case 'handover_journal_entries':
      return {
        data: [
          { created_at: new Date().toISOString(), content: 'Patient reports mild pain in the knee.' },
          { created_at: new Date().toISOString(), content: 'Appetite is poor and patient skipped breakfast.' },
          { created_at: new Date().toISOString(), content: 'Patient says pain is getting worse with movement.' },
          { created_at: new Date().toISOString(), content: 'Patient feeling hungry before lunch.' },
        ],
        error: null,
      };
    case 'medication_logs':
      return {
        data: [
          { status: 'given', scheduled_time: new Date().toISOString(), actual_time: new Date().toISOString(), notes: 'On time' },
          { status: 'missed', scheduled_time: new Date().toISOString(), actual_time: null, notes: 'Not taken' },
          { status: 'given', scheduled_time: new Date().toISOString(), actual_time: new Date().toISOString(), notes: 'Late dose' },
        ],
        error: null,
      };
    case 'weekly_shift_assignments':
      return {
        data: [
          { shift_date: new Date().toISOString().split('T')[0], shift_slot: 'morning', assigned_caregiver_id: 'caregiver-1' },
          { shift_date: new Date().toISOString().split('T')[0], shift_slot: 'afternoon', assigned_caregiver_id: 'caregiver-1' },
          { shift_date: new Date().toISOString().split('T')[0], shift_slot: 'evening', assigned_caregiver_id: 'caregiver-1' },
          { shift_date: new Date().toISOString().split('T')[0], shift_slot: 'night', assigned_caregiver_id: 'caregiver-2' },
        ],
        error: null,
      };
    case 'ai_insights':
      return { data: [], error: null };
    default:
      return { data: [], error: null };
  }
};

const createSupabaseQuery = (response: any) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => Promise.resolve(response)),
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(response).then(onFulfilled, onRejected),
    catch: (onRejected: any) => Promise.resolve(response).catch(onRejected),
  };

  return builder;
};

/**
 * Builds a SupabaseAdminClient test double. `insertOverrides` lets a test
 * force a specific response for the `ai_insights` insert (e.g. a failure).
 */
const createAdminClient = (insertResponse?: { data: any; error: any }) => {
  const from = vi.fn((table: string) => {
    if (table === 'ai_insights' && insertResponse) {
      return createSupabaseQuery(insertResponse);
    }
    return createSupabaseQuery(mockSupabaseResponse(table));
  });

  const adminClient = {
    getClient: vi.fn(() => ({ from })),
  } as unknown as SupabaseAdminClient;

  return { adminClient, from };
};

describe('WeeklyInsightGenerationService', () => {
  let service: WeeklyInsightGenerationService;
  let from: ReturnType<typeof createAdminClient>['from'];

  beforeEach(() => {
    const built = createAdminClient();
    service = new WeeklyInsightGenerationService(built.adminClient);
    from = built.from;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a weekly digest with insight cards from available care data', async () => {
    const digest = await (service as any).generateInsightsForPatient({
      id: 'patient-001',
      group_id: 'group-001',
    });

    expect(digest).not.toBeNull();
    expect(digest?.insightCards.length).toBeGreaterThanOrEqual(3);
    expect(digest?.patientId).toBe('patient-001');
    expect(digest?.weekEndingDate).toBe(new Date().toISOString().split('T')[0]);
    expect(digest?.insightCards.map((card: any) => card.insightType)).toEqual(
      expect.arrayContaining(['pain_trend', 'medication_adherence', 'appetite_change']),
    );
  });

  it('runs the weekly job and stores generated insights for active patients', async () => {
    const storeSpy = vi.spyOn(service as any, 'storeInsights').mockResolvedValue(undefined);

    await service.generateWeeklyInsights();

    expect(from).toHaveBeenCalledWith('patients');
    expect(storeSpy).toHaveBeenCalledOnce();
    const storedDigest = storeSpy.mock.calls[0][0] as any;
    expect(storedDigest.patientId).toBe('patient-001');
    expect(storedDigest.insightCards.length).toBeGreaterThanOrEqual(3);
  });

  describe('storeInsights', () => {
    const digest = {
      patientId: 'patient-001',
      weekEndingDate: new Date().toISOString().split('T')[0],
      insightCards: [
        {
          insightType: 'pain_trend' as const,
          observation: 'Pain references increased this week.',
          suggestedAction: 'Review pain notes in handover records.',
          severity: 'high' as const,
          generatedAt: new Date().toISOString(),
        },
      ],
    };

    it('logs an error with patientId, row count, and the Supabase message when the insert fails, without re-throwing', async () => {
      const built = createAdminClient({
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      });
      service = new WeeklyInsightGenerationService(built.adminClient);

      const errorSpy = vi.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
      const logSpy = vi.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

      await expect((service as any).storeInsights(digest)).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledOnce();
      const message = errorSpy.mock.calls[0][0] as string;
      expect(message).toContain('patient-001');
      expect(message).toContain('1 rows');
      expect(message).toContain('duplicate key value violates unique constraint');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('logs a success confirmation with the number of rows inserted', async () => {
      const built = createAdminClient({ data: [], error: null });
      service = new WeeklyInsightGenerationService(built.adminClient);

      const errorSpy = vi.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
      const logSpy = vi.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

      await (service as any).storeInsights(digest);

      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledOnce();
      const message = logSpy.mock.calls[0][0] as string;
      expect(message).toContain('1 insights');
      expect(message).toContain('patient-001');
    });
  });
});
