/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ANALYTICS API                                                             ║
 * ║  API Functions für Template & Channel Analytics                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export interface AnalyticsDashboard {
  period: string;
  total_sent: number;
  total_replied: number;
  total_deals: number;
  reply_rate: number;
  win_rate: number;
  top_templates: TemplatePerformance[];
  channel_breakdown: ChannelStats[];
  category_breakdown: CategoryStats[];
}

export interface TemplatePerformance {
  template_id: string;
  name: string;
  category: string;
  times_used: number;
  reply_rate: number;
  conversion_rate: number;
  quality_score: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ChannelStats {
  channel: string;
  sent: number;
  replied: number;
  deals: number;
  reply_rate: number;
  win_rate: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  avg_reply_rate: number;
}

export interface TimeSeriesData {
  date: string;
  sent: number;
  replied: number;
  deals: number;
  reply_rate: number;
}

export interface PerformanceSummary {
  totals: {
    sent: number;
    replied: number;
    deals: number;
  };
  rates: {
    reply_rate: number;
    win_rate: number;
  };
  changes: {
    sent_change: number;
    reply_rate_change: number;
    win_rate_change: number;
  };
  best_channel: string | null;
  best_template: string | null;
}

export interface PulseFunnelByIntent {
  intents: Array<{
    intent: string;
    sent_count: number;
    seen_count: number;
    replied_count: number;
    ghosted_count: number;
    reply_rate: number;
    ghost_rate: number;
  }>;
  total_sent: number;
  overall_reply_rate: number;
  best_intent: string | null;
  worst_intent: string | null;
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
// DASHBOARD
// =============================================================================

/**
 * Lädt das Analytics Dashboard mit allen KPIs.
 */
export async function getDashboard(options: {
  period?: 'last_7d' | 'last_30d' | 'this_month';
  userId?: string;
} = {}): Promise<AnalyticsDashboard> {
  const params = new URLSearchParams();
  if (options.period) params.append('period', options.period);
  if (options.userId) params.append('user_id', options.userId);
  
  const queryString = params.toString();
  return apiRequest<AnalyticsDashboard>(`/analytics/dashboard${queryString ? `?${queryString}` : ''}`);
}

/**
 * Lädt Dashboard-Metriken für schnelle Darstellung.
 */
export async function getDashboardMetrics(days: number = 30): Promise<{
  kpis: Record<string, number>;
  trends: Record<string, number>;
  highlights: string[];
}> {
  return apiRequest(`/analytics/dashboard-metrics?days=${days}`);
}

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * Lädt die Top-performenden Templates.
 */
export async function getTopTemplates(options: {
  category?: string;
  limit?: number;
  days?: number;
} = {}): Promise<{
  templates: TemplatePerformance[];
  period_days: number;
}> {
  const params = new URLSearchParams();
  if (options.category) params.append('category', options.category);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.days) params.append('days', options.days.toString());
  
