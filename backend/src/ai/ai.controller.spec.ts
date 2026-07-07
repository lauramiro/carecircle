import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AiController } from './ai.controller';

describe('AiController', () => {
  const aiService = {
    askQuestion: vi.fn(),
  };
  const appConfigService = { config: {} };
  const supabase = { getClient: vi.fn() };

  let controller: AiController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AiController(
      aiService as never,
      appConfigService as never,
      supabase as never,
    );
  });

  it('ask delegates question and groupId to AiService', async () => {
    aiService.askQuestion.mockResolvedValue({
      answer: 'Take with food.',
      patientName: 'Alex',
      latencyMs: 120,
    });

    const result = await controller.ask(
      {
        question: 'How should I take Metformin?',
        groupId: '11111111-1111-4111-8111-111111111111',
      },
      undefined,
    );

    expect(aiService.askQuestion).toHaveBeenCalledWith(
      'How should I take Metformin?',
      '11111111-1111-4111-8111-111111111111',
    );
    expect(result.answer).toBe('Take with food.');
  });
});
