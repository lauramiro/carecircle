import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWellbeingCheckIn,
  getCurrentUserWellbeingCheckIns,
  getCurrentWeekStartIso,
  isCurrentUserPrimaryCarer,
} from './wellbeing.service';

const fromMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: fromMock,
  },
}));

describe('wellbeing service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReset();
  });

  it('detects whether the current user is a primary carer', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ group_id: 'group-1' }], error: null });
    const eqRole = vi.fn().mockReturnValue({ limit });
    const eqStatus = vi.fn().mockReturnValue({ eq: eqRole });
    const eqCaregiver = vi.fn().mockReturnValue({ eq: eqStatus });
    const select = vi.fn().mockReturnValue({ eq: eqCaregiver });

    fromMock.mockReturnValue({ select });

    await expect(isCurrentUserPrimaryCarer()).resolves.toBe(true);
    expect(fromMock).toHaveBeenCalledWith('care_givers');
  });

  it('returns recent wellbeing check-ins for the current user', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'check-in-1',
          carer_id: 'user-123',
          submitted_at: '2026-05-26T08:00:00.000Z',
          week_start: '2026-05-25',
          sleep_quality: 4,
          stress_level: 2,
          overwhelm_level: 3,
          social_connection: 4,
          overall_mood: 5,
          composite_score: 18,
        },
      ],
      error: null,
    });
    const gte = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ gte });
    const select = vi.fn().mockReturnValue({ eq });

    fromMock.mockReturnValue({ select });

    await expect(getCurrentUserWellbeingCheckIns()).resolves.toEqual([
      {
        id: 'check-in-1',
        submittedAt: '2026-05-26T08:00:00.000Z',
        weekStart: '2026-05-25',
        sleepQuality: 4,
        stressLevel: 2,
        overwhelmLevel: 3,
        socialConnection: 4,
        overallMood: 5,
        compositeScore: 18,
      },
    ]);
  });

  it('creates a wellbeing check-in for the authenticated user', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'check-in-2',
        carer_id: 'user-123',
        submitted_at: '2026-05-26T09:30:00.000Z',
        week_start: '2026-05-25',
        sleep_quality: 5,
        stress_level: 2,
        overwhelm_level: 2,
        social_connection: 4,
        overall_mood: 4,
        composite_score: 20,
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });

    fromMock.mockReturnValue({ insert });

    await expect(
      createWellbeingCheckIn({
        sleepQuality: 5,
        stressLevel: 2,
        overwhelmLevel: 2,
        socialConnection: 4,
        overallMood: 4,
      }),
    ).resolves.toMatchObject({
      id: 'check-in-2',
      compositeScore: 20,
      weekStart: '2026-05-25',
    });

    expect(insert).toHaveBeenCalledWith({
      carer_id: 'user-123',
      sleep_quality: 5,
      stress_level: 2,
      overwhelm_level: 2,
      social_connection: 4,
      overall_mood: 4,
    });
  });

  it('calculates the monday week start in UTC', () => {
    expect(getCurrentWeekStartIso(new Date('2026-05-27T12:00:00.000Z'))).toBe('2026-05-25');
  });
});