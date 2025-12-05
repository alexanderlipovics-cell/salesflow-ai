// types/messaging.ts

export type MessageChannel =
  | 'whatsapp'
  | 'telegram'
  | 'instagram_dm'
  | 'facebook_messenger'
  | 'sms'
  | 'email';

export type MessageStatus =
  | 'draft'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface Message {
  id: string;
  lead_id: string;
  user_id: string;
  channel: MessageChannel;
  direction: 'inbound' | 'outbound';
  content: string;
  translated_content?: string;
  template_id?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document';
  status: MessageStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_reason?: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'greeting' | 'follow_up' | 'objection' | 'close' | 'custom';
  variables: string[];
  channel?: MessageChannel;
  language: string;
  translations?: Record<string, string>;
  usage_count: number;
  success_rate?: number;
}

export interface Conversation {
  lead_id: string;
  lead_name: string;
  lead_avatar?: string;
  last_message: Message;
  unread_count: number;
  messages: Message[];
}


