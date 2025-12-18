/**
 * Lead Interactions Types
 * 
 * Types für das Interaction Log Feature
 */

// ─────────────────────────────────────────────────────────────────
// Interaction Types & Channels
// ─────────────────────────────────────────────────────────────────

export type InteractionType =
  | 'call_outbound'
  | 'call_inbound'
  | 'dm_sent'
  | 'dm_received'
  | 'email_sent'
  | 'email_received'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'note'
  | 'status_change';

export type InteractionChannel =
  | 'phone'
  | 'whatsapp'
  | 'instagram'
  | 'email'
  | 'linkedin'
  | 'in_person'
  | 'other';

export type InteractionOutcome =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'no_answer'
  | 'callback'
  | 'not_interested'
  | 'meeting_booked'
  | 'deal_closed';

// ─────────────────────────────────────────────────────────────────
// Interaction Interface
// ─────────────────────────────────────────────────────────────────

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: InteractionType;
  channel: InteractionChannel;
  outcome?: InteractionOutcome | null;
  summary?: string | null;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  created_by?: string | null;
}

export interface NewInteraction {
  lead_id: string;
  type: InteractionType;
  channel: InteractionChannel;
  outcome?: InteractionOutcome | null;
  summary?: string | null;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown> | null;
}

// ─────────────────────────────────────────────────────────────────
// Lead Stats (from View)
// ─────────────────────────────────────────────────────────────────

export interface LeadStats {
  lead_id: string;
  total_interactions: number;
  total_calls: number;
  total_dms: number;
  total_meetings: number;
  last_interaction_at: string | null;
  last_interaction_type: InteractionType | null;
  positive_outcomes: number;
  negative_outcomes: number;
}

// ─────────────────────────────────────────────────────────────────
// Display Helpers
// ─────────────────────────────────────────────────────────────────

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call_outbound: 'Ausgehender Anruf',
  call_inbound: 'Eingehender Anruf',
  dm_sent: 'Nachricht gesendet',
  dm_received: 'Nachricht erhalten',
  email_sent: 'E-Mail gesendet',
  email_received: 'E-Mail erhalten',
  meeting_scheduled: 'Meeting geplant',
  meeting_completed: 'Meeting abgeschlossen',
  note: 'Notiz',
  status_change: 'Status geändert',
};

export const INTERACTION_TYPE_ICONS: Record<InteractionType, string> = {
  call_outbound: '📞',
  call_inbound: '📲',
  dm_sent: '💬',
  dm_received: '💬',
  email_sent: '📧',
  email_received: '📧',
  meeting_scheduled: '📅',
  meeting_completed: '✅',
  note: '📝',
  status_change: '🔄',
};

export const CHANNEL_LABELS: Record<InteractionChannel, string> = {
  phone: 'Telefon',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'E-Mail',
  linkedin: 'LinkedIn',
  in_person: 'Persönlich',
  other: 'Sonstiges',
};

export const OUTCOME_LABELS: Record<InteractionOutcome, string> = {
  positive: 'Positiv',
  neutral: 'Neutral',
  negative: 'Negativ',
  no_answer: 'Keine Antwort',
  callback: 'Rückruf vereinbart',
  not_interested: 'Kein Interesse',
  meeting_booked: 'Meeting gebucht',
  deal_closed: 'Deal abgeschlossen',
};

export const OUTCOME_COLORS: Record<InteractionOutcome, { bg: string; text: string; border: string }> = {
  positive: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  neutral: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  negative: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  no_answer: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  callback: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  not_interested: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  meeting_booked: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  deal_closed: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
};