  const queryString = params.toString();
  return apiRequest(`/analytics/templates${queryString ? `?${queryString}` : ''}`);
}

/**
 * Lädt Performance-Daten für ein einzelnes Template.
 */
export async function getTemplatePerformance(templateId: string): Promise<TemplatePerformance> {
  return apiRequest<TemplatePerformance>(`/analytics/templates/${templateId}`);
}

// =============================================================================
// CHANNELS
// =============================================================================

/**
 * Lädt Channel-Analytics.
 */
export async function getChannelAnalytics(options: {
  fromDate?: string;
  toDate?: string;
  verticalId?: string;
} = {}): Promise<ChannelStats[]> {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('from_date', options.fromDate);
  if (options.toDate) params.append('to_date', options.toDate);
  if (options.verticalId) params.append('vertical_id', options.verticalId);
  
  const queryString = params.toString();
  return apiRequest<ChannelStats[]>(`/analytics/channels${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// TIME SERIES
// =============================================================================

/**
 * Lädt Zeitreihen-Daten für Trend-Analysen.
 */
export async function getTimeSeries(options: {
  fromDate?: string;
  toDate?: string;
  granularity?: 'day' | 'week' | 'month';
  verticalId?: string;
  channel?: string;
  templateId?: string;
} = {}): Promise<TimeSeriesData[]> {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('from_date', options.fromDate);
  if (options.toDate) params.append('to_date', options.toDate);
  if (options.granularity) params.append('granularity', options.granularity);
  if (options.verticalId) params.append('vertical_id', options.verticalId);
  if (options.channel) params.append('channel', options.channel);
  if (options.templateId) params.append('template_id', options.templateId);
  
  const queryString = params.toString();
  return apiRequest<TimeSeriesData[]>(`/analytics/timeseries${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// SUMMARY
// =============================================================================

/**
 * Lädt Performance-Zusammenfassung mit Periodenvergleich.
 */
export async function getPerformanceSummary(options: {
  fromDate?: string;
  toDate?: string;
  comparePrevious?: boolean;
} = {}): Promise<PerformanceSummary> {
  const params = new URLSearchParams();
  if (options.fromDate) params.append('from_date', options.fromDate);
  if (options.toDate) params.append('to_date', options.toDate);
  if (options.comparePrevious !== undefined) {
    params.append('compare_previous', options.comparePrevious.toString());
  }
  
  const queryString = params.toString();
  return apiRequest<PerformanceSummary>(`/analytics/summary${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// LEARNING EVENTS
// =============================================================================

/**
 * Trackt ein Learning Event.
 */
export async function trackEvent(event: {
  event_type: string;
  template_id?: string;
  lead_id?: string;
  channel?: string;
  response_received?: boolean;
  response_time_hours?: number;
  outcome?: string;
  outcome_value?: number;
}): Promise<{ id: string; created_at: string }> {
  return apiRequest('/analytics/events', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

/**
 * Quick: Template verwendet.
 */
export async function trackTemplateUsed(
  templateId: string,
  leadId?: string,
  channel?: string
): Promise<{ id: string }> {
  const params = new URLSearchParams();
  params.append('template_id', templateId);
  if (leadId) params.append('lead_id', leadId);
  if (channel) params.append('channel', channel);
  
  return apiRequest(`/analytics/track/template-used?${params.toString()}`, {
    method: 'POST',
  });
}

/**
 * Quick: Antwort erhalten.
 */
export async function trackResponse(
  templateId: string,
  leadId?: string,
  responseTimeHours?: number
): Promise<{ id: string }> {
  const params = new URLSearchParams();
  params.append('template_id', templateId);
  if (leadId) params.append('lead_id', leadId);
  if (responseTimeHours) params.append('response_time_hours', responseTimeHours.toString());
  
  return apiRequest(`/analytics/track/response?${params.toString()}`, {
    method: 'POST',
  });
}

/**
 * Quick: Outcome tracken.
 */
export async function trackOutcome(
  templateId: string,
  outcome: 'appointment_booked' | 'deal_closed' | 'info_sent' | 'rejected',
  leadId?: string,
  outcomeValue?: number
): Promise<{ id: string }> {
  const params = new URLSearchParams();
  params.append('template_id', templateId);
  params.append('outcome', outcome);
  if (leadId) params.append('lead_id', leadId);
  if (outcomeValue) params.append('outcome_value', outcomeValue.toString());
  
  return apiRequest(`/analytics/track/outcome?${params.toString()}`, {
    method: 'POST',
  });
}

// =============================================================================
// PULSE ANALYTICS
// =============================================================================

/**
 * Check-in Compliance über Zeit.
 */
export async function getPulseCompliance(days: number = 30): Promise<Array<{
  date: string;
  total_sent: number;
  checked_in: number;
  skipped: number;
  stale: number;
  completion_rate: number;
}>> {
  return apiRequest(`/analytics/pulse/compliance?days=${days}`);
}

/**
 * Ghost-Buster Effektivität nach Strategie.
 */
export async function getGhostBusterEffectiveness(days: number = 30): Promise<Array<{
  strategy: string;
  times_used: number;
  successful: number;
  success_rate: number;
}>> {
  return apiRequest(`/analytics/pulse/ghost-buster-effectiveness?days=${days}`);
}

/**
 * Intent Distribution.
 */
export async function getIntentDistribution(days: number = 30): Promise<Array<{
  intent: string;
  count: number;
  percentage: number;
}>> {
  return apiRequest(`/analytics/pulse/intent-distribution?days=${days}`);
}

/**
 * Objection Heatmap.
 */
export async function getObjectionHeatmap(days: number = 30): Promise<Array<{
  objection_type: string;
  count: number;
  helpful_count: number;
  helpful_rate: number;
}>> {
  return apiRequest(`/analytics/pulse/objection-heatmap?days=${days}`);
}

/**
 * Funnel by Message Intent.
 */
export async function getFunnelByIntent(days: number = 30): Promise<PulseFunnelByIntent> {
  return apiRequest(`/analytics/pulse/funnel-by-intent?days=${days}`);
}

/**
 * Ghost Stats by Type.
 */
export async function getGhostStatsByType(days: number = 30): Promise<{
  soft_ghosts: number;
  hard_ghosts: number;
  soft_reactivation_rate: number;
  hard_reactivation_rate: number;
  soft_reactivated: number;
  hard_reactivated: number;
}> {
  return apiRequest(`/analytics/pulse/ghost-stats-by-type?days=${days}`);
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const analyticsApi = {
  // Dashboard
  getDashboard,
  getDashboardMetrics,
  
  // Templates
  getTopTemplates,
  getTemplatePerformance,
  
  // Channels
  getChannelAnalytics,
  
  // Time Series
  getTimeSeries,
  
  // Summary
  getPerformanceSummary,
  
  // Event Tracking
  trackEvent,
  trackTemplateUsed,
  trackResponse,
  trackOutcome,
  
  // Pulse Analytics
  getPulseCompliance,
  getGhostBusterEffectiveness,
  getIntentDistribution,
  getObjectionHeatmap,
  getFunnelByIntent,
  getGhostStatsByType,
};

export default analyticsApi;

