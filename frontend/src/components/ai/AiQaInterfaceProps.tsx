import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Send } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingIndicator from './LoadingIndicator';
import type { ConversationMessage } from './types';

interface AiQaInterfaceProps {
  groupId: string;
}

// ========== MOCK RESPONSE FUNCTION ==========
async function mockAiResponse(question: string, _patientId: string): Promise<{ answer: string; latencyMs: number }> {
  // Simulate network delay (300–800ms)
  const delay = Math.random() * 500 + 300;
  await new Promise(resolve => setTimeout(resolve, delay));

  let answer = "I'm your AI assistant. How can I help with patient care?";
  const lower = question.toLowerCase();
  if (lower.includes('medication')) {
    answer = 'Based on the patient’s profile, current medications are listed in the schedule. Would you like a reminder summary?';
  } else if (lower.includes('appointment')) {
    answer = 'The next appointment is on Friday at 10 AM. I can help reschedule if needed.';
  } else if (lower.includes('symptom')) {
    answer = 'Please log any new symptoms in the daily checklist. I can flag them for the care team.';
  }

  return { answer, latencyMs: delay };
}
// ============================================

export default function AiQaInterface({ groupId }: AiQaInterfaceProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (question: string) => {
    if (!question.trim()) return;

    // Add user message
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      type: 'question',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Decide whether to use mock or real backend
      const useMock =  import.meta.env.VITE_USE_AI_MOCK === 'true';
      console.log('useMock value:', useMock);
      console.log('env var:', import.meta.env.VITE_USE_AI_MOCK); 

      if (useMock) {
        // ---------- MOCK MODE ----------
        const { answer, latencyMs } = await mockAiResponse(question, groupId);
        const aiMessage: ConversationMessage = {
          id: `ai-${Date.now()}`,
          type: 'answer',
          content: answer,
          latencyMs: latencyMs,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        // ------------------------------
      } else {
        // ---------- REAL BACKEND (currently commented out) ----------
         const response = await fetch('/api/ai/qa', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             question: question.trim(),
             groupId,
           }),
         });
         if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.message || 'Failed to get response from AI');
         }
         const data = await response.json();
         const aiMessage: ConversationMessage = {
           id: `ai-${Date.now()}`,
           type: 'answer',
           content: data.answer,
           latencyMs: data.latencyMs,
           timestamp: new Date(),
         };
         setMessages((prev) => [...prev, aiMessage]);
         //-------------------------------------------------------------

        
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);

      const errorMessageObj: ConversationMessage = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      className="flex flex-col h-screen"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h1
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '26px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Care Assistant
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Ask questions about medications, appointments, and care
        </p>
      </div>

      {/* Chat History - Scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-accent-soft)' }}
              >
                <Send size={32} style={{ color: 'var(--color-primary)' }} />
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Start a conversation
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Ask about medications, conditions, appointments, and more
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Section */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={isLoading}
        />
      </div>
    </section>
  );
}