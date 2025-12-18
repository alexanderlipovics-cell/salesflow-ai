/**
 * Lead Management Types für Sales Flow AI
 * 
 * Vollständige Typdefinitionen für Lead-CRUD, P-Score, NBA, Zero-Input CRM
 */

// ============================================================================
// LEAD STATUS & STAGES
// ============================================================================

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST"
  | "GHOSTING"
  | "INACTIVE";

export type LeadSource =
  | "manual"
  | "import"
  | "website"
  | "referral"
  | "linkedin"
  | "instagram"
  | "whatsapp"
  | "cold_call"
  | "event"
  | "other";

export type LeadSegment = "smb" | "mid_market" | "enterprise" | "consumer";

export type PScoreBucket = "hot" | "warm" | "cold" | "unscored";

export type PScoreTrend = "up" | "down" | "flat";

// ============================================================================
// LEAD ENTITY
// ============================================================================

export interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  company_id?: string | null;
  company?: string | null;
  status: LeadStatus;
  source: LeadSource;
  segment?: LeadSegment | null;
  tags?: string[];
  notes?: string | null;
  temperature?: number; // 0-100 (manueller Score)
  
  // P-Score System
  p_score?: number | null;
  p_score_bucket?: PScoreBucket | null;
  p_score_trend?: PScoreTrend | null;
  v_score?: number | null; // Verification Score
  e_score?: number | null; // Enrichment Score
  i_score?: number | null; // Intent Score
  last_scored_at?: string | null;
  
  // Follow-up System
  next_follow_up?: string | null;
  follow_up_reason?: string | null;
  last_message?: string | null;
  platform?: string | null;
  
  // Ownership & Timestamps
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadListItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status: LeadStatus;
  source: LeadSource;
  p_score?: number | null;
  p_score_bucket?: PScoreBucket | null;
  temperature?: number;
  next_follow_up?: string | null;
  created_at: string;
}

// ============================================================================
// LEAD CRUD
// ============================================================================

export interface LeadFormData {
  name: string;
  email?: string;
  phone: string;
  company_id?: string;
  status: LeadStatus;
  source: LeadSource;
  segment?: LeadSegment;
  tags?: string[];
  notes?: string;
  temperature?: number;
  next_follow_up?: string;
  follow_up_reason?: string;
}

export interface LeadsResponse {
  leads: LeadListItem[];
  total?: number;
  count?: number;
}

export interface LeadQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus;
  source?: LeadSource;
  min_score?: number;
  owner_id?: string;
}

// ============================================================================
// P-SCORE SYSTEM
// ============================================================================

export interface PScoreResponse {
  success: boolean;
  lead_id: string;
  p_score: number;
  trend: PScoreTrend;
  factors: {
    base_score: number;
    inbound_events_7d: number;
    inbound_events_14d: number;
    outbound_events_14d: number;
    has_recent_activity: boolean;
    bonuses: string[];
    penalties: string[];
    old_score?: number;
    new_score: number;
    diff: number;
  };
}

export interface PScoreRecalcRequest {
  limit?: number;
}

export interface PScoreRecalcResponse {
  success: boolean;
  summary: {
    total_leads: number;
    leads_scored: number;
    avg_score: number | null;
    score_distribution: {
      hot: number;
      warm: number;
      cold: number;
    };
    duration_ms: number;
    errors: string[];
  };
}

export interface HotLeadsResponse {
  success: boolean;
  leads: Lead[];
  count: number;
}

// ============================================================================
// NEXT BEST ACTION (NBA)
// ============================================================================

export type NBAActionKey =
  | "follow_up"
  | "call_script"
  | "offer_create"
  | "closing_helper"
  | "research_person"
  | "nurture"
  | "wait";

export interface NBARequest {
  lead_id?: string;
  contact_id?: string;
}

export interface NBAResponse {
  success: boolean;
  action_key: NBAActionKey;
  reason: string;
  suggested_channel: string;
  priority: number; // 1-5 (5 = höchste)
  meta?: {
    p_score?: number;
    inbound_count?: number;
    outbound_count?: number;
    days_since_last?: number;
    status?: string;
  };
}

