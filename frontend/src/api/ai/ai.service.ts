import type { ChatMessage, SendMessageResponse } from './ai.types';

export async function sendChatMessage(
  patientId: string,
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<SendMessageResponse> {
  const response = await fetch(`/api/ai/chat/${patientId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      conversationHistory,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI chat request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}