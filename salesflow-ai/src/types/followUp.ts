/**
 * Eternal Follow-Up Engine – Type Definitions
 *
 * Phasen:
 * - A: Aktives Follow-up (Tag 0-14)
 * - B: Reaktivierung (Tag 60-300)
 * - C: Endlos-Loop (alle 180 Tage)
 */

// ──────────────────────────────────────────────────────────────────────────────
// Enums / Literal Types
// ──────────────────────────────────────────────────────────────────────────────

/** Phase der Follow-Up Sequenz */
export type FollowUpPhase = "followup" | "reactivation" | "loop";

/** Kommunikationskanal */
export type FollowUpChannel = "whatsapp" | "instagram" | "linkedin" | "email" | "phone";

/** Lead-Status im Follow-Up System */
export type LeadStatus = "active" | "paused" | "replied" | "converted" | "lost";

/** Dringlichkeit eines Tasks */
export type TaskUrgency = "overdue" | "today" | "upcoming";

/** Stufen der Follow-Up Sequenz */
export type FollowUpStepCode =
  // Phase A: Aktives Follow-up (Tag 0-14)
  | "initial_contact"
  | "fu_1_bump"
  | "fu_2_value"
  | "fu_3_decision"
  | "fu_4_last_touch"
  // Phase B: Reaktivierung (Tag 60-300)
  | "rx_1_update"
  | "rx_2_value_asset"
  | "rx_3_yearly_checkin"
  // Phase C: Endlos-Loop
  | "rx_loop_checkin";

/** Ergebnis einer Aktion */
export type TaskOutcome =
  | "sent"
  | "no_answer"
  | "replied"
  | "interested"
  | "not_interested"
  | "wrong_number"
  | "call_back"
  | "meeting_scheduled";

// ──────────────────────────────────────────────────────────────────────────────
// Database Interfaces (Supabase Tables)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * follow_up_templates – Definiert die Sequenz-Stufen
 */
export interface FollowUpTemplate {
  id: string;
  step_code: FollowUpStepCode;
  phase: FollowUpPhase;
  step_order: number;
  days_after_previous: number;
  default_channel: FollowUpChannel;
  message_template: string;
  subject_template?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * lead_follow_up_status – Status pro Lead
 */
export interface LeadFollowUpStatus {
  id: string;
  lead_id: string;
  current_step_code: FollowUpStepCode;
  status: LeadStatus;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  contact_count: number;
  reply_count: number;
  preferred_channel: FollowUpChannel | null;
  notes: string | null;
  paused_until: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * follow_up_history – Verlauf aller Aktionen
 */
export interface FollowUpHistory {
  id: string;
  lead_id: string;
  follow_up_status_id: string;
  step_code: FollowUpStepCode;
  channel: FollowUpChannel;
  outcome: TaskOutcome;
  message_sent: string | null;
  response_received: string | null;
  notes: string | null;
  executed_at: string;
  created_at?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// View / Computed Interfaces
// ──────────────────────────────────────────────────────────────────────────────

/**
 * today_follow_ups View – Heute fällige Tasks mit Lead-Daten
 */
export interface TodayFollowUpTask {
  // Task identifiers
  status_id: string;
  lead_id: string;

  // Lead info (from leads table join)
  lead_name: string | null;
  lead_company: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  lead_instagram: string | null;
  lead_linkedin?: string | null;
  lead_vertical: string | null;

  // Follow-up status
  current_step_code: FollowUpStepCode;
  phase: FollowUpPhase;
  status: LeadStatus;
  next_follow_up_at: string;
  last_contacted_at: string | null;
  contact_count: number;
  reply_count: number;
  preferred_channel: FollowUpChannel | null;

  // Template info
  template_id?: string;
  message_template: string | null;
  subject_template?: string | null;
  default_channel: FollowUpChannel;

