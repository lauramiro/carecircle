import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { InsightsController } from './insights.controller';

describe('InsightsController', () => {
  const supabase = { getClient: vi.fn() };
  const insightsService = {
    getLatestInsights: vi.fn(),
    getArchivedDigests: vi.fn(),
    dismissInsight: vi.fn(),
    generateWeeklyDigest: vi.fn(),
    getActiveAiInsightsForGroup: vi.fn(),
  };

  let controller: InsightsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new InsightsController(
      supabase as never,
      insightsService as never,
    );
  });

  it('getInsightsForGroup returns 404 when group has no patient', async () => {
    insightsService.getActiveAiInsightsForGroup.mockResolvedValue(null);

    await expect(
      controller.getInsightsForGroup('00000000-0000-4000-a000-000000000000'),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('getInsightsForGroup returns insights array for valid group', async () => {
    insightsService.getActiveAiInsightsForGroup.mockResolvedValue({
      insights: [{ insight_type: 'adherence' }],
    });

    const result = await controller.getInsightsForGroup(
      '11111111-1111-4111-8111-111111111111',
    );

    expect(result).toEqual({ insights: [{ insight_type: 'adherence' }] });
  });

  it('generateWeeklyDigest delegates to service', async () => {
    insightsService.generateWeeklyDigest.mockResolvedValue(undefined);

    const result = await controller.generateWeeklyDigest(
      '11111111-1111-4111-8111-111111111111',
    );

    expect(insightsService.generateWeeklyDigest).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(result).toEqual({ success: true });
  });

  it('dismissInsight passes userId from DTO', async () => {
    await controller.dismiss('card-1', {
      userId: '22222222-2222-4222-8222-222222222222',
    });

    expect(insightsService.dismissInsight).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      'card-1',
    );
  });
});
