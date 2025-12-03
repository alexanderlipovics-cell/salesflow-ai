/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LEARNING API                                                              ║
 * ║  API Functions für Learning Events & Template Performance                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type LearningEventType = 
  | 'message_suggested'
  | 'message_sent'
  | 'message_edited'
  | 'message_replied'
  | 'message_positive_reply'
  | 'message_negative_reply'
  | 'message_no_reply'
  | 'deal_won'
  | 'deal_lost'
  | 'call_booked'
  | 'meeting_held';

export interface LearningEvent {
  id: string;
  company_id: string;
  user_id: string;
  event_type: LearningEventType;
  template_id: string | null;
  lead_id: string | null;
  channel: string | null;
  vertical_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TemplateStats {
  template_id: string;
  name: string | null;
  channel: string | null;
  vertical_id: string | null;
  times_sent: number;
  times_replied: number;
  times_positive: number;
  times_negative: number;
  deals_won: number;
  deals_lost: number;
  reply_rate: number;
  positive_rate: number;
  win_rate: number;
}

export interface ChannelStats {
  channel: string;
  times_sent: number;
  times_replied: number;
  reply_rate: number;
  win_rate: number;
}

export interface TopTemplate {
  template_id: string;
  name: string | null;
  channel: string | null;
  vertical_id: string | null;
  preview: string | null;
  stats: {
    times_sent: number;
    reply_rate: number;
    win_rate: number;
  };
}

// =============================================================================
// HELPER
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// EVENT LOGGING
// =============================================================================

/**
 * Loggt ein Learning Event.
 */
export async function logEvent(event: {
  event_type: LearningEventType;
  template_id?: string;
  lead_id?: string;
  channel?: string;
  vertical_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; created_at: string }> {
  return apiRequest('/learning/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

/**
 * Nachricht gesendet.
 */
export async function logMessageSent(data: {
  lead_id: string;
  template_id?: string;
  channel?: string;
  vertical_id?: string;
  was_edited?: boolean;
  message_preview?: string;
}): Promise<{ id: string }> {
  return apiRequest('/learning/events/message-sent', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Antwort erhalten.
 */
export async function logReplyReceived(data: {
  lead_id: string;
  is_positive?: boolean;
  response_time_hours?: number;
  template_id?: string;
  channel?: string;
  vertical_id?: string;
}): Promise<{ id: string }> {
  return apiRequest('/learning/events/reply-received', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Deal Outcome.
 */
export async function logDealOutcome(data: {
  lead_id: string;
  won: boolean;
  template_id?: string;
  channel?: string;
  vertical_id?: string;
  deal_value?: number;
}): Promise<{ id: string }> {
  return apiRequest('/learning/events/deal-outcome', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Call gebucht.
 */
export async function logCallBooked(
  leadId: string,
  options: {
    templateId?: string;
    channel?: string;
    verticalId?: string;
  } = {}
): Promise<{ id: string }> {
  const params = new URLSearchParams();
  params.append('lead_id', leadId);
  if (options.templateId) params.append('template_id', options.templateId);
  if (options.channel) params.append('channel', options.channel);
  if (options.verticalId) params.append('vertical_id', options.verticalId);
  
  return apiRequest(`/learning/events/call-booked?${params.toString()}`, {
    method: 'POST',
  });
}

/**
 * Meeting durchgeführt.
 */
export async function logMeetingHeld(
  leadId: string,
  options: {
    templateId?: string;
    channel?: string;
    verticalId?: string;
  } = {}
): Promise<{ id: string }> {
  const params = new URLSearchParams();
  params.append('lead_id', leadId);
  if (options.templateId) params.append('template_id', options.templateId);
  if (options.channel) params.append('channel', options.channel);
  if (options.verticalId) params.append('vertical_id', options.verticalId);
  
  return apiRequest(`/learning/events/meeting-held?${params.toString()}`, {
    method: 'POST',
  });
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Holt Stats für ein Template.
 */
export async function getTemplateStats(
  templateId: string,
  options: {
    fromDate?: string;
    toDate?: string;
  } = {}
): Promise<TemplateStats> {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('from_date', options.fromDate);
  if (options.toDate) params.append('to_date', options.toDate);
  
  const queryString = params.toString();
  return apiRequest<TemplateStats>(`/learning/templates/${templateId}/stats${queryString ? `?${queryString}` : ''}`);
}

/**
 * Holt Channel Stats.
 */
export async function getChannelStats(options: {
  fromDate?: string;
  toDate?: string;
} = {}): Promise<ChannelStats[]> {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('from_date', options.fromDate);
  if (options.toDate) params.append('to_date', options.toDate);
  
  const queryString = params.toString();
  return apiRequest<ChannelStats[]>(`/learning/channels/stats${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// TOP TEMPLATES
// =============================================================================

/**
 * Holt Top-performende Templates für CHIEF.
 */
export async function getTopTemplates(options: {
  verticalId?: string;
  channel?: string;
  lookbackDays?: number;
  minSends?: number;
  limit?: number;
} = {}): Promise<{
  templates: TopTemplate[];
  lookback_days: number;
  min_sends: number;
}> {
  const params = new URLSearchParams();
  if (options.verticalId) params.append('vertical_id', options.verticalId);
  if (options.channel) params.append('channel', options.channel);
  if (options.lookbackDays) params.append('lookback_days', options.lookbackDays.toString());
  if (options.minSends) params.append('min_sends', options.minSends.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  
  const queryString = params.toString();
  return apiRequest(`/learning/top-templates${queryString ? `?${queryString}` : ''}`);
}

/**
 * Holt Top-Templates als formatierten String für CHIEF System Prompt.
 */
export async function getTopTemplatesFormatted(options: {
  verticalId?: string;
  channel?: string;
  lookbackDays?: number;
  minSends?: number;
  limit?: number;
} = {}): Promise<{
  formatted: string;
  template_count: number;
}> {
  const params = new URLSearchParams();
  if (options.verticalId) params.append('vertical_id', options.verticalId);
  if (options.channel) params.append('channel', options.channel);
  if (options.lookbackDays) params.append('lookback_days', options.lookbackDays.toString());
  if (options.minSends) params.append('min_sends', options.minSends.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  
  const queryString = params.toString();
  return apiRequest(`/learning/top-templates/formatted${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const learningApi = {
  // Event Logging
  logEvent,
  logMessageSent,
  logReplyReceived,
  logDealOutcome,
  logCallBooked,
  logMeetingHeld,
  
  // Stats
  getTemplateStats,
  getChannelStats,
  
  // Top Templates
  getTopTemplates,
  getTopTemplatesFormatted,
};

export default learningApi;