  // Computed
  urgency: TaskUrgency;
  days_overdue: number;
}

/**
 * Statistiken für das Follow-Up Dashboard
 */
export interface FollowUpStats {
  total_active: number;
  overdue_count: number;
  today_count: number;
  upcoming_count: number;
  paused_count: number;
  replied_count: number;
  converted_count: number;
  lost_count: number;
  reply_rate: number;
  conversion_rate: number;
  avg_touches_to_reply: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// UI / Component Props Types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Parameter für Task-Completion
 */
export interface CompleteTaskParams {
  leadId: string;
  outcome: TaskOutcome;
  messageSent?: string;
  notes?: string;
}

/**
 * Parameter für Message Generation
 */
export interface GenerateMessageParams {
  template: string;
  lead: {
    name?: string | null;
    company?: string | null;
    vertical?: string | null;
    [key: string]: string | null | undefined;
  };
}

/**
 * Phase-Konfiguration für UI-Darstellung
 */
export interface PhaseConfig {
  phase: FollowUpPhase;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Step-Konfiguration für UI-Darstellung
 */
export interface StepConfig {
  code: FollowUpStepCode;
  label: string;
  shortLabel: string;
  phase: FollowUpPhase;
  dayRange: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

export const PHASE_CONFIGS: Record<FollowUpPhase, PhaseConfig> = {
  followup: {
    phase: "followup",
    label: "Aktives Follow-up",
    description: "Tag 0-14: Initiale Kontaktaufnahme und Nachfassen",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
  },
  reactivation: {
    phase: "reactivation",
    label: "Reaktivierung",
    description: "Tag 60-300: Erneute Ansprache nach Pause",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/40",
  },
  loop: {
    phase: "loop",
    label: "Endlos-Loop",
    description: "Alle 180 Tage: Regelmäßiger Check-in",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/40",
  },
};

export const STEP_CONFIGS: StepConfig[] = [
  // Phase A
  { code: "initial_contact", label: "Erstkontakt", shortLabel: "Start", phase: "followup", dayRange: "Tag 0" },
  { code: "fu_1_bump", label: "Bump", shortLabel: "Bump", phase: "followup", dayRange: "Tag 3" },
  { code: "fu_2_value", label: "Value Add", shortLabel: "Value", phase: "followup", dayRange: "Tag 7" },
  { code: "fu_3_decision", label: "Decision Push", shortLabel: "Decision", phase: "followup", dayRange: "Tag 10" },
  { code: "fu_4_last_touch", label: "Last Touch", shortLabel: "Last", phase: "followup", dayRange: "Tag 14" },
  // Phase B
  { code: "rx_1_update", label: "Update Check-in", shortLabel: "Update", phase: "reactivation", dayRange: "Tag 60" },
  { code: "rx_2_value_asset", label: "Value Asset", shortLabel: "Asset", phase: "reactivation", dayRange: "Tag 120" },
  { code: "rx_3_yearly_checkin", label: "Jahres-Check", shortLabel: "Yearly", phase: "reactivation", dayRange: "Tag 300" },
  // Phase C
  { code: "rx_loop_checkin", label: "Loop Check-in", shortLabel: "Loop", phase: "loop", dayRange: "Alle 180 Tage" },
];

export const CHANNEL_LABELS: Record<FollowUpChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram DM",
  linkedin: "LinkedIn",
  email: "E-Mail",
  phone: "Telefon",
};

export const URGENCY_CONFIGS: Record<TaskUrgency, { label: string; color: string; bgColor: string }> = {
  overdue: { label: "Überfällig", color: "text-red-400", bgColor: "bg-red-500/10" },
  today: { label: "Heute", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  upcoming: { label: "Demnächst", color: "text-slate-400", bgColor: "bg-slate-500/10" },
};

export const OUTCOME_LABELS: Record<TaskOutcome, string> = {
  sent: "Gesendet",
  no_answer: "Keine Antwort",
  replied: "Antwort erhalten",
  interested: "Interessiert",
  not_interested: "Nicht interessiert",
  wrong_number: "Falsche Nummer",
  call_back: "Rückruf vereinbart",
  meeting_scheduled: "Termin vereinbart",
};

