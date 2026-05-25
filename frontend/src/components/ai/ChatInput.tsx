import { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading: _isLoading,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, but allow Shift+Enter for newlines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={2}
          className="w-full px-4 py-3 rounded-lg border resize-none focus:outline-none focus:ring-2"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: disabled ? 'var(--color-bg-disabled)' : 'var(--color-input-bg)',
            color: 'var(--color-text-primary)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '14px',
            '--tw-ring-color': 'var(--color-primary)',
          } as any}
        />
      </div>

      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="px-4 py-3 rounded-lg flex items-center justify-center transition-opacity"
        style={{
          backgroundColor: disabled || !input.trim() ? 'var(--color-text-hint)' : 'var(--color-primary)',
          color: '#ffffff',
          cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
          opacity: disabled || !input.trim() ? 0.5 : 1,
          minWidth: '44px',
          height: '44px',
        }}
        title="Send message (Enter)"
      >
        <Send size={18} />
      </button>
    </form>
  );
}
