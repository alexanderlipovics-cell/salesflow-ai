/**
 * AI Chat Types
 * 
 * Types für das AI Chat Feature mit Lead-Kontext
 */

// ─────────────────────────────────────────────────────────────────
// Session Types
// ─────────────────────────────────────────────────────────────────

export type ChatSessionType = 'lead_coaching' | 'general' | 'objection_handling' | 'message_generation';

export interface ChatSession {
  id: string;
  user_id: string;
  lead_id?: string | null;
  session_type: ChatSessionType;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────
// Message Types
// ─────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface NewChatMessage {
  session_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
}

// ─────────────────────────────────────────────────────────────────
// Lead Context (from get_lead_context_for_ai function)
// ─────────────────────────────────────────────────────────────────

export interface LeadContext {
  lead: {
    id: string;
    name: string | null;
    company: string | null;
    vertical: string | null;
    phone: string | null;
    email: string | null;
    instagram: string | null;
    status: string | null;
    notes: string | null;
    created_at: string;
  };
  score: {
    total_score: number;
    temperature: 'hot' | 'warm' | 'cold';
    engagement_score: number;
    recency_score: number;
    fit_score: number;
  };
  followup_status: {
    current_step: string | null;
    current_phase: string | null;
    total_attempts: number;
    next_followup_at: string | null;
    reply_received: boolean;
    last_contact_at: string | null;
  };
  recent_interactions: Array<{
    type: string;
    channel: string;
    outcome: string | null;
    summary: string | null;
    created_at: string;
  }>;
  recent_messages: Array<{
    step_code: string;
    channel: string;
    message_sent: string | null;
    sent_at: string | null;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// Quick Actions
// ─────────────────────────────────────────────────────────────────

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'write_message',
    label: 'Nachricht schreiben',
    prompt: 'Schreib mir eine personalisierte Nachricht für diesen Lead, die zu seiner aktuellen Phase passt.',
    icon: '✍️',
  },
  {
    id: 'handle_objection',
    label: 'Einwand behandeln',
    prompt: 'Wie soll ich reagieren, wenn der Lead sagt: "Ich habe gerade keine Zeit"?',
    icon: '🛡️',
  },
  {
    id: 'strategy',
    label: 'Strategie entwickeln',
    prompt: 'Was ist die beste Strategie, um diesen Lead zu konvertieren?',
    icon: '🎯',
  },
  {
    id: 'next_step',
    label: 'Nächster Schritt',
    prompt: 'Was sollte mein nächster Schritt bei diesem Lead sein?',
    icon: '➡️',
  },
  {
    id: 'analyze',
    label: 'Lead analysieren',
    prompt: 'Analysiere diesen Lead und gib mir eine Einschätzung.',
    icon: '🔍',
  },
];

// ─────────────────────────────────────────────────────────────────
// Temperature Colors
// ─────────────────────────────────────────────────────────────────

export const TEMPERATURE_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  hot: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: '🔥 Hot' },
  warm: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: '☀️ Warm' },
  cold: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', label: '❄️ Cold' },
};

