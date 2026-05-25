// frontend/src/api/ai/ai.mock.ts

import type { ChatMessage, SendMessageResponse } from './ai.types';

/**
 * Simulates network delay and returns a mock AI response.
 * Use this when you want to develop the frontend without a running backend.
 */
export async function sendChatMessageMock(
  _patientId: string, // prefixed with _ to indicate intentionally unused
  message: string,
  _conversationHistory?: ChatMessage[] // unused in mock, but kept for API compatibility
): Promise<SendMessageResponse> {
  // Simulate network latency (300–800ms)
  const delay = Math.random() * 500 + 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simple mock responses based on keywords
  let reply = "I'm your AI assistant. How can I help with patient care?";
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('medication')) {
    reply = 'Based on the patient’s profile, current medications are listed in the schedule. Would you like a reminder summary?';
  } else if (lowerMsg.includes('appointment')) {
    reply = 'The next appointment is on Friday at 10 AM. I can help reschedule if needed.';
  } else if (lowerMsg.includes('symptom')) {
    reply = 'Please log any new symptoms in the daily checklist. I can flag them for the care team.';
  }

  return {
    reply,
    responseTimeMs: delay,
  };
}