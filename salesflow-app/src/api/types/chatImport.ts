/**
 * Types für Chat Import & Conversation Intelligence System
 */

// =============================================================================
// ENUMS
// =============================================================================

export type Channel =
  | "whatsapp"
  | "instagram_dm"
  | "facebook_messenger"
  | "email"
  | "sms"
  | "linkedin"
  | "telegram"
  | "other";

export type ChatChannel =
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "telegram"
  | "linkedin"
  | "other";

export type LeadStatus =
  | "cold"
  | "warm"
  | "hot"
  | "customer"
  | "lost"
  | "unknown";

export type DealState =
  | "none"
  | "considering"
  | "pending_payment"
  | "paid"
  | "on_hold"
  | "lost";

export type ActionType =
  | "no_action"
  | "follow_up_message"
  | "call"
  | "check_payment"
  | "reactivation_follow_up"
  | "send_info"
  | "schedule_meeting"
  | "wait_for_lead"
  | "custom";

export type ObjectionType =
  | "price"
  | "time"
  | "think_about_it"
  | "not_interested"
  | "competitor"
  | "trust"
  | "need"
  | "authority"
  | "other";

export type MessageIntent =
  | "greeting"
  | "question"
  | "answer"
  | "objection"
  | "interest"
  | "commitment"
  | "rejection"
  | "closing"
  | "small_talk";

// =============================================================================
// REQUEST TYPES
// =============================================================================

export interface ChatImportRequest {
  raw_text: string;
  channel?: Channel;
  vertical_id?: string;
  company_id?: string;
  existing_lead_id?: string;
  language?: string;
  extract_templates?: boolean;
  extract_objections?: boolean;
  create_contact_plan?: boolean;
  save_as_learning_case?: boolean;
  learning_case_goal?: string;
  learning_case_outcome?: string;
}

export interface SaveImportRequest {
  import_result: ChatImportResult;
  raw_text: string;
  lead_name_override?: string;
  lead_status_override?: LeadStatus;
  deal_state_override?: DealState;
  create_lead?: boolean;
  create_contact_plan?: boolean;
  save_templates?: boolean;
  save_objections?: boolean;
  save_as_learning_case?: boolean;
  learning_case_goal?: string;
  learning_case_outcome?: string;
  learning_case_notes?: string;
}

// =============================================================================
// ANALYSIS RESULT TYPES
// =============================================================================

export interface ParsedMessage {
  sender_type: "user" | "lead" | "unknown";
  sender_name?: string;
  content: string;
  sent_at?: string;
  sequence_number: number;
  intent?: MessageIntent;
  objection_type?: ObjectionType;
  sentiment?: "positive" | "neutral" | "negative";
  is_template_candidate: boolean;
  template_use_case?: string;
}

export interface LeadCandidate {
  name?: string;
  handle_or_profile?: string;
  phone?: string;
  email?: string;
  channel?: Channel;
  location?: string;
  company?: string;
  notes?: string;
}

export interface NextAction {
  action_type: ActionType;
  action_description?: string;
  suggested_date?: string;
  suggested_time?: string;
  suggested_channel?: Channel;
  suggested_message?: string;
  priority: number;
  is_urgent: boolean;
  reasoning?: string;
}

export interface ExtractedTemplate {
  content: string;
  use_case: string;
  context_description?: string;
  works_for_lead_status: LeadStatus[];
  works_for_deal_state: DealState[];
  effectiveness_indicators: string[];
}

export interface DetectedObjection {
  objection_type: ObjectionType;
  objection_text: string;
  objection_context?: string;
  response_text?: string;
  response_technique?: string;
  response_worked?: boolean;
}

export interface SellerStyle {
  tone: "formal" | "friendly_casual" | "very_casual" | "professional";
  pressure_level: "none" | "low" | "medium" | "high";
  emoji_usage: "none" | "minimal" | "moderate" | "heavy";
  message_length: "very_short" | "short" | "medium" | "long";
  closing_style: "soft_ask" | "direct_ask" | "assumptive" | "alternative_choice";
  personalization_level: "low" | "medium" | "high";
}

export interface ConversationSummary {
  summary: string;
  key_topics: string[];
  customer_sentiment: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
  sales_stage: "awareness" | "interest" | "consideration" | "decision" | "closed_won" | "closed_lost" | "unknown";
  main_blocker?: string;
}

