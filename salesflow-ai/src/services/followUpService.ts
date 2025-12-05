/**
 * Follow-Up Service
 * 
 * API Integration für das intelligente Follow-Up System.
 * Verbindet Frontend mit GPT-5.1 Follow-Up Engine Backend.
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
};
