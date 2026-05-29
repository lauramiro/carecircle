import { sendChatMessage } from '../../api/ai/ai.service';
import type { ChatMessage } from '../../api/ai/ai.types';
import { useState, useCallback } from 'react';

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
      const response = await sendChatMessage(patientId, content, messages);
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