export type MessageType = 'question' | 'answer' | 'error';

export interface ConversationMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  latencyMs?: number;
  
}
