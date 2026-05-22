import { sendChatMessage } from '../../api/ai/ai.service';
import { sendChatMessageMock } from '../../api/ai/ai.mock';
import type { ChatMessage } from '../../api/ai/ai.types';
import { useState, useCallback } from 'react';

const useMock = import.meta.env.VITE_USE_AI_MOCK === 'true';
const sendMessage = useMock ? sendChatMessageMock : sendChatMessage;

export function useAiChat(patientId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (content: string) => {
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    try {
      const response = await sendMessage(patientId, content, messages);
      const assistantMsg: ChatMessage = { role: 'assistant', content: response.reply, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      return response.responseTimeMs;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [patientId, messages]);

  return { messages, isLoading, error, send };
}