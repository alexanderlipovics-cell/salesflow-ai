/**
 * Follow-Up Service
 * 
 * API Integration für das intelligente Follow-Up System.
 * Verbindet Frontend mit GPT-5.1 Follow-Up Engine Backend.
 * 
 * @version 2.0.0
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/apiConfig';

// ============================================
// TYPES
// ============================================

export interface FollowUpSuggestion {
  lead_id: string;
  workspace_id: string;
  owner_id: string;
  sequence_id?: string;
  step_id?: string;
  recommended_channel: 'whatsapp' | 'sms' | 'email' | 'phone' | 'instagram_dm';
  recommended_time: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  meta: {
    sequence_name?: string;
    step_action?: string;
    template_key?: string;
    lead_name?: string;
  };
}

export interface AIMessage {
  lead_id: string;
  workspace_id: string;
  owner_id: string;
  channel: string;
  content: string;
  language: string;
  template_key?: string;
  used_sequence_id?: string;
  used_step_id?: string;
  model_name?: string;
  prompt_version?: string;
  tokens_used?: number;
}

export interface TodayFollowUpResponse {
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  follow_ups: FollowUpSuggestion[];
}

export interface SnoozeResponse {
  success: boolean;
  lead_id: string;
  new_scheduled_time: string;
  message: string;
}

// ============================================
// FOLLOW-UP SUGGESTIONS (Supabase-backed)
// ============================================

export interface FollowupSuggestionV2Lead {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
}

export type FollowupSuggestionStatus = 'pending' | 'sent' | 'skipped' | 'snoozed';

export interface FollowupSuggestionV2 {
  id: string;
  user_id: string;
  lead_id: string;
  flow: string;
  stage: number;
  template_key: string;
  channel: string;
  suggested_message: string;
  reason: string;
  due_at: string;
  status: FollowupSuggestionStatus;
  sent_at?: string;
  snoozed_until?: string;
  created_at?: string;
  leads?: FollowupSuggestionV2Lead; // joined lead data
}

export interface FollowupStats {
  pending_count: number;
  sent_this_week: number;
  active_flows?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

export async function getTodayFollowUps(): Promise<TodayFollowUpResponse> {
  const response = await apiClient.get<TodayFollowUpResponse>(
    API_ENDPOINTS.FOLLOWUPS.TODAY
  );
  return response.data;
}

export async function getNextFollowUp(leadId: string): Promise<FollowUpSuggestion | null> {
  try {
    const response = await apiClient.get<FollowUpSuggestion>(
      API_ENDPOINTS.FOLLOWUPS.GET(leadId)
    );
    return response.data;
  } catch (error) {
    // 404 = kein Follow-up verfügbar
    return null;
  }
}

export async function generateFollowUpMessage(
  leadId: string,
  context?: Record<string, unknown>
): Promise<AIMessage> {
  const response = await apiClient.post<AIMessage>(
    API_ENDPOINTS.FOLLOWUPS.GENERATE(leadId),
    { context }
  );
  return response.data;
}

export async function snoozeFollowUp(
  leadId: string,
  preset?: '1h' | 'evening' | 'tomorrow' | 'next_monday',
  customTime?: string
): Promise<SnoozeResponse> {
  const response = await apiClient.post<SnoozeResponse>(
    API_ENDPOINTS.FOLLOWUPS.SNOOZE(leadId),
    { preset, custom_time: customTime }
  );
  return response.data;
}

export async function batchGenerateFollowUps(leadIds: string[]): Promise<{
  generated: number;
  messages: AIMessage[];
}> {
  const response = await apiClient.post<{ generated: number; messages: AIMessage[] }>(
    API_ENDPOINTS.FOLLOWUPS.BATCH_GENERATE,
    { lead_ids: leadIds }
  );
  return response.data;
}

/**
 * Startet die Standard-Follow-Up-Sequenz für einen Lead.
 * Wird z.B. nach dem Lead Hunter Import verwendet.
 */
export async function startStandardFollowUpSequenceForLead(
  leadId: string,
  sequenceType: string = 'new_lead'
): Promise<{ success: boolean; message: string; sequence_id?: string }> {
  try {
    const response = await apiClient.post<{ success: boolean; message: string; sequence_id?: string }>(
      `/follow-ups/${leadId}/start-sequence`,
      { sequence_type: sequenceType }
    );
    return response.data;
  } catch (error) {
    console.warn('Could not start follow-up sequence:', error);
    return { 
      success: false, 
      message: 'Follow-up sequence start postponed' 
    };
  }
}

/**
 * Plant den nächsten Loop-Check-in Task.
 * Wird nach Abschluss eines rx_loop_checkin Tasks aufgerufen.
 */
export async function scheduleNextLoopCheckinTask(task: {
  id: string;
  lead_id: string;
  due_at: string | null;
}): Promise<{ success: boolean; next_due_at?: string }> {
  try {
    const response = await apiClient.post<{ success: boolean; next_due_at?: string }>(
      `/follow-ups/${task.lead_id}/schedule-loop-checkin`,
      { 
        previous_task_id: task.id,
        previous_due_at: task.due_at 
      }
    );
    return response.data;
  } catch (error) {
    console.warn('Could not schedule next loop check-in:', error);
    // Fallback: Lokale Berechnung (7 Tage später)
    const nextDue = task.due_at 
      ? new Date(new Date(task.due_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    return { 
      success: false, 
      next_due_at: nextDue 
    };
  }
}

// ============================================
// V2 Suggestions (Backend API)
// ============================================

export async function getFollowupSuggestions(timeFilter: 'week' | 'month' | 'all' = 'week'): Promise<FollowupSuggestionV2[]> {
  const endpoint = timeFilter === 'all'
    ? API_ENDPOINTS.FOLLOWUPS.ALL
    : API_ENDPOINTS.FOLLOWUPS.PENDING;

  const response = await apiClient.get<{ suggestions: FollowupSuggestionV2[] }>(
    endpoint,
    { skipCache: true }
  );
  return response.data.suggestions ?? [];
}

export async function markFollowupSuggestion(
  id: string,
  action: 'send' | 'skip' | 'snooze',
  options?: { snooze_days?: number; edited_message?: string }
): Promise<void> {
  await apiClient.post(
    API_ENDPOINTS.FOLLOWUPS.SUGGESTION_ACTION(id),
    {
      action,
      snooze_days: options?.snooze_days,
      edited_message: options?.edited_message,
    },
    { skipCache: true }
  );
}

export async function getFollowupStats(): Promise<FollowupStats> {
  const response = await apiClient.get<FollowupStats>(API_ENDPOINTS.FOLLOWUPS.STATS, { skipCache: true });
  return response.data;
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const followUpQueryKeys = {
  all: ['follow-ups'] as const,
  today: ['follow-ups', 'today'] as const,
  lead: (leadId: string) => ['follow-ups', 'lead', leadId] as const,
};

export default {
  getTodayFollowUps,
  getNextFollowUp,
  generateFollowUpMessage,
  snoozeFollowUp,
  batchGenerateFollowUps,
  startStandardFollowUpSequenceForLead,
  scheduleNextLoopCheckinTask,
};
