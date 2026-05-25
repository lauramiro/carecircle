import { describe, it, expect } from 'vitest'; // or jest
import { sendChatMessageMock } from './ai.mock';

describe('ai.mock', () => {
  it('returns a response with reply and responseTimeMs', async () => {
    const result = await sendChatMessageMock('patient-123', 'Hello');
    expect(result).toHaveProperty('reply');
    expect(result).toHaveProperty('responseTimeMs');
    expect(typeof result.reply).toBe('string');
    expect(typeof result.responseTimeMs).toBe('number');
  });

  it('responds to medication keyword', async () => {
    const result = await sendChatMessageMock('patient-123', 'Tell me about medications');
    expect(result.reply.toLowerCase()).toContain('medication');
  });

  it('responds to appointment keyword', async () => {
    const result = await sendChatMessageMock('patient-123', 'When is my appointment?');
    expect(result.reply.toLowerCase()).toContain('appointment');
  });

  it('returns default response for unknown messages', async () => {
    const result = await sendChatMessageMock('patient-123', 'Something random');
    expect(result.reply).toBeTruthy();
  });
});