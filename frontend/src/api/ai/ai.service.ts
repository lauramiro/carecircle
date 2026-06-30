import { parseResponseJson } from '../../utils/helper';
import type { ChatMessage, SendMessageResponse } from './ai.types';

export async function sendChatMessage(
  patientId: string,
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<SendMessageResponse> {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  const url = apiBaseUrl ? `${apiBaseUrl}/api/ai/chat/${patientId}` : `/api/ai/chat/${patientId}`;
  const response = await fetch(url, {
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

  return parseResponseJson<SendMessageResponse>(response);
}