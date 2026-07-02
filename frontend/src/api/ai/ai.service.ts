import type { ChatMessage, SendMessageResponse } from './ai.types';

// Construct API base URL following the same pattern as medications.service.ts
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function sendChatMessage(
  patientId: string,
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<SendMessageResponse> {
  // Build the full API URL using the base
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

  // Validate response body is not empty and is valid JSON
  let data: SendMessageResponse;
  try {
    data = await response.json();
  } catch {
    throw new Error('Invalid response from AI service. Please try again.');
  }

  // Validate response has expected structure
  if (!data || typeof data.reply !== 'string') {
    throw new Error('Generated response is empty or invalid. Please try again.');
  }

  return data;
}