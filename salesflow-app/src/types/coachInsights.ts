/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COACH INSIGHTS TYPES                                                      ║
 * ║  TypeScript Types für Coach Analytics & Overlay                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

export type CoachTipPriority = 'high' | 'medium' | 'low';
export type CoachTipActionType = 'info' | 'script_change' | 'follow_up' | 'training';
export type ContactMood = 'positiv' | 'neutral' | 'gestresst' | 'skeptisch' | 'vorsichtig';
export type DecisionTendency = 'close_to_yes' | 'close_to_no' | 'on_hold' | 'neutral';
export type ToneHint = 'neutral' | 'direct' | 'reassuring' | 'value_focused' | 'evidence_based';

// =============================================================================
// COACH TIP
// =============================================================================

export interface CoachTip {
  id: string;
  title: string;
  description: string;
  priority: CoachTipPriority;
  action_type: CoachTipActionType;
}

// =============================================================================
// MOOD & DECISION DISTRIBUTION
// =============================================================================

export interface MoodDistribution {
  mood: ContactMood;
  count: number;
  percentage?: number;
}

export interface DecisionDistribution {
  tendency: DecisionTendency;
  count: number;
  percentage?: number;
}

// =============================================================================
// COACH INSIGHTS RESPONSE
// =============================================================================

export interface CoachInsightsResponse {
  user_id: string;
  company_id: string;
  vertical: string | null;
  days: number;
  sessions_analyzed: number;
  moods: MoodDistribution[];
  decisions: DecisionDistribution[];
  tips: CoachTip[];
}

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

export interface PerformanceMetrics {
  total_sessions: number;
  total_queries: number;
  avg_session_duration: number;
  avg_response_time_ms: number;
  queries_per_session: number;
  outcomes: Record<string, number>;
  cache_hit_rate?: number;
}

// =============================================================================
// OBJECTION ANALYTICS
// =============================================================================

export interface ObjectionAnalytics {
  objection_type: string;
  count: number;
  helpful_rate: number;
}

// Alias for API compatibility
export type ObjectionAnalyticsItem = ObjectionAnalytics;

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface CoachOverlayProps {
  userId: string;
  companyId: string;
  companyName?: string;
  vertical?: string;
  days?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialMinimized?: boolean;
  onApplyTip?: (tip: CoachTip) => void;
  onDismissTip?: (tipId: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PRIORITY_COLORS: Record<CoachTipPriority, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

export const PRIORITY_BG_COLORS: Record<CoachTipPriority, string> = {
  high: 'rgba(239, 68, 68, 0.15)',
  medium: 'rgba(245, 158, 11, 0.15)',
  low: 'rgba(34, 197, 94, 0.15)',
};

export const ACTION_TYPE_ICONS: Record<CoachTipActionType, string> = {
  info: 'information-circle',
  script_change: 'create',
  follow_up: 'arrow-forward',
  training: 'school',
};

export const MOOD_LABELS: Record<ContactMood, string> = {
  positiv: 'Positiv',
  neutral: 'Neutral',
  gestresst: 'Gestresst',
  skeptisch: 'Skeptisch',
  vorsichtig: 'Vorsichtig',
};

export const DECISION_LABELS: Record<DecisionTendency, string> = {
  close_to_yes: 'Kurz vor Ja',
  close_to_no: 'Kurz vor Nein',
  on_hold: 'Überlegt noch',
  neutral: 'Neutral',
};

export const TONE_LABELS: Record<ToneHint, string> = {
  neutral: 'Neutral',
  direct: 'Direkt',
  reassuring: 'Beruhigend',
  value_focused: 'Wert-fokussiert',
  evidence_based: 'Evidenz-basiert',
};
