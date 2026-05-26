import { AlertCircle, Clock } from 'lucide-react';
import MarkdownContent from './MarkdownContent';
import type { ConversationMessage } from './types';

interface ChatMessageProps {
  message: ConversationMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.type === 'question') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-xs rounded-lg px-4 py-3"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          <p className="text-sm" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div className="flex justify-start">
        <div
          className="max-w-xs rounded-lg px-4 py-3 flex gap-3"
          style={{
            backgroundColor: 'var(--color-status-overdue-bg)',
            borderLeft: '3px solid var(--color-status-overdue)',
          }}
        >
          <AlertCircle
            size={20}
            style={{ color: 'var(--color-status-overdue)', flexShrink: 0 }}
          />
          <div>
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: 'var(--color-status-overdue)' }}
            >
              Error
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Answer message - now with markdown rendering
  return (
    <div className="flex justify-start">
      <div
        className="max-w-2xl rounded-lg px-4 py-3"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Use MarkdownContent instead of plain text */}
        <div
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        >
          <MarkdownContent content={message.content} />
        </div>

        {/* Metadata footer */}
        {message.latencyMs !== undefined && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs"
            style={{ borderColor: 'var(--color-border)' }}>
            <Clock size={12} style={{ color: 'var(--color-text-hint)' }} />
            <span style={{ color: 'var(--color-text-hint)' }}>
              {message.latencyMs}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}