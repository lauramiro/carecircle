import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWellbeingCheckIns } from './useWellbeingCheckIns';

const serviceMocks = vi.hoisted(() => ({
  createWellbeingCheckIn: vi.fn(),
  dismissWellbeingSupportMessage: vi.fn(),
  getActiveWellbeingSupportTrigger: vi.fn(),
  getCurrentUserWellbeingCheckIns: vi.fn(),
  getCurrentWeekStartIso: vi.fn(() => '2026-05-25'),
  isCurrentUserPrimaryCarer: vi.fn(),
}));

vi.mock('../../api/wellbeing/wellbeing.service', () => serviceMocks);

describe('useWellbeingCheckIns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.isCurrentUserPrimaryCarer.mockResolvedValue(true);
    serviceMocks.getCurrentUserWellbeingCheckIns.mockResolvedValue([
      {
        id: 'check-in-2',
        submittedAt: '2026-05-26T09:30:00.000Z',
        weekStart: '2026-05-25',
        sleepQuality: 2,
        stressLevel: 4,
        overwhelmLevel: 4,
        socialConnection: 2,
        overallMood: 2,
        compositeScore: 12,
        supportMessageDismissedAt: null,
      },
      {
        id: 'check-in-1',
        submittedAt: '2026-05-19T09:30:00.000Z',
        weekStart: '2026-05-18',
        sleepQuality: 2,
        stressLevel: 4,
        overwhelmLevel: 4,
        socialConnection: 2,
        overallMood: 2,
        compositeScore: 12,
        supportMessageDismissedAt: null,
      },
    ]);
    serviceMocks.getActiveWellbeingSupportTrigger.mockImplementation((checkIns) => {
      const latest = checkIns[0];
      if (!latest) return null;
      return latest.supportMessageDismissedAt
        ? null
        : {
            checkInId: latest.id,
            triggerWeekStart: latest.weekStart,
            compositeScore: latest.compositeScore,
            averageScore: latest.compositeScore / 5,
          };
    });
    serviceMocks.dismissWellbeingSupportMessage.mockResolvedValue(undefined);
  });

  it('hides the current support message after dismissal', async () => {
    const { result } = renderHook(() => useWellbeingCheckIns());

    await waitFor(() => {
      expect(result.current.supportTrigger).not.toBeNull();
    });

    await act(async () => {
      await result.current.dismissSupportMessage();
    });

    expect(serviceMocks.dismissWellbeingSupportMessage).toHaveBeenCalledWith('check-in-2');
    expect(result.current.supportTrigger).toBeNull();
  });
});