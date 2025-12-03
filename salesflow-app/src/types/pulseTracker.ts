/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  PULSE TRACKER TYPES v2.1                                                  ║
 * ║  TypeScript Types für Pulse Tracker & Behavioral Intelligence              ║
 * ║                                                                            ║
 * ║  NEU v2.1:                                                                ║
 * ║  - MessageIntent (intro, discovery, pitch, scheduling, closing, etc.)     ║
 * ║  - GhostType (soft, hard)                                                 ║
 * ║  - Dynamic Timing & Thresholds                                            ║
 * ║  - Intent-based Funnel Analytics                                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// ENUMS
// =============================================================================

export type MessageStatus = 
  | 'sent'
  | 'delivered'
  | 'seen'
  | 'replied'
  | 'ghosted'
  | 'invisible'
  | 'stale'
  | 'skipped';

// NEU v2.1: Message Intent
export type MessageIntent =
  | 'intro'        // Erste Kontaktaufnahme
  | 'discovery'    // Bedarfsermittlung, Fragen stellen
  | 'pitch'        // Produkt/Opportunity präsentieren
  | 'scheduling'   // Termin vereinbaren
  | 'closing'      // Abschluss-Versuch
  | 'follow_up'    // Nach-fassen
  | 'reactivation'; // Ghost reaktivieren

// NEU v2.1: Ghost Type
export type GhostType =
  | 'soft'   // Kürzlich gesehen, evtl. busy
  | 'hard';  // Lang gesehen, ignoriert aktiv

export type FollowUpStrategy = 
  | 'none'
  | 'ghost_buster'
  | 'cross_channel'
  | 'value_add'
  | 'story_reply'
  | 'voice_note'
  | 'direct_ask'
  | 'takeaway';

export type ContactMood = 
  | 'enthusiastic'
  | 'positive'
  | 'neutral'
  | 'cautious'
  | 'stressed'
  | 'skeptical'
  | 'annoyed'
  | 'unknown';

export type DecisionTendency = 
  | 'leaning_yes'
  | 'leaning_no'
  | 'undecided'
  | 'deferred'
  | 'committed'
  | 'rejected';

// =============================================================================
// OUTREACH TYPES
// =============================================================================

export interface CreateOutreachRequest {
  lead_id?: string;
  lead_name?: string;
  message_text: string;
  channel: string;
  message_type?: string;
  template_id?: string;
  template_variant?: string;
  initial_status?: MessageStatus;
  // NEU v2.1
  intent?: MessageIntent;
}

export interface UpdateStatusRequest {
  status: MessageStatus;
  seen_at?: string;
  replied_at?: string;
  status_source?: string;
}

export interface BulkStatusUpdateRequest {
  outreach_ids: string[];
  status: MessageStatus;
}

export interface BulkSkipRequest {
  outreach_ids: string[];
}

export interface OutreachResponse {
  id: string;
  user_id: string;
  lead_id?: string;
  message_text: string;
  message_type: string;
  channel: string;
  status: MessageStatus;
  status_updated_at?: string;
  sent_at: string;
  seen_at?: string;
  replied_at?: string;
  check_in_due_at?: string;
  check_in_completed: boolean;
  suggested_strategy?: FollowUpStrategy;
  suggested_follow_up_text?: string;
  response_time_hours?: number;
  created_at: string;
  // NEU v2.1
  intent?: MessageIntent;
  ghost_type?: GhostType;
  ghost_detected_at?: string;
  check_in_hours_used?: number;
}

// =============================================================================
// CHECK-IN TYPES
// =============================================================================

export interface StatusOption {
  status: MessageStatus;
  label: string;
  icon?: string;
}

export interface CheckInItem {
  outreach_id: string;
  lead_id?: string;
  lead_name?: string;
  message_text: string;
  channel: string;
  sent_at: string;
  hours_since_sent: number;
  priority: number;
  reminder_count: number;
  status_options: StatusOption[];
}

export interface CheckInSummary {
  total_pending: number;
  urgent: number;
  important: number;
  normal: number;
  estimated_time_minutes: number;
  xp_reward: number;
}

// =============================================================================
// BEHAVIORAL ANALYSIS TYPES
// =============================================================================

export interface BehaviorAnalysisResult {
  // Emotion & Mood
  current_mood: ContactMood;
  mood_confidence: number;
  sentiment_trajectory?: string;
  mood_indicators: string[];

  // Engagement
  engagement_level: number;
  avg_response_time_hours?: number;
  asks_questions: boolean;
  proactive_contact: boolean;
  uses_emojis: boolean;
  engagement_trajectory?: string;

  // Decision
  decision_tendency: DecisionTendency;
  commitment_strength: number;
  objections_raised: string[];
  buying_signals: string[];
  hesitation_signals: string[];

  // Trust
  trust_level: number;
  risk_flags: string[];
  risk_descriptions: Record<string, string>;

  // Coherence
  reliability_score: number;
  coherence_notes?: string;
  words_vs_behavior?: string;

  // Style
  communication_style?: string;
  preferred_channel?: string;
  formality?: string;

  // Recommendations
  recommended_approach: string;
  recommended_tone: string;
  recommended_message_length: string;
  recommended_timing?: string;
  recommended_next_action?: string;
  avoid: string[];
  do_this: string[];

  // Key Insights
  key_insights: string[];
}

export interface AnalyzeBehaviorRequest {
  lead_id: string;
  chat_text: string;
  context?: Record<string, any>;
}

export interface BehaviorProfileResponse {
  lead_id: string;
  lead_name?: string;
  analysis: BehaviorAnalysisResult;
  mood_history: Array<{
    date: string;
    mood: ContactMood;
    trigger?: string;
  }>;
  total_messages_sent: number;
  total_replies: number;
  response_rate: number;
  appointments_scheduled: number;
  appointments_kept: number;
  last_analyzed_at?: string;
}

// =============================================================================
// GHOST BUSTER TYPES
// =============================================================================

export interface GhostLeadResponse {
  outreach_id: string;
  lead_id?: string;
  lead_name?: string;
  last_message_text: string;
  channel: string;
  seen_at?: string;
  hours_ghosted: number;
  behavior_mood: ContactMood;
  behavior_decision: DecisionTendency;
  suggested_strategy?: FollowUpStrategy;
  suggested_templates: GhostBusterTemplate[];
}

export interface GhostBusterSuggestion {
  strategy: FollowUpStrategy;
  template_id?: string;
  template_text: string;
  reasoning: string;
  confidence: number;
  cross_channel_action?: string;
}

export interface GhostBusterTemplate {
  id: string;
  name: string;
  template_text: string;
  template_text_short?: string;
  strategy: FollowUpStrategy;
  tone?: string;
  works_for_mood: ContactMood[];
  works_for_decision: DecisionTendency[];
  days_since_ghost?: number;
  example_context?: string;
  success_rate?: number;
  _score?: number;
}

export interface SendGhostBusterRequest {
  template_text: string;
  strategy?: FollowUpStrategy;
  custom_context?: string;
}

// =============================================================================
// CONVERSION FUNNEL TYPES
// =============================================================================

export interface AccurateFunnelResponse {
  date: string;
  
  // Confirmed
  confirmed_sent: number;
  confirmed_seen: number;
  confirmed_replied: number;
  confirmed_ghosted: number;
  confirmed_invisible: number;
  
  // Unconfirmed
  unconfirmed_count: number;
  stale_count: number;
  skipped_count: number;
  
  // Rates
  confirmed_open_rate: number;
  confirmed_reply_rate: number;
  confirmed_ghost_rate: number;
  
  // Data Quality
  check_in_completion_rate: number;
  data_quality_score: number;
}

export interface FunnelInsightsResponse {
  overall_health: 'good' | 'warning' | 'critical' | 'unknown';
  health_score: number;
  top_issue?: string;
  top_opportunity?: string;
  metrics: {
    open_rate: number;
    reply_rate: number;
    ghost_rate: number;
  };
  recommendations: Array<{
    type: string;
    message: string;
  }>;
  vs_last_week: Record<string, number>;
  vs_average: Record<string, number>;
}

export interface FunnelHistoryItem {
  date: string;
  messages_sent: number;
  messages_seen: number;
  messages_replied: number;
  messages_ghosted: number;
  ghosts_reactivated: number;
  open_rate: number;
  reply_rate: number;
  ghost_rate: number;
  ghost_buster_rate: number;
}

// =============================================================================
// INTENT CORRECTION TYPES
// =============================================================================

export interface IntentCorrectionRequest {
  query_text: string;
  detected_intent: string;
  corrected_intent: string;
  detected_objection?: string;
  corrected_objection?: string;
  reason?: string;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface CheckinComplianceItem {
  date: string;
  total_sent: number;
  checked_in: number;
  skipped: number;
  stale: number;
  completion_rate: number;
}

export interface GhostBusterEffectivenessItem {
  strategy: string;
  times_used: number;
  successful: number;
  success_rate: number;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface PulseTrackerState {
  pendingCheckins: CheckInItem[];
  checkinSummary: CheckInSummary | null;
  ghostLeads: GhostLeadResponse[];
  funnel: AccurateFunnelResponse | null;
  funnelInsights: FunnelInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
}

// Status Label Mapping
export const STATUS_LABELS: Record<MessageStatus, string> = {
  sent: '📤 Gesendet',
  delivered: '✓ Zugestellt',
  seen: '👁️ Gelesen',
  replied: '✅ Antwort',
  ghosted: '👻 Ghost',
  invisible: '🔕 Unsichtbar',
  stale: '⏰ Veraltet',
  skipped: '⏭️ Übersprungen',
};

// Strategy Label Mapping
export const STRATEGY_LABELS: Record<FollowUpStrategy, string> = {
  none: 'Keine',
  ghost_buster: '👻 Ghost-Buster',
  cross_channel: '🔀 Cross-Channel',
  value_add: '💎 Mehrwert',
  story_reply: '📸 Story-Reaktion',
  voice_note: '🎤 Sprachnachricht',
  direct_ask: '❓ Direkte Frage',
  takeaway: '🚪 Takeaway',
};

// Mood Emoji Mapping
export const MOOD_EMOJIS: Record<ContactMood, string> = {
  enthusiastic: '🤩',
  positive: '😊',
  neutral: '😐',
  cautious: '🤔',
  stressed: '😰',
  skeptical: '🧐',
  annoyed: '😤',
  unknown: '❓',
};

// Decision Emoji Mapping
export const DECISION_EMOJIS: Record<DecisionTendency, string> = {
  leaning_yes: '👍',
  leaning_no: '👎',
  undecided: '🤷',
  deferred: '⏳',
  committed: '✅',
  rejected: '❌',
};

// =============================================================================
// NEU v2.1: INTENT TYPES
// =============================================================================

export const INTENT_LABELS: Record<MessageIntent, string> = {
  intro: '👋 Intro',
  discovery: '🔍 Discovery',
  pitch: '🎯 Pitch',
  scheduling: '📅 Termin',
  closing: '🤝 Closing',
  follow_up: '🔄 Follow-up',
  reactivation: '👻 Reaktivierung',
};

export const INTENT_COLORS: Record<MessageIntent, string> = {
  intro: '#60A5FA',      // Blue
  discovery: '#A78BFA',  // Purple
  pitch: '#F59E0B',      // Orange
  scheduling: '#10B981', // Green
  closing: '#EF4444',    // Red
  follow_up: '#6B7280',  // Gray
  reactivation: '#8B5CF6', // Violet
};

// =============================================================================
// NEU v2.1: GHOST TYPE TYPES
// =============================================================================

export const GHOST_TYPE_LABELS: Record<GhostType, string> = {
  soft: '🟡 Soft Ghost',
  hard: '🔴 Hard Ghost',
};

export const GHOST_TYPE_HINTS: Record<GhostType, string> = {
  soft: 'Sanfter Check-in, kein Druck. Lead war evtl. nur busy.',
  hard: 'Pattern Interrupt oder Takeaway nötig. Lead ignoriert aktiv.',
};

// =============================================================================
// NEU v2.1: INTENT FUNNEL TYPES
// =============================================================================

export interface IntentFunnelItem {
  intent: MessageIntent;
  sent_count: number;
  seen_count: number;
  replied_count: number;
  ghosted_count: number;
  reply_rate: number;
  ghost_rate: number;
  performance_level?: 'strong' | 'average' | 'weak';
}

export interface IntentFunnelResponse {
  start_date: string;
  end_date: string;
  intents: IntentFunnelItem[];
  total_sent: number;
  overall_reply_rate: number;
  best_intent?: MessageIntent;
  worst_intent?: MessageIntent;
}

export interface IntentCoachingInsight {
  intent: MessageIntent;
  sent_count: number;
  reply_rate: number;
  performance_level: 'strong' | 'average' | 'weak';
  coaching_tip: string;
}

// =============================================================================
// NEU v2.1: DYNAMIC TIMING TYPES
// =============================================================================

export interface DynamicTimingInfo {
  lead_id: string;
  avg_response_time_hours?: number;
  engagement_level: number;
  predicted_check_in_hours: number;
  predicted_ghost_threshold_hours: number;
  response_time_trend?: 'faster' | 'stable' | 'slower';
}

// =============================================================================
// NEU v2.1: SMART INFERENCE TYPES
// =============================================================================

export interface SmartInferenceRequest {
  lead_id: string;
  latest_sender: 'lead' | 'user';
  has_unread_from_lead?: boolean;
}

export interface SmartInferenceResult {
  outreach_id: string;
  old_status: MessageStatus;
  new_status: MessageStatus;
  inference_reason: string;
  was_auto_inferred: boolean;
}

// =============================================================================
// NEU v2.1: GHOST CLASSIFICATION TYPES
// =============================================================================

export interface GhostClassificationRequest {
  outreach_id: string;
  lead_was_online_since?: boolean;
  lead_posted_since?: boolean;
}

export interface GhostClassificationResponse {
  outreach_id: string;
  ghost_type: GhostType;
  hours_since_seen: number;
  recommended_strategy: FollowUpStrategy;
  strategy_reasoning: string;
  suggested_templates: GhostBusterTemplate[];
}

export interface GhostStatsByType {
  soft_ghosts: number;
  hard_ghosts: number;
  soft_reactivation_rate: number;
  hard_reactivation_rate: number;
}

// =============================================================================
// NEU v2.1: A/B TESTING BY PROFILE TYPES
// =============================================================================

export interface BestTemplateRecommendation {
  lead_id: string;
  lead_mood: ContactMood;
  recommended_variant: string;
  expected_reply_rate: number;
  reasoning: string;
}

