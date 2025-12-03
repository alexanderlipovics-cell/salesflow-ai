/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LIVE ASSIST TYPES                                                        ║
 * ║  TypeScript Types für Live Assist API                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// ENUMS
// =============================================================================

export type AssistIntent = 
  | 'product_info'
  | 'usp'
  | 'objection'
  | 'facts'
  | 'science'
  | 'pricing'
  | 'comparison'
  | 'story'
  | 'closing'
  | 'quick_answer'
  | 'unknown';

export type QueryType = 'voice' | 'text';

export type SessionOutcome = 
  | 'sale_made'
  | 'appointment_set'
  | 'follow_up_needed'
  | 'lost'
  | 'unknown';

export type ObjectionType = 
  | 'price'
  | 'time'
  | 'think_about_it'
  | 'not_interested'
  | 'competitor'
  | 'trust'
  | 'need'
  | 'authority'
  | 'already_have'
  | 'bad_experience';

export type FactType = 
  | 'number'
  | 'percentage'
  | 'comparison'
  | 'benefit'
  | 'differentiator'
  | 'social_proof';

// =============================================================================
// REQUEST TYPES
// =============================================================================

export interface StartSessionRequest {
  company_id?: string;
  vertical?: string;
  lead_id?: string;
  context_notes?: string;
}

export interface LiveQueryRequest {
  session_id: string;
  query_text: string;
  query_type?: QueryType;
  explicit_intent?: AssistIntent;
  product_id?: string;
}

export interface EndSessionRequest {
  session_id: string;
  outcome?: SessionOutcome;
  user_rating?: number;
  user_feedback?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface QuickFactItem {
  fact_key: string;
  fact_value: string;
  fact_short?: string;
  fact_type: string;
  is_key_fact: boolean;
  source?: string;
}

export interface StartSessionResponse {
  session_id: string;
  company_name?: string;
  key_facts: QuickFactItem[];
  available_products: ProductItem[];
  message: string;
}

export interface ProductItem {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  category?: string;
}

export interface LiveQueryResponse {
  response_text: string;
  response_short?: string;
  detected_intent: AssistIntent;
  confidence: number;
  source: string;
  source_id?: string;
  follow_up_question?: string;
  related_facts: Record<string, any>[];
  objection_type?: string;
  response_technique?: string;
  response_time_ms: number;
  audio_url?: string;
  // v3.3 Emotion Data
  contact_mood?: string;
  engagement_level?: number;
  decision_tendency?: string;
  tone_hint?: string;
}

export interface SessionStatsResponse {
  session_id: string;
  duration_seconds: number;
  queries_count: number;
  facts_served: number;
  objections_handled: number;
  most_asked_topics: string[];
  objections_encountered: string[];
}

// =============================================================================
// QUICK ACCESS TYPES
// =============================================================================

export interface ObjectionResponseItem {
  id: string;
  objection_type: string;
  objection_example?: string;
  response_short: string;
  response_full?: string;
  response_technique?: string;
  follow_up_question?: string;
  success_rate?: number;
}

export interface VerticalKnowledgeItem {
  id: string;
  vertical: string;
  knowledge_type: string;
  topic: string;
  question?: string;
  answer_short: string;
  answer_full?: string;
  keywords: string[];
}

// =============================================================================
// FEEDBACK TYPES
// =============================================================================

export interface QueryFeedbackRequest {
  was_helpful: boolean;
  corrected_intent?: string;
  corrected_objection_type?: string;
  feedback_text?: string;
}

// =============================================================================
// WEBSOCKET TYPES
// =============================================================================

export interface WebSocketMessage {
  query: string;
  type: 'voice' | 'text';
}

export interface WebSocketResponse {
  response: string;
  response_short?: string;
  intent: string;
  objection_type?: string;
  follow_up?: string;
  technique?: string;
  response_time_ms: number;
  error?: string;
}
