/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - PERSONALITY & CONTACT PLAN TYPES                          ║
 * ║  DISG-Persönlichkeitsprofile & No-Lead-Left-Behind System                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// ENUM SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DISG Persönlichkeitstyp (Uppercase für DB-Kompatibilität)
 */
export const DiscStyleSchema = z.enum(['D', 'I', 'S', 'G']);

/**
 * Entscheidungs-Status des Leads
 */
export const DecisionStateSchema = z.enum([
  'no_decision',  // Noch unklar
  'thinking',     // Denkt nach
  'committed',    // Hat zugesagt
  'not_now',      // Jetzt nicht, später vielleicht
  'rejected'      // Klare Absage
]);

/**
 * Wie wurde der Kontaktplan erstellt?
 */
export const ContactPlanTypeSchema = z.enum([
  'manual_choice',   // User hat manuell gewählt
  'ai_suggested',    // AI hat vorgeschlagen, User bestätigt
  'ai_autopilot'     // AI hat automatisch gesetzt
]);

/**
 * Kontakt-Kanal
 */
export const ContactChannelSchema = z.enum([
  'whatsapp',
  'phone',
  'email',
  'social',
  'meeting'
]);

/**
 * Plan-Dringlichkeit (computed)
 */
export const PlanUrgencySchema = z.enum([
  'no_plan',
  'overdue',
  'today',
  'this_week',
  'later'
]);

// ═══════════════════════════════════════════════════════════════════════════
// PERSONALITY PROFILE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DISG-Persönlichkeitsprofil eines Leads
 */
