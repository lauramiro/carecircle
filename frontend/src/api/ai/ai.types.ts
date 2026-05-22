
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface SendMessageRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface SendMessageResponse {
  reply: string;
  responseTimeMs: number;
}