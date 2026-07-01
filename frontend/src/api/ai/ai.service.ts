import type { ChatMessage, SendMessageResponse } from './ai.types';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function apiUrl(path: string): string {
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

export async function sendChatMessage(
  patientId: string,
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<SendMessageResponse> {
  const response = await fetch(apiUrl(`/api/ai/chat/${patientId}`), {
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