import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeeklyInsightGenerationService } from './weekly-insight-generation.service';

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
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => Promise.resolve(response)),
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(response).then(onFulfilled, onRejected),
    catch: (onRejected: any) => Promise.resolve(response).catch(onRejected),
  };

  return builder;
};

vi.mock('../lib/supabase', () => {
  const supabase = {
    from: vi.fn((table: string) => createSupabaseQuery(mockSupabaseResponse(table))),
  };
  return { supabase };
});

describe('WeeklyInsightGenerationService', () => {
  let service: WeeklyInsightGenerationService;
  let supabase: any;

  beforeEach(async () => {
    service = new WeeklyInsightGenerationService();
    const supabaseModule = await import('../lib/supabase');
    supabase = supabaseModule.supabase;
    vi.clearAllMocks();
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

    expect(supabase.from).toHaveBeenCalledWith('patients');
    expect(storeSpy).toHaveBeenCalledOnce();
    const storedDigest = storeSpy.mock.calls[0][0];
    expect(storedDigest.patientId).toBe('patient-001');
    expect(storedDigest.insightCards.length).toBeGreaterThanOrEqual(3);
  });
});
