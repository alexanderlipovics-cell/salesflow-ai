/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AUTOPILOT API                                                             ║
 * ║  API Functions für Auto-Reply System, Drafts & Settings                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type ChannelType = 'instagram' | 'whatsapp' | 'telegram' | 'linkedin' | 'email';
export type DraftStatus = 'pending' | 'approved' | 'edited' | 'rejected' | 'sent';
export type ActionType = 'auto_send' | 'draft_review' | 'human_needed' | 'archive' | 'skip';
export type IntentType = 
  | 'greeting' 
  | 'info_request' 
  | 'objection' 
  | 'interest' 
  | 'question' 
  | 'scheduling' 
  | 'complaint' 
  | 'other';
export type AutonomyLevel = 'conservative' | 'balanced' | 'aggressive';

export interface AutopilotSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  autonomy_level: AutonomyLevel;
  auto_send_threshold: number;
  draft_threshold: number;
  enabled_channels: ChannelType[];
  enabled_intents: IntentType[];
  working_hours_only: boolean;
  working_hours_start: string;
  working_hours_end: string;
  timezone: string;
  max_auto_replies_per_day: number;
  require_lead_match: boolean;
  exclude_vip_leads: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutopilotDraft {
  id: string;
  lead_id: string;
  lead_name: string | null;
  content: string;
  intent: IntentType;
  status: DraftStatus;
  confidence_score: number;
  created_at: string;
  approved_at: string | null;
}

export interface ActionLog {
  id: string;
  lead_id: string;
  lead_name: string | null;
  action: ActionType;
  intent: IntentType;
  confidence_score: number;
  response_sent: boolean;
  created_at: string;
}

export interface MorningBriefing {
  date: string;
  overnight_messages: number;
  auto_replied: number;
  drafts_pending: number;
  human_needed: number;
  auto_booked_appointments: number;
  new_hot_leads: number;
  ready_to_close: number;
  estimated_pipeline_value: number;
  today_tasks: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
  }>;
  estimated_user_time_minutes: number;
  greeting_message: string;
}

export interface EveningSummary {
  date: string;
  total_messages_sent: number;
  auto_replies: number;
  followups_sent: number;
  user_approved: number;
  new_replies_received: number;
  appointments_booked: number;
  deals_closed: number;
  revenue: number;
  user_time_minutes: number;
  estimated_manual_time_minutes: number;
  time_saved_minutes: number;
  tomorrow_preview: {
    scheduled_followups: number;
    scheduled_calls: number;
  };
}

export interface AutopilotStats {
  period: 'today' | 'week' | 'month';
  total_inbound: number;
  total_processed: number;
  auto_sent: number;
  drafts_created: number;
  human_needed: number;
  archived: number;
  auto_rate: number;
  success_rate: number;
  estimated_time_saved_minutes: number;
  avg_confidence_score: number;
  confidence_distribution: Record<string, number>;
}