export interface ChatImportResult {
  messages: ParsedMessage[];
  message_count: number;
  lead_candidate: LeadCandidate;
  lead_status: LeadStatus;
  deal_state: DealState;
  conversation_summary: ConversationSummary;
  last_contact_summary: string;
  next_action: NextAction;
  extracted_templates: ExtractedTemplate[];
  detected_objections: DetectedObjection[];
  seller_style: SellerStyle;
  detected_channel?: Channel;
  detected_language: string;
  first_message_at?: string;
  last_message_at?: string;
  confidence_score: number;
  uncertainty_notes: string[];
  quality_score?: number;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface SaveImportResponse {
  success: boolean;
  lead_id?: string;
  conversation_id?: string;
  contact_plan_id?: string;
  learning_case_id?: string;
  templates_saved: number;
  objections_saved: number;
  messages_saved: number;
  xp_earned: number;
  message: string;
}

// =============================================================================
// CONTACT PLAN TYPES
// =============================================================================

export interface ContactPlan {
  id: string;
  lead_id: string;
  lead_name?: string;
  action_type: ActionType;
  action_description?: string;
  planned_at: string;
  planned_time?: string;
  suggested_message?: string;
  suggested_channel?: string;
  priority: number;
  is_urgent: boolean;
  status: "open" | "completed" | "skipped" | "rescheduled";
  days_overdue?: number;
}

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export interface MessageTemplate {
  id: string;
  content: string;
  name?: string;
  use_case: string;
  channel?: string;
  context_tags: string[];
  times_used: number;
  success_rate?: number;
  is_team_shared: boolean;
  created_at: string;
}

export interface TemplateUseCase {
  id: string;
  label: string;
  icon: string;
}

// =============================================================================
// LEGACY TYPES (Abwärtskompatibilität)
// =============================================================================

export interface SuggestedNextStep {
  type: "follow_up" | "introduce_offer" | "book_call" | "send_info" | "none";
  suggestedInDays?: number | null;
  messageSuggestion?: string | null;
}

export interface ExtractedLead {
  firstName?: string | null;
  lastName?: string | null;
  socialHandle?: string | null;
  socialUrl?: string | null;
  channel: ChatChannel;
  language?: string | null;
  status?: string | null;
  lastMessageSummary?: string | null;
  suggestedNextStep?: SuggestedNextStep | null;
}

export interface ConversationInsights {
  sentiment?: string | null;
  objectionsDetected: string[];
  discoveryTags: string[];
  painPoints: string[];
  buyingSignals: string[];
}

export interface ImportFromChatRequest {
  rawChat: string;
  channel: ChatChannel;
  userRoleName?: string | null;
  companyId?: string | null;
}

export interface ImportFromChatResponse {
  extractedLead: ExtractedLead;
  missingFields: string[];
  conversationInsights: ConversationInsights;
  rawTranscriptCleaned?: string | null;
}

export interface SaveImportedLeadRequest {
  firstName: string;
  channel: ChatChannel;
  lastName?: string;
  email?: string;
  phone?: string;
  socialUrl?: string;
  socialHandle?: string;
  status?: string;
  notes?: string;
  tags?: string[];
  scheduleFollowup?: boolean;
  followupInDays?: number;
  followupMessage?: string;
  originalChat?: string;
  companyId?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getStatusEmoji(status: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    cold: "❄️",
    warm: "🌤️",
    hot: "🔥",
    customer: "💎",
    lost: "❌",
    unknown: "❓",
  };
  return map[status] || "❓";
}

export function getDealStateEmoji(state: DealState): string {
  const map: Record<DealState, string> = {
    none: "⚪",
    considering: "🤔",
    pending_payment: "💳",
    paid: "✅",
    on_hold: "⏸️",
    lost: "❌",
  };
  return map[state] || "⚪";
}

export function getActionIcon(action: ActionType): string {
  const map: Record<ActionType, string> = {
    no_action: "minus-circle",
    follow_up_message: "chatbubble-outline",
    call: "call-outline",
    check_payment: "card-outline",
    reactivation_follow_up: "refresh-outline",
    send_info: "document-outline",
    schedule_meeting: "calendar-outline",
    wait_for_lead: "hourglass-outline",
    custom: "ellipsis-horizontal-outline",
  };
  return map[action] || "arrow-forward-outline";
}

export function getActionLabel(action: ActionType): string {
  const map: Record<ActionType, string> = {
    no_action: "Keine Aktion",
    follow_up_message: "Follow-up senden",
    call: "Anrufen",
    check_payment: "Zahlung prüfen",
    reactivation_follow_up: "Reaktivieren",
    send_info: "Infos senden",
    schedule_meeting: "Termin vereinbaren",
    wait_for_lead: "Auf Lead warten",
    custom: "Benutzerdefiniert",
  };
  return map[action] || action;
}

export function getObjectionEmoji(type: ObjectionType): string {
  const map: Record<ObjectionType, string> = {
    price: "💰",
    time: "⏰",
    think_about_it: "🤔",
    not_interested: "🚫",
    competitor: "🏢",
    trust: "🤝",
    need: "🎯",
    authority: "👥",
    other: "❓",
  };
  return map[type] || "❓";
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