export interface NBABatchResponse {
  success: boolean;
  recommendations: Array<{
    lead: LeadListItem;
    nba: NBAResponse;
  }>;
  count: number;
}

// ============================================================================
// ZERO-INPUT CRM
// ============================================================================

export interface ZeroInputRequest {
  lead_id?: string;
  contact_id?: string;
  deal_id?: string;
  message_limit?: number;
  create_task?: boolean;
}

export interface ZeroInputResponse {
  success: boolean;
  note_id?: string;
  task_id?: string;
  summary: string;
  next_step?: string;
  sentiment?: string;
  metadata?: Record<string, unknown>;
}

export interface CRMNote {
  id: string;
  user_id: string;
  lead_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  content: string;
  note_type: "call" | "meeting" | "email" | "note" | "ai_summary";
  source: "user" | "ai" | "system";
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// NBA ACTION DESCRIPTIONS
// ============================================================================

export const NBA_ACTION_LABELS: Record<NBAActionKey, string> = {
  follow_up: "Follow-up senden",
  call_script: "Anruf vorbereiten",
  offer_create: "Angebot erstellen",
  closing_helper: "Abschluss vorbereiten",
  research_person: "Person recherchieren",
  nurture: "Content senden",
  wait: "Abwarten",
};

export const NBA_ACTION_ICONS: Record<NBAActionKey, string> = {
  follow_up: "📞",
  call_script: "☎️",
  offer_create: "💼",
  closing_helper: "🎯",
  research_person: "🔍",
  nurture: "📧",
  wait: "⏳",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getPScoreBadgeColor(
  score: number | null | undefined
): { bg: string; text: string } {
  if (!score) return { bg: "bg-gray-500/15", text: "text-gray-400" };
  if (score >= 80) return { bg: "bg-red-500/15", text: "text-red-400" }; // HOT
  if (score >= 50) return { bg: "bg-orange-500/15", text: "text-orange-400" }; // WARM
  if (score >= 20) return { bg: "bg-blue-500/15", text: "text-blue-400" }; // COOL
  return { bg: "bg-gray-500/15", text: "text-gray-400" }; // COLD
}

export function getPScoreBucketLabel(score: number | null | undefined): string {
  if (!score) return "UNSCORED";
  if (score >= 80) return "HOT";
  if (score >= 50) return "WARM";
  if (score >= 20) return "COOL";
  return "COLD";
}

export function getLeadStatusColor(status: LeadStatus): { bg: string; text: string } {
  const colors: Record<LeadStatus, { bg: string; text: string }> = {
    NEW: { bg: "bg-blue-500/15", text: "text-blue-400" },
    CONTACTED: { bg: "bg-sky-500/15", text: "text-sky-400" },
    INTERESTED: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
    QUALIFIED: { bg: "bg-violet-500/15", text: "text-violet-400" },
    PROPOSAL: { bg: "bg-orange-500/15", text: "text-orange-400" },
    NEGOTIATION: { bg: "bg-amber-500/15", text: "text-amber-400" },
    WON: { bg: "bg-lime-500/15", text: "text-lime-400" },
    LOST: { bg: "bg-rose-500/15", text: "text-rose-400" },
    GHOSTING: { bg: "bg-gray-500/15", text: "text-gray-400" },
    INACTIVE: { bg: "bg-slate-500/15", text: "text-slate-400" },
  };
  return colors[status] || colors.NEW;
}

export function getNBAPriorityColor(priority: number): { bg: string; text: string } {
  if (priority >= 5) return { bg: "bg-red-500/15", text: "text-red-400" };
  if (priority >= 4) return { bg: "bg-orange-500/15", text: "text-orange-400" };
  if (priority >= 3) return { bg: "bg-yellow-500/15", text: "text-yellow-400" };
  if (priority >= 2) return { bg: "bg-blue-500/15", text: "text-blue-400" };
  return { bg: "bg-gray-500/15", text: "text-gray-400" };
}