export const LeadPersonalityProfileSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  
  // DISG Scores (0-1)
  disc_d: z.number().min(0).max(1),
  disc_i: z.number().min(0).max(1),
  disc_s: z.number().min(0).max(1),
  disc_g: z.number().min(0).max(1),
  
  // Dominanter Stil
  dominant_style: DiscStyleSchema,
  
  // Confidence (0-1)
  confidence: z.number().min(0).max(1),
  
  // Analyse-Basis
  messages_analyzed: z.number().int().nonnegative(),
  last_analysis_at: z.string().datetime().nullable(),
  analysis_notes: z.string().nullable(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT PLAN SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Kontaktplan für einen Lead
 */
export const ContactPlanSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  
  // Nächster Kontakt
  next_contact_at: z.string().datetime().nullable(),
  next_channel: ContactChannelSchema,
  next_playbook_id: z.string().uuid().nullable().optional(),
  
  // Wie wurde der Plan erstellt?
  plan_type: ContactPlanTypeSchema,
  selected_by_user: z.boolean(),
  
  // Begründung & Vorschlag
  reasoning: z.string().nullable(),
  suggested_message: z.string().nullable(),
  suggested_message_tone: z.string().nullable(),
  
  // Status
  is_active: z.boolean(),
  executed_at: z.string().datetime().nullable(),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ═══════════════════════════════════════════════════════════════════════════
// FULL LEAD CONTEXT SCHEMA (from view)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lead mit vollständigem Kontext (DISG + Plan)
 */
export const LeadFullContextSchema = z.object({
  // Basis-Lead-Daten
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.string(),
  decision_state: DecisionStateSchema.nullable(),
  assigned_to: z.string().uuid().nullable().optional(),
  workspace_id: z.string().uuid(),
  last_contact_at: z.string().datetime().nullable(),
  notes: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  
  // DISG Profile
  dominant_style: DiscStyleSchema.nullable(),
  disc_d: z.number().nullable(),
  disc_i: z.number().nullable(),
  disc_s: z.number().nullable(),
  disc_g: z.number().nullable(),
  disc_confidence: z.number().nullable(),
  
  // Contact Plan
  next_contact_at: z.string().datetime().nullable(),
  next_channel: ContactChannelSchema.nullable(),
  plan_type: ContactPlanTypeSchema.nullable(),
  plan_reasoning: z.string().nullable(),
  suggested_message: z.string().nullable(),
  suggested_message_tone: z.string().nullable().optional(),
  
  // Computed
  plan_urgency: PlanUrgencySchema,
  days_since_contact: z.number().int().nullable()
});

// ═══════════════════════════════════════════════════════════════════════════
// TODAYS CONTACT PLANS SCHEMA (from RPC)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Heutiger Kontaktplan (für Daily Flow)
 */
export const TodayContactPlanSchema = z.object({
  plan_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  lead_name: z.string(),
  lead_status: z.string(),
  decision_state: DecisionStateSchema.nullable(),
  dominant_style: DiscStyleSchema,
  next_contact_at: z.string().datetime(),
  next_channel: z.string(),
  suggested_message: z.string().nullable(),
  suggested_message_tone: z.string().nullable(),
  reasoning: z.string().nullable(),
  is_overdue: z.boolean()
});

// ═══════════════════════════════════════════════════════════════════════════
// AI ANALYSIS INPUT/OUTPUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input für DISG-Analyse
 */
export const DiscAnalysisInputSchema = z.object({
  messages: z.array(z.object({
    from: z.enum(['user', 'lead']),
    text: z.string(),
    timestamp: z.string()
  })),
  lead_name: z.string(),
  context: z.string().optional()
});

/**
 * Output der DISG-Analyse
 */
export const DiscAnalysisOutputSchema = z.object({
  disc_d: z.number().min(0).max(1),
  disc_i: z.number().min(0).max(1),
  disc_s: z.number().min(0).max(1),
  disc_g: z.number().min(0).max(1),
  dominant_style: DiscStyleSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

/**
 * Input für Follow-up Generator
 */
export const FollowUpGeneratorInputSchema = z.object({
  language: z.enum(['de', 'en']),
  companyContext: z.object({
    company_name: z.string(),
    product_name: z.string(),
    product_short_benefit: z.string(),
    compliance_notes: z.string().optional()
  }),
  lead: z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    decision_state: DecisionStateSchema,
    last_contact_at: z.string(),
    last_channel: ContactChannelSchema
  }),
  discProfile: z.object({
    dominant_style: DiscStyleSchema,
    disc_d: z.number(),
    disc_i: z.number(),
    disc_s: z.number(),
    disc_g: z.number(),
    confidence: z.number()
  }).optional(),
  lastConversationSummary: z.string(),
  lastLeadMessage: z.string().optional(),
  userNotes: z.string().optional(),
  desiredNextWindowDays: z.tuple([z.number(), z.number()]).optional()
});

/**
 * Output des Follow-up Generators
 */
export const FollowUpGeneratorOutputSchema = z.object({
  message_text: z.string(),
  subject_line: z.string().optional(),
  suggested_next_contact_at: z.string().datetime(),
  tone_hint: z.string(),
  explanation_short: z.string()
});

// ═══════════════════════════════════════════════════════════════════════════
// REACTIVATION CANDIDATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reaktivierungs-Kandidat
 */
export const ReactivationCandidateSchema = z.object({
  lead_id: z.string().uuid(),
  lead_name: z.string(),
  lead_status: z.string(),
  decision_state: DecisionStateSchema.nullable(),
  dominant_style: DiscStyleSchema,
  last_contact_at: z.string().datetime().nullable(),
  days_since_contact: z.number().int(),
  reactivation_priority: z.number().int()
});

// ═══════════════════════════════════════════════════════════════════════════
// JSDOC TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {z.infer<typeof DiscStyleSchema>} DiscStyle
 * @typedef {z.infer<typeof DecisionStateSchema>} DecisionState
 * @typedef {z.infer<typeof ContactPlanTypeSchema>} ContactPlanType
 * @typedef {z.infer<typeof ContactChannelSchema>} ContactChannel
 * @typedef {z.infer<typeof PlanUrgencySchema>} PlanUrgency
 * @typedef {z.infer<typeof LeadPersonalityProfileSchema>} LeadPersonalityProfile
 * @typedef {z.infer<typeof ContactPlanSchema>} ContactPlan
 * @typedef {z.infer<typeof LeadFullContextSchema>} LeadFullContext
 * @typedef {z.infer<typeof TodayContactPlanSchema>} TodayContactPlan
 * @typedef {z.infer<typeof DiscAnalysisInputSchema>} DiscAnalysisInput
 * @typedef {z.infer<typeof DiscAnalysisOutputSchema>} DiscAnalysisOutput
 * @typedef {z.infer<typeof FollowUpGeneratorInputSchema>} FollowUpGeneratorInput
 * @typedef {z.infer<typeof FollowUpGeneratorOutputSchema>} FollowUpGeneratorOutput
 * @typedef {z.infer<typeof ReactivationCandidateSchema>} ReactivationCandidate
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DISG Typen Beschreibungen (erweitert)
 */
export const DISC_DESCRIPTIONS = {
  D: {
    name: 'Dominant',
    emoji: '🎯',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    keywords: ['direkt', 'ergebnisorientiert', 'entschlossen'],
    communication_style: 'Kurz, klar, auf den Punkt. Keine Umschweife.',
    approach: 'Schnell auf den Punkt kommen, Fakten & ROI zeigen',
    follow_up_tips: [
      'Kurze Nachrichten ohne Smalltalk',
      'Konkrete Ergebnisse erwähnen',
      'Klare Call-to-Action'
    ]
  },
  I: {
    name: 'Initiativ',
    emoji: '🌟',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    keywords: ['enthusiastisch', 'optimistisch', 'beziehungsorientiert'],
    communication_style: 'Warm, persönlich, emotional. Beziehung vor Fakten.',
    approach: 'Begeisterung zeigen, Visionen malen, persönliche Connection',
    follow_up_tips: [
      'Persönliche Anknüpfung',
      'Positive Emotionen',
      '1-2 Emojis erlaubt'
    ]
  },
  S: {
    name: 'Stetig',
    emoji: '🤝',
    color: '#10B981',
    bgColor: '#DCFCE7',
    keywords: ['geduldig', 'loyal', 'harmoniebedürftig'],
    communication_style: 'Ruhig, verständnisvoll, kein Druck. Sicherheit geben.',
    approach: 'Zeit geben, Sicherheit bieten, schrittweise vorgehen',
    follow_up_tips: [
      'Keinen Druck aufbauen',
      'Verständnis zeigen',
      'Geduld signalisieren'
    ]
  },
  G: {
    name: 'Gewissenhaft',
    emoji: '📊',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    keywords: ['analytisch', 'präzise', 'qualitätsbewusst'],
    communication_style: 'Faktenbasiert, strukturiert, detailliert. Beweise liefern.',
    approach: 'Daten & Fakten liefern, technische Details, Beweise',
    follow_up_tips: [
      'Konkrete Daten/Zahlen',
      'Strukturierte Infos',
      'Logische Argumente'
    ]
  }
};

/**
 * Decision State Labels und Aktionen
 */
export const DECISION_STATE_CONFIG = {
  no_decision: {
    label: 'Offen',
    emoji: '❓',
    color: '#94A3B8',
    bgColor: '#F1F5F9',
    action_hint: 'Herausfinden wo die Person steht',
    next_step_suggestion: 'Status klären'
  },
  thinking: {
    label: 'Denkt nach',
    emoji: '🤔',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    action_hint: 'Sanft nachfassen, keinen Druck aufbauen',
    next_step_suggestion: 'In 3-5 Tagen nachfassen'
  },
  committed: {
    label: 'Zugesagt',
    emoji: '✅',
    color: '#10B981',
    bgColor: '#DCFCE7',
    action_hint: 'Nächste Schritte klären, Termin fixieren',
    next_step_suggestion: 'Termin vereinbaren'
  },
  not_now: {
    label: 'Nicht jetzt',
    emoji: '⏰',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    action_hint: 'Respektieren, später wieder melden',
    next_step_suggestion: 'In 2-4 Wochen erneut kontaktieren'
  },
  rejected: {
    label: 'Abgesagt',
    emoji: '❌',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    action_hint: 'Nicht weiter kontaktieren',
    next_step_suggestion: 'Kein Follow-up'
  }
};

/**
 * Kanal-Konfiguration
 */
export const CHANNEL_CONFIG = {
  whatsapp: {
    label: 'WhatsApp',
    emoji: '💬',
    color: '#25D366',
    max_length: 500
  },
  phone: {
    label: 'Telefon',
    emoji: '📞',
    color: '#3B82F6',
    max_length: null
  },
  email: {
    label: 'E-Mail',
    emoji: '📧',
    color: '#6366F1',
    max_length: 2000
  },
  social: {
    label: 'Social Media',
    emoji: '📱',
    color: '#EC4899',
    max_length: 300
  },
  meeting: {
    label: 'Meeting',
    emoji: '🤝',
    color: '#10B981',
    max_length: null
  }
};

/**
 * Quick-Options für nächsten Kontakt
 */
export const QUICK_CONTACT_OPTIONS = [
  { days: 1, label: 'Morgen', emoji: '📅' },
  { days: 2, label: 'In 2 Tagen', emoji: '📆' },
  { days: 3, label: 'In 3 Tagen', emoji: '🗓️' },
  { days: 7, label: 'In 1 Woche', emoji: '📋' },
  { days: 14, label: 'In 2 Wochen', emoji: '📅' },
  { days: 30, label: 'In 1 Monat', emoji: '🗓️' }
];

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validiert ein DISG-Profil
 * @param {unknown} data
 * @returns {LeadPersonalityProfile}
 */
export function validatePersonalityProfile(data) {
  return LeadPersonalityProfileSchema.parse(data);
}

/**
 * Validiert einen Kontaktplan
 * @param {unknown} data
 * @returns {ContactPlan}
 */
export function validateContactPlan(data) {
  return ContactPlanSchema.parse(data);
}

/**
 * Validiert einen Lead mit vollem Kontext
 * @param {unknown} data
 * @returns {LeadFullContext}
 */
export function validateLeadFullContext(data) {
  return LeadFullContextSchema.parse(data);
}

/**
 * Validiert DISG-Analyse Output
 * @param {unknown} data
 * @returns {DiscAnalysisOutput}
 */
export function validateDiscAnalysisOutput(data) {
  return DiscAnalysisOutputSchema.parse(data);
}

/**
 * Validiert Follow-up Generator Output
 * @param {unknown} data
 * @returns {FollowUpGeneratorOutput}
 */
export function validateFollowUpOutput(data) {
  return FollowUpGeneratorOutputSchema.parse(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Bestimmt den dominanten DISG-Stil aus Scores
 * @param {number} d 
 * @param {number} i 
 * @param {number} s 
 * @param {number} g 
 * @returns {DiscStyle}
 */
export function getDominantStyle(d, i, s, g) {
  const max = Math.max(d, i, s, g);
  if (d === max) return 'D';
  if (i === max) return 'I';
  if (s === max) return 'S';
  return 'G';
}

/**
 * Berechnet die Tage bis zum nächsten Kontakt
 * @param {string|null} nextContactAt 
 * @returns {number|null}
 */
export function getDaysUntilContact(nextContactAt) {
  if (!nextContactAt) return null;
  const diff = new Date(nextContactAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Gibt die Plan-Urgency zurück
 * @param {string|null} nextContactAt 
 * @returns {PlanUrgency}
 */
export function getPlanUrgency(nextContactAt) {
  if (!nextContactAt) return 'no_plan';
  
  const daysUntil = getDaysUntilContact(nextContactAt);
  if (daysUntil === null) return 'no_plan';
  if (daysUntil < 0) return 'overdue';
  if (daysUntil < 1) return 'today';
  if (daysUntil < 7) return 'this_week';
  return 'later';
}

/**
 * Formatiert das nächste Kontaktdatum für Anzeige
 * @param {string|null} nextContactAt 
 * @param {string} locale 
 * @returns {string}
 */
export function formatNextContactDate(nextContactAt, locale = 'de-DE') {
  if (!nextContactAt) return 'Kein Termin';
  
  const date = new Date(nextContactAt);
  const daysUntil = getDaysUntilContact(nextContactAt);
  
  if (daysUntil !== null && daysUntil < 0) {
    return `Überfällig (${Math.abs(daysUntil)} Tage)`;
  }
  if (daysUntil === 0) return 'Heute';
  if (daysUntil === 1) return 'Morgen';
  
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Schemas
  DiscStyleSchema,
  DecisionStateSchema,
  ContactPlanTypeSchema,
  ContactChannelSchema,
  PlanUrgencySchema,
  LeadPersonalityProfileSchema,
  ContactPlanSchema,
  LeadFullContextSchema,
  TodayContactPlanSchema,
  DiscAnalysisInputSchema,
  DiscAnalysisOutputSchema,
  FollowUpGeneratorInputSchema,
  FollowUpGeneratorOutputSchema,
  ReactivationCandidateSchema,
  
  // Constants
  DISC_DESCRIPTIONS,
  DECISION_STATE_CONFIG,
  CHANNEL_CONFIG,
  QUICK_CONTACT_OPTIONS,
  
  // Validators
  validatePersonalityProfile,
  validateContactPlan,
  validateLeadFullContext,
  validateDiscAnalysisOutput,
  validateFollowUpOutput,
  
  // Utils
  getDominantStyle,
  getDaysUntilContact,
  getPlanUrgency,
  formatNextContactDate
};

