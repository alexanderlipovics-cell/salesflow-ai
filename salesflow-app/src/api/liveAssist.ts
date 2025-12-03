/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LIVE ASSIST API                                                           ║
 * ║  API Functions für Echtzeit-Verkaufsassistenz                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

// Get base URL from config
const API_BASE_URL = API_CONFIG.baseUrl;
import type {
  StartSessionRequest,
  StartSessionResponse,
  LiveQueryRequest,
  LiveQueryResponse,
  EndSessionRequest,
  SessionStatsResponse,
  QuickFactItem,
  ObjectionResponseItem,
  VerticalKnowledgeItem,
  ObjectionType,
  FactType,
} from '../types/liveAssist';
import type {
  CoachInsightsResponse,
  PerformanceMetrics,
  ObjectionAnalyticsItem,
} from '../types/coachInsights';

// =============================================================================
// HELPER
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      // Ohne Token nur Content-Type Header
      return {
        'Content-Type': 'application/json',
      };
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  } catch {
    return {
      'Content-Type': 'application/json',
    };
  }
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
// SESSION MANAGEMENT
// =============================================================================

/**
 * Startet eine Live Assist Session.
 * Trigger: User sagt "Bin mit Kunde" oder aktiviert manuell.
 */
export async function startSession(
  request: StartSessionRequest,
): Promise<StartSessionResponse> {
  return apiRequest<StartSessionResponse>('/live-assist/start', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Beendet eine Live Assist Session.
 */
export async function endSession(
  request: EndSessionRequest,
): Promise<{ success: boolean; message: string }> {
  return apiRequest('/live-assist/end', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Holt Session-Statistiken.
 */
export async function getSessionStats(
  sessionId: string,
): Promise<SessionStatsResponse> {
  return apiRequest<SessionStatsResponse>(`/live-assist/session/${sessionId}`);
}

// =============================================================================
// QUERY PROCESSING
// =============================================================================

/**
 * Sendet eine Live-Anfrage.
 * Schnelle Antwort - optimiert für Echtzeit.
 */
export async function sendQuery(
  request: LiveQueryRequest,
): Promise<LiveQueryResponse> {
  return apiRequest<LiveQueryResponse>('/live-assist/query', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// =============================================================================
// QUICK ACCESS (ohne Session)
// =============================================================================

/**
 * Holt Quick Facts für eine Firma.
 */
export async function getQuickFacts(options: {
  companyId?: string;
  vertical?: string;
  factType?: FactType;
  keyOnly?: boolean;
  limit?: number;
}): Promise<QuickFactItem[]> {
  const params = new URLSearchParams();
  
  if (options.factType) params.append('fact_type', options.factType);
  if (options.keyOnly) params.append('key_only', 'true');
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.vertical) params.append('vertical', options.vertical);
  
  const queryString = params.toString();
  const endpoint = options.companyId 
    ? `/live-assist/facts/${options.companyId}${queryString ? `?${queryString}` : ''}`
    : `/live-assist/facts${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<QuickFactItem[]>(endpoint);
}

/**
 * Holt Einwand-Antworten.
 */
export async function getObjectionResponses(options: {
  companyId?: string;
  objectionType?: ObjectionType;
}): Promise<ObjectionResponseItem[]> {
  const params = new URLSearchParams();
  
  if (options.objectionType) params.append('objection_type', options.objectionType);
  
  const queryString = params.toString();
  const endpoint = options.companyId
    ? `/live-assist/objections/${options.companyId}${queryString ? `?${queryString}` : ''}`
    : `/live-assist/objections${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<ObjectionResponseItem[]>(endpoint);
}

/**
 * Holt Branchenwissen.
 */
export async function getVerticalKnowledge(options: {
  vertical: string;
  knowledgeType?: string;
  query?: string;
  limit?: number;
}): Promise<VerticalKnowledgeItem[]> {
  const params = new URLSearchParams();
  
  if (options.knowledgeType) params.append('knowledge_type', options.knowledgeType);
  if (options.query) params.append('query', options.query);
  if (options.limit) params.append('limit', options.limit.toString());
  
  const queryString = params.toString();
  const endpoint = `/live-assist/knowledge/${options.vertical}${queryString ? `?${queryString}` : ''}`;
  
  return apiRequest<VerticalKnowledgeItem[]>(endpoint);
}

// =============================================================================
// FEEDBACK
// =============================================================================

/**
 * Gibt Feedback zu einer Query-Antwort.
 */
export async function submitQueryFeedback(
  queryId: string,
  wasHelpful: boolean,
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/live-assist/query/${queryId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ was_helpful: wasHelpful }),
  });
}

/**
 * Loggt dass eine Einwand-Antwort verwendet wurde.
 */
export async function logObjectionResponseUsed(
  responseId: string,
  wasSuccessful?: boolean,
): Promise<{ success: boolean; times_used: number; success_rate: number }> {
  const params = wasSuccessful !== undefined 
    ? `?was_successful=${wasSuccessful}` 
    : '';
  
  return apiRequest(`/live-assist/objection/${responseId}/used${params}`, {
    method: 'POST',
  });
}

// =============================================================================
// COACH ANALYTICS
// =============================================================================

/**
 * Holt personalisierte Coach-Insights.
 * Analysiert Mood und Decision Patterns über einen Zeitraum.
 */
export async function getCoachInsights(
  companyId: string,
  days: number = 30,
): Promise<CoachInsightsResponse> {
  const params = new URLSearchParams();
  params.append('days', days.toString());
  
  return apiRequest<CoachInsightsResponse>(
    `/live-assist/coach/insights?company_id=${companyId}&${params.toString()}`
  );
}

/**
 * Holt Performance-Metriken (Sessions, Response Times, Outcomes).
 */
export async function getPerformanceMetrics(
  companyId: string,
  days: number = 30,
): Promise<PerformanceMetrics> {
  return apiRequest<PerformanceMetrics>(
    `/live-assist/coach/performance?company_id=${companyId}&days=${days}`
  );
}

/**
 * Holt Einwand-Analytics (welche Einwände, wie erfolgreich).
 */
export async function getObjectionAnalytics(
  companyId: string,
  days: number = 30,
): Promise<ObjectionAnalyticsItem[]> {
  return apiRequest<ObjectionAnalyticsItem[]>(
    `/live-assist/coach/objection-analytics?company_id=${companyId}&days=${days}`
  );
}

// =============================================================================
// WEBSOCKET
// =============================================================================

/**
 * Erstellt eine WebSocket-Verbindung für Echtzeit-Assistenz.
 */
export function createLiveAssistWebSocket(
  sessionId: string,
  onMessage: (data: {
    response: string;
    response_short?: string;
    intent: string;
    objection_type?: string;
    follow_up?: string;
    technique?: string;
    response_time_ms: number;
    error?: string;
  }) => void,
  onError?: (error: Event) => void,
  onClose?: () => void,
): WebSocket {
  const wsUrl = API_BASE_URL.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/live-assist/ws/${sessionId}`);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  };
  
  ws.onerror = (event) => {
    console.error('WebSocket error:', event);
    onError?.(event);
  };
  
  ws.onclose = () => {
    onClose?.();
  };
  
  return ws;
}

/**
 * Sendet eine Nachricht über WebSocket.
 */
export function sendWebSocketQuery(
  ws: WebSocket,
  query: string,
  type: 'text' | 'voice' = 'text',
): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ query, type }));
  } else {
    console.error('WebSocket not open');
  }
}

// =============================================================================
// NAMED EXPORT OBJECT
// =============================================================================

export const liveAssistApi = {
  // Session
  startSession,
  endSession,
  getSessionStats,
  
  // Query
  sendQuery,
  
  // Quick Access
  getQuickFacts,
  getObjectionResponses,
  getVerticalKnowledge,
  
  // Feedback
  submitQueryFeedback,
  logObjectionResponseUsed,
  
  // Coach Analytics
  getCoachInsights,
  getPerformanceMetrics,
  getObjectionAnalytics,
  
  // WebSocket
  createLiveAssistWebSocket,
  sendWebSocketQuery,
};