export interface LeadOverride {
  lead_id: string;
  mode: 'full_auto' | 'always_draft' | 'human_only' | 'disabled';
  reason: string | null;
  is_vip: boolean;
  created_at: string;
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
// SETTINGS
// =============================================================================

/**
 * Lädt die Autopilot-Settings.
 */
export async function getSettings(): Promise<AutopilotSettings> {
  return apiRequest<AutopilotSettings>('/autopilot/settings');
}

/**
 * Updated die Autopilot-Settings.
 */
export async function updateSettings(settings: Partial<Omit<AutopilotSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<AutopilotSettings> {
  return apiRequest<AutopilotSettings>('/autopilot/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

/**
 * Aktiviert/Deaktiviert Autopilot.
 */
export async function toggleAutopilot(enabled: boolean): Promise<AutopilotSettings> {
  return updateSettings({ is_enabled: enabled });
}

// =============================================================================
// LEAD OVERRIDES
// =============================================================================

/**
 * Lädt Override-Settings für einen Lead.
 */
export async function getLeadOverride(leadId: string): Promise<LeadOverride | null> {
  return apiRequest<LeadOverride | null>(`/autopilot/leads/${leadId}/override`);
}

/**
 * Erstellt Override für einen Lead.
 */
export async function createLeadOverride(
  leadId: string,
  override: {
    mode: 'full_auto' | 'always_draft' | 'human_only' | 'disabled';
    reason?: string;
    is_vip?: boolean;
  }
): Promise<LeadOverride> {
  return apiRequest<LeadOverride>(`/autopilot/leads/${leadId}/override`, {
    method: 'POST',
    body: JSON.stringify(override),
  });
}

/**
 * Updated Override für einen Lead.
 */
export async function updateLeadOverride(
  leadId: string,
  override: Partial<{
    mode: 'full_auto' | 'always_draft' | 'human_only' | 'disabled';
    reason: string;
    is_vip: boolean;
  }>
): Promise<LeadOverride> {
  return apiRequest<LeadOverride>(`/autopilot/leads/${leadId}/override`, {
    method: 'PUT',
    body: JSON.stringify(override),
  });
}

/**
 * Löscht Override für einen Lead.
 */
export async function deleteLeadOverride(leadId: string): Promise<{ success: boolean }> {
  return apiRequest(`/autopilot/leads/${leadId}/override`, {
    method: 'DELETE',
  });
}

// =============================================================================
// DRAFTS
// =============================================================================

/**
 * Lädt alle Drafts.
 */
export async function getDrafts(options: {
  status?: DraftStatus;
  limit?: number;
  offset?: number;
} = {}): Promise<{
  drafts: AutopilotDraft[];
  total: number;
  pending_count: number;
}> {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  
  const queryString = params.toString();
  return apiRequest(`/autopilot/drafts${queryString ? `?${queryString}` : ''}`);
}

/**
 * Genehmigt einen Draft.
 */
export async function approveDraft(
  draftId: string,
  editedContent?: string
): Promise<AutopilotDraft> {
  return apiRequest<AutopilotDraft>(`/autopilot/drafts/${draftId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ edited_content: editedContent }),
  });
}

/**
 * Lehnt einen Draft ab.
 */
export async function rejectDraft(draftId: string): Promise<{ success: boolean }> {
  return apiRequest(`/autopilot/drafts/${draftId}/reject`, {
    method: 'POST',
  });
}

// =============================================================================
// ACTION LOGS
// =============================================================================

/**
 * Lädt Action Logs.
 */
export async function getActionLogs(options: {
  days?: number;
  action?: ActionType;
  limit?: number;
} = {}): Promise<{
  actions: ActionLog[];
  total: number;
  auto_sent_count: number;
  draft_count: number;
  human_needed_count: number;
}> {
  const params = new URLSearchParams();
  if (options.days) params.append('days', options.days.toString());
  if (options.action) params.append('action', options.action);
  if (options.limit) params.append('limit', options.limit.toString());
  
  const queryString = params.toString();
  return apiRequest(`/autopilot/actions${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// BRIEFINGS
// =============================================================================

/**
 * Lädt das Morning Briefing.
 */
export async function getMorningBriefing(): Promise<MorningBriefing> {
  return apiRequest<MorningBriefing>('/autopilot/briefing/morning');
}

/**
 * Lädt das Evening Summary.
 */
export async function getEveningSummary(): Promise<EveningSummary> {
  return apiRequest<EveningSummary>('/autopilot/briefing/evening');
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Lädt Autopilot Performance Stats.
 */
export async function getStats(period: 'today' | 'week' | 'month' = 'week'): Promise<AutopilotStats> {
  return apiRequest<AutopilotStats>(`/autopilot/stats?period=${period}`);
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const autopilotApi = {
  // Settings
  getSettings,
  updateSettings,
  toggleAutopilot,
  
  // Lead Overrides
  getLeadOverride,
  createLeadOverride,
  updateLeadOverride,
  deleteLeadOverride,
  
  // Drafts
  getDrafts,
  approveDraft,
  rejectDraft,
  
  // Action Logs
  getActionLogs,
  
  // Briefings
  getMorningBriefing,
  getEveningSummary,
  
  // Stats
  getStats,
};

export default autopilotApi;

