/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DAILY FLOW API                                                            ║
 * ║  API Functions für Daily Flow Actions & Status                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type ActionType = 'outreach' | 'follow_up' | 'check_in' | 'content' | 'learn' | 'admin';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'snoozed';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface DailyAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  priority: Priority;
  status: ActionStatus;
  estimated_minutes: number;
  due_at: string | null;
  lead_id: string | null;
  lead_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export interface DailyFlowStatus {
  date: string;
  total_actions: number;
  completed_actions: number;
  completion_percent: number;
  streak_days: number;
  estimated_remaining_minutes: number;
  next_action: DailyAction | null;
  motivational_message: string;
}

export interface DailyFlowSettings {
  daily_outreach_goal: number;
  daily_follow_up_goal: number;
  working_hours_start: string;
  working_hours_end: string;
  preferred_action_order: ActionType[];
  auto_generate_actions: boolean;
  show_ai_suggestions: boolean;
}

export interface ActionCompletion {
  action_id: string;
  completed: boolean;
  notes: string | null;
  outcome: string | null;
  next_action_suggested: DailyAction | null;
  xp_earned: number;
  celebration_message: string | null;
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
// STATUS
// =============================================================================

/**
 * Holt Daily Flow Status.
 */
export async function getStatus(date?: string): Promise<DailyFlowStatus> {
  const params = date ? `?date=${date}` : '';
  return apiRequest<DailyFlowStatus>(`/daily-flow/status${params}`);
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Holt Aktionen für heute.
 */
export async function getActions(options: {
  date?: string;
  type?: ActionType;
  status?: ActionStatus;
  priority?: Priority;
} = {}): Promise<DailyAction[]> {
  const params = new URLSearchParams();
  if (options.date) params.append('date', options.date);
  if (options.type) params.append('type', options.type);
  if (options.status) params.append('status', options.status);
  if (options.priority) params.append('priority', options.priority);
  
  const queryString = params.toString();
  return apiRequest<DailyAction[]>(`/daily-flow/actions${queryString ? `?${queryString}` : ''}`);
}

/**
 * Holt die nächste empfohlene Aktion.
 */
export async function getNextAction(): Promise<DailyAction | null> {
  return apiRequest<DailyAction | null>('/daily-flow/next');
}

/**
 * Erstellt eine neue Aktion.
 */
export async function createAction(action: {
  type: ActionType;
  title: string;
  description?: string;
  priority?: Priority;
  estimated_minutes?: number;
  due_at?: string;
  lead_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<DailyAction> {
  return apiRequest<DailyAction>('/daily-flow/actions', {
    method: 'POST',
    body: JSON.stringify(action),
  });
}

/**
 * Markiert Aktion als abgeschlossen.
 */
export async function completeAction(
  actionId: string,
  data?: {
    notes?: string;
    outcome?: string;
  }
): Promise<ActionCompletion> {
  return apiRequest<ActionCompletion>(`/daily-flow/actions/${actionId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

/**
 * Überspringt eine Aktion.
 */
export async function skipAction(
  actionId: string,
  reason?: string
): Promise<{ success: boolean }> {
  return apiRequest(`/daily-flow/actions/${actionId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Verschiebt eine Aktion (Snooze).
 */
export async function snoozeAction(
  actionId: string,
  snoozeMinutes: number
): Promise<DailyAction> {
  return apiRequest<DailyAction>(`/daily-flow/actions/${actionId}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ snooze_minutes: snoozeMinutes }),
  });
}

// =============================================================================
// SETTINGS
// =============================================================================

/**
 * Holt Daily Flow Settings.
 */
export async function getSettings(): Promise<DailyFlowSettings> {
  return apiRequest<DailyFlowSettings>('/daily-flow/settings');
}

/**
 * Updated Daily Flow Settings.
 */
export async function updateSettings(
  settings: Partial<DailyFlowSettings>
): Promise<DailyFlowSettings> {
  return apiRequest<DailyFlowSettings>('/daily-flow/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// =============================================================================
// GENERATION
// =============================================================================

/**
 * Generiert Aktionen für heute.
 */
export async function generateActions(options?: {
  force?: boolean;
}): Promise<{
  generated: number;
  actions: DailyAction[];
}> {
  const params = options?.force ? '?force=true' : '';
  return apiRequest(`/daily-flow/generate${params}`, {
    method: 'POST',
  });
}

// =============================================================================
// HISTORY
// =============================================================================

/**
 * Holt Verlauf.
 */
export async function getHistory(options: {
  days?: number;
  type?: ActionType;
} = {}): Promise<Array<{
  date: string;
  total: number;
  completed: number;
  completion_rate: number;
}>> {
  const params = new URLSearchParams();
  if (options.days) params.append('days', options.days.toString());
  if (options.type) params.append('type', options.type);
  
  const queryString = params.toString();
  return apiRequest(`/daily-flow/history${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const dailyFlowApi = {
  // Status
  getStatus,
  
  // Actions
  getActions,
  getNextAction,
  createAction,
  completeAction,
  skipAction,
  snoozeAction,
  
  // Settings
  getSettings,
  updateSettings,
  
  // Generation
  generateActions,
  
  // History
  getHistory,
};

export default dailyFlowApi;

