export interface Message {
  id: number;
  created_at: string;
  messages: string;
  role?: 'user' | 'assistant';
  thinking?: boolean;
  session_id: number;
}

export interface Session {
  id: number;
  created_at: string;
  name: string;
  message_count: string | number;
  last_message_at: string | null;
}

export interface MenuItem {
  label: string;
  value: string | number;
}

export interface AIResponse {
  think?: string;
  output?: string;
} 