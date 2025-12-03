/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  PULSE TRACKER API CLIENT                                                  ║
 * ║  API Funktionen für Pulse Tracker & Behavioral Intelligence               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_BASE_URL } from '../services/apiConfig';
import type {
  CreateOutreachRequest,
  UpdateStatusRequest,
  BulkStatusUpdateRequest,
  BulkSkipRequest,
  CheckInItem,
  CheckInSummary,
  GhostLeadResponse,
  GhostBusterTemplate,
  SendGhostBusterRequest,
  AnalyzeBehaviorRequest,
  BehaviorAnalysisResult,
  BehaviorProfileResponse,
  AccurateFunnelResponse,
  FunnelInsightsResponse,
  FunnelHistoryItem,
  IntentCorrectionRequest,
  CheckinComplianceItem,
  GhostBusterEffectivenessItem,
  MessageStatus,
  FollowUpStrategy,
} from '../types/pulseTracker';

// =============================================================================
// HELPER
// =============================================================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// OUTREACH TRACKING
// =============================================================================

/**
 * Erstellt eine neue Outreach-Nachricht.
 */
export async function createOutreach(
  data: CreateOutreachRequest,
  token: string,
): Promise<{ id: string; sent_at: string; check_in_due_at: string; message: string }> {
  return apiRequest('/api/v1/pulse/outreach', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Aktualisiert den Status einer Outreach-Nachricht.
 */
export async function updateOutreachStatus(
  outreachId: string,
  data: UpdateStatusRequest,
  token: string,
): Promise<{ success: boolean; new_status: MessageStatus; ghost_buster_suggestion?: any }> {
  return apiRequest(`/api/v1/pulse/outreach/${outreachId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Bulk-Update für mehrere Check-ins.
 */
export async function bulkUpdateStatus(
  data: BulkStatusUpdateRequest,
  token: string,
): Promise<{ success: boolean; affected_count: number; status: MessageStatus }> {
  return apiRequest('/api/v1/pulse/outreach/bulk-status', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Überspringt mehrere Check-ins.
 */
export async function bulkSkipCheckins(
  data: BulkSkipRequest,
  token: string,
): Promise<{ success: boolean; skipped_count: number; message: string }> {
  return apiRequest('/api/v1/pulse/outreach/bulk-skip', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Führt Auto-Inference aus (markiert alte Messages als stale).
 */
export async function runAutoInference(
  token: string,
): Promise<{ success: boolean; stale_count: number; message: string }> {
  return apiRequest('/api/v1/pulse/system/auto-inference', {
    method: 'POST',
  }, token);
}

// =============================================================================
// CHECK-INS
// =============================================================================

/**
 * Holt alle fälligen Check-ins.
 */
export async function getPendingCheckins(token: string): Promise<CheckInItem[]> {
  return apiRequest('/api/v1/pulse/checkins', {}, token);
}

/**
 * Holt Check-in Zusammenfassung für Dashboard.
 */
export async function getCheckinSummary(token: string): Promise<CheckInSummary> {
  return apiRequest('/api/v1/pulse/checkins/summary', {}, token);
}

// =============================================================================
// GHOST BUSTER
// =============================================================================

/**
 * Holt alle Ghost-Leads.
 */
export async function getGhostLeads(
  token: string,
  minHours: number = 48,
  maxDays: number = 14,
): Promise<GhostLeadResponse[]> {
  return apiRequest(
    `/api/v1/pulse/ghosts?min_hours=${minHours}&max_days=${maxDays}`,
    {},
    token,
  );
}

/**
 * Sendet eine Ghost-Buster Nachricht.
 */
export async function sendGhostBuster(
  outreachId: string,
  data: SendGhostBusterRequest,
  token: string,
): Promise<{ success: boolean; ghost_buster_id: string; message: string }> {
  return apiRequest(`/api/v1/pulse/ghosts/${outreachId}/bust`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Holt alle Ghost-Buster Templates.
 */
export async function getGhostBusterTemplates(
  token: string,
  strategy?: FollowUpStrategy,
): Promise<GhostBusterTemplate[]> {
  const url = strategy
    ? `/api/v1/pulse/ghosts/templates?strategy=${strategy}`
    : '/api/v1/pulse/ghosts/templates';
  return apiRequest(url, {}, token);
}

// =============================================================================
// BEHAVIORAL ANALYSIS
// =============================================================================

/**
 * Analysiert Verhalten aus Chatverlauf.
 */
export async function analyzeBehavior(
  data: AnalyzeBehaviorRequest,
  token: string,
): Promise<BehaviorAnalysisResult> {
  return apiRequest('/api/v1/pulse/behavior/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

/**
 * Holt das Verhaltensprofil eines Leads.
 */
export async function getBehaviorProfile(
  leadId: string,
  token: string,
): Promise<BehaviorProfileResponse> {
  return apiRequest(`/api/v1/pulse/behavior/${leadId}`, {}, token);
}

// =============================================================================
// CONVERSION FUNNEL
// =============================================================================

/**
 * Holt Funnel-Metriken für einen Tag.
 */
export async function getFunnelMetrics(
  token: string,
  date?: string,
): Promise<AccurateFunnelResponse> {
  const url = date
    ? `/api/v1/pulse/funnel?target_date=${date}`
    : '/api/v1/pulse/funnel';
  return apiRequest(url, {}, token);
}

/**
 * Holt Funnel-Insights.
 */
export async function getFunnelInsights(token: string): Promise<FunnelInsightsResponse> {
  return apiRequest('/api/v1/pulse/funnel/insights', {}, token);
}

/**
 * Holt Funnel-History für Chart.
 */
export async function getFunnelHistory(
  token: string,
  days: number = 30,
): Promise<FunnelHistoryItem[]> {
  return apiRequest(`/api/v1/pulse/funnel/history?days=${days}`, {}, token);
}

// =============================================================================
// INTENT CORRECTION
// =============================================================================

/**
 * Speichert eine Intent-Korrektur für Training.
 */
export async function submitIntentCorrection(
  data: IntentCorrectionRequest,
  token: string,
): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/v1/pulse/corrections', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Holt Check-in Compliance Daten.
 */
export async function getCheckinCompliance(
  token: string,
  days: number = 30,
): Promise<CheckinComplianceItem[]> {
  return apiRequest(`/api/v1/analytics/pulse/compliance?days=${days}`, {}, token);
}

/**
 * Holt Ghost-Buster Effektivitäts-Daten.
 */
export async function getGhostBusterEffectiveness(
  token: string,
  days: number = 30,
): Promise<GhostBusterEffectivenessItem[]> {
  return apiRequest(`/api/v1/analytics/pulse/ghost-buster-effectiveness?days=${days}`, {}, token);
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Markiert eine Outreach als "Antwort erhalten".
 */
export async function markAsReplied(
  outreachId: string,
  token: string,
): Promise<{ success: boolean; new_status: MessageStatus }> {
  return updateOutreachStatus(outreachId, { status: 'replied' }, token);
}

/**
 * Markiert eine Outreach als "Gelesen, keine Antwort".
 */
export async function markAsSeen(
  outreachId: string,
  token: string,
): Promise<{ success: boolean; new_status: MessageStatus; ghost_buster_suggestion?: any }> {
  return updateOutreachStatus(outreachId, { status: 'seen' }, token);
}

/**
 * Markiert eine Outreach als "Nicht gelesen".
 */
export async function markAsInvisible(
  outreachId: string,
  token: string,
): Promise<{ success: boolean; new_status: MessageStatus }> {
  return updateOutreachStatus(outreachId, { status: 'invisible' }, token);
}

/**
 * Markiert alle ausstehenden Check-ins als "ghosted".
 */
export async function markAllAsGhosted(
  outreachIds: string[],
  token: string,
): Promise<{ success: boolean; affected_count: number }> {
  return bulkUpdateStatus({ outreach_ids: outreachIds, status: 'ghosted' }, token);
}

