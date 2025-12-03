/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - GOAL TYPES (Vertriebsagnostisch)                         ║
 * ║  OS für jeden Vertrieb: MLM, Immobilien, Finance, Coaching, etc.          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Diese Types sind generisch und funktionieren für alle Verticals.
 * Sie ergänzen die bestehenden compensation.ts Types um mehr Flexibilität.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL ID (erweitert für mehr Branchen)
// ═══════════════════════════════════════════════════════════════════════════

export const VerticalIdSchema = z.enum([
  'network_marketing',
  'real_estate',
  'finance',
  'coaching',
  'b2b_saas',
  'insurance',
  'generic',
]);
export type VerticalId = z.infer<typeof VerticalIdSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// GOAL KIND (erweitert: nicht nur income/rank)
// ═══════════════════════════════════════════════════════════════════════════

export const GoalKindSchema = z.enum([
  'income',   // Ziel-Einkommen pro Monat
  'rank',     // Rang / Status / Level
  'deals',    // Anzahl Abschlüsse / Verkäufe
  'volume',   // Umsatz / Volumen (Credits, Provision, etc.)
  'clients',  // Kundenanzahl
]);
export type GoalKind = z.infer<typeof GoalKindSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// GOAL INPUT
// ═══════════════════════════════════════════════════════════════════════════

export const GoalInputSchema = z.object({
  vertical_id: VerticalIdSchema,
  goal_kind: GoalKindSchema,
  target_value: z.number().positive().describe('Zielwert (€, Anzahl, Volumen)'),
  timeframe_months: z.number().int().min(1).max(60).describe('Zeitraum in Monaten'),
  vertical_meta: z.record(z.any()).default({}).describe(
    'Vertical-spezifische Zusatzinfos (z.B. comp_plan_id für MLM)'
  ),
});
export type GoalInput = z.infer<typeof GoalInputSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// GOAL BREAKDOWN (Generisch statt MLM-spezifisch)
// ═══════════════════════════════════════════════════════════════════════════

export const GoalBreakdownSchema = z.object({
  vertical_id: VerticalIdSchema,
  goal_kind: GoalKindSchema,
  timeframe_months: z.number().int().positive(),
  
  // Generische Einheiten
  primary_units: z.number().describe(
    'Haupteinheiten: MLM=Kunden, Immobilien=Deals, Coaching=Programme'
  ),
  secondary_units: z.number().nullable().optional().describe(
    'Sekundäreinheiten: MLM=Partner, Immobilien=Besichtigungen, etc.'
  ),
  
  // Volumen-Breakdown
  required_volume: z.number().nullable().optional().describe(
    'Gesamt-Volumen (Credits/Umsatz/Prämien)'
  ),
  per_month_volume: z.number(),
  per_week_volume: z.number(),
  per_day_volume: z.number(),
  
  // Vertical-spezifische Details
  vertical_details: z.record(z.any()).default({}).describe(
    'Vertical-spezifisch: Rang-Infos, Plan-ID, etc.'
  ),
  
  notes: z.string().nullable().optional().describe('Erklärung/Debug-Info'),
});
export type GoalBreakdown = z.infer<typeof GoalBreakdownSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// DAILY FLOW CONFIG (Generisch mit primary/secondary statt customer/partner)
// ═══════════════════════════════════════════════════════════════════════════

export const GenericDailyFlowConfigSchema = z.object({
  working_days_per_week: z.number().int().min(1).max(7).default(5),
  
  // Konversionsraten
  contact_to_primary_unit: z.number().min(0).max(1).describe(
    'Kontakt → Kunde/Deal Konversionsrate'
  ),
  contact_to_secondary_unit: z.number().min(0).max(1).nullable().optional().describe(
    'Kontakt → Partner/Besichtigung Rate'
  ),
  
  // Follow-up Annahmen
  followups_per_primary: z.number().int().default(3).describe('Follow-ups bis Abschluss'),
  followups_per_secondary: z.number().int().nullable().optional().default(5),
  
  // Reaktivierung
  reactivation_share: z.number().min(0).max(1).default(0.2).describe(
    'Anteil Reaktivierungen am Gesamt-Flow'
  ),
});
export type GenericDailyFlowConfig = z.infer<typeof GenericDailyFlowConfigSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// DAILY FLOW TARGETS (Generisch)
// ═══════════════════════════════════════════════════════════════════════════

export const GenericDailyFlowTargetsSchema = z.object({
  user_id: z.string().uuid(),
  company_id: z.string(),
  vertical_id: VerticalIdSchema,
  
  // Generische Targets (Labels werden vom Vertical bestimmt)
  new_contacts: z.number().int().describe('Neue Kontakte/Leads pro Tag'),
  followups: z.number().int().describe('Follow-ups pro Tag'),
  reactivations: z.number().int().describe('Reaktivierungen pro Tag'),
  
  // Optional: Vertical-spezifische Targets
  custom_targets: z.record(z.number().int()).default({}).describe(
    "z.B. {'viewings': 2, 'offers': 1} für Makler"
  ),
});
export type GenericDailyFlowTargets = z.infer<typeof GenericDailyFlowTargetsSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// KPI DEFINITION (Erweitert für dynamische UI)
// ═══════════════════════════════════════════════════════════════════════════

export const ExtendedKpiDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  unit: z.enum(['per_day', 'per_week', 'per_month', 'total', 'currency', 'percent']).default('per_day'),
  icon: z.string().nullable().optional().describe('Lucide icon name'),
  color: z.string().nullable().optional().describe('Tailwind color'),
});
export type ExtendedKpiDefinition = z.infer<typeof ExtendedKpiDefinitionSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL-SPECIFIC UNIT LABELS
// ═══════════════════════════════════════════════════════════════════════════

export interface VerticalUnitLabels {
  primary_unit: string;      // "Kunden" | "Deals" | "Abschlüsse" | "Programme"
  secondary_unit: string;    // "Partner" | "Besichtigungen" | "Leads"
  volume_unit: string;       // "Credits" | "€ Provision" | "Punkte"
}

export const VERTICAL_UNIT_LABELS: Record<VerticalId, VerticalUnitLabels> = {
  network_marketing: {
    primary_unit: 'Kunden',
    secondary_unit: 'Partner',
    volume_unit: 'Credits',
  },
  real_estate: {
    primary_unit: 'Abschlüsse',
    secondary_unit: 'Besichtigungen',
    volume_unit: '€ Provision',
  },
  finance: {
    primary_unit: 'Verträge',
    secondary_unit: 'Beratungsgespräche',
    volume_unit: '€ Provision',
  },
  coaching: {
    primary_unit: 'Klienten',
    secondary_unit: 'Discovery Calls',
    volume_unit: '€ Umsatz',
  },
  b2b_saas: {
    primary_unit: 'Deals',
    secondary_unit: 'Demos',
    volume_unit: '€ ARR',
  },
  insurance: {
    primary_unit: 'Policen',
    secondary_unit: 'Beratungen',
    volume_unit: '€ Provision',
  },
  generic: {
    primary_unit: 'Abschlüsse',
    secondary_unit: 'Kontakte',
    volume_unit: '€',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONVERSION RATES PER VERTICAL
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_CONVERSION_RATES: Record<VerticalId, GenericDailyFlowConfig> = {
  network_marketing: {
    working_days_per_week: 5,
    contact_to_primary_unit: 0.20,    // 20% werden Kunde
    contact_to_secondary_unit: 0.05,  // 5% werden Partner
    followups_per_primary: 3,
    followups_per_secondary: 5,
    reactivation_share: 0.20,
  },
  real_estate: {
    working_days_per_week: 6,
    contact_to_primary_unit: 0.03,    // 3% Deal-Abschluss
    contact_to_secondary_unit: 0.25,  // 25% kommen zur Besichtigung
    followups_per_primary: 8,
    followups_per_secondary: 3,
    reactivation_share: 0.15,
  },
  finance: {
    working_days_per_week: 5,
    contact_to_primary_unit: 0.15,    // 15% Vertragsabschluss
    contact_to_secondary_unit: 0.40,  // 40% zum Beratungsgespräch
    followups_per_primary: 4,
    followups_per_secondary: 2,
    reactivation_share: 0.25,
  },
  coaching: {
    working_days_per_week: 5,
    contact_to_primary_unit: 0.10,    // 10% werden Klient
    contact_to_secondary_unit: 0.30,  // 30% zum Discovery Call
    followups_per_primary: 5,
    followups_per_secondary: 2,
    reactivation_share: 0.20,
  },
  b2b_saas: {
    working_days_per_week: 5,
    contact_to_primary_unit: 0.05,    // 5% Deal Close
    contact_to_secondary_unit: 0.15,  // 15% zur Demo
    followups_per_primary: 6,
    followups_per_secondary: 3,
    reactivation_share: 0.10,
  },
  insurance: {
    working_days_per_week: 5,
    contact_to_primary_unit: 0.12,    // 12% Police
    contact_to_secondary_unit: 0.35,  // 35% Beratung
    followups_per_primary: 4,
    followups_per_secondary: 2,
    reactivation_share: 0.30,
  },
  generic: {
    working_days_per_week: 5,
    contact_to_primary_unit: 0.10,
    contact_to_secondary_unit: 0.20,
    followups_per_primary: 4,
    followups_per_secondary: 3,
    reactivation_share: 0.20,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS & VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════

export function isValidVerticalId(value: string): value is VerticalId {
  return VerticalIdSchema.safeParse(value).success;
}

export function isValidGoalKind(value: string): value is GoalKind {
  return GoalKindSchema.safeParse(value).success;
}

export function validateGoalInput(input: unknown): GoalInput {
  return GoalInputSchema.parse(input);
}

export function validateGoalBreakdown(breakdown: unknown): GoalBreakdown {
  return GoalBreakdownSchema.parse(breakdown);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt die passenden Unit-Labels für ein Vertical
 */
export function getUnitLabels(verticalId: VerticalId): VerticalUnitLabels {
  return VERTICAL_UNIT_LABELS[verticalId] ?? VERTICAL_UNIT_LABELS.generic;
}

/**
 * Holt die Default-Konversionsraten für ein Vertical
 */
export function getDefaultConversionRates(verticalId: VerticalId): GenericDailyFlowConfig {
  return DEFAULT_CONVERSION_RATES[verticalId] ?? DEFAULT_CONVERSION_RATES.generic;
}

/**
 * Berechnet tägliche Targets aus einem GoalBreakdown
 */
export function calculateDailyTargetsFromBreakdown(
  breakdown: GoalBreakdown,
  config: GenericDailyFlowConfig
): GenericDailyFlowTargets {
  const workingDaysPerMonth = config.working_days_per_week * 4.33;
  
  // Wie viele primary units pro Tag?
  const primaryUnitsPerDay = breakdown.primary_units / breakdown.timeframe_months / workingDaysPerMonth;
  
  // Kontakte = primary units / conversion rate
  const newContactsPerDay = Math.ceil(primaryUnitsPerDay / config.contact_to_primary_unit);
  
  // Follow-ups basierend auf Pipeline
  const followupsPerDay = Math.ceil(primaryUnitsPerDay * config.followups_per_primary);
  
  // Reaktivierungen
  const reactivationsPerDay = Math.ceil(newContactsPerDay * config.reactivation_share);
  
  return {
    user_id: '', // Wird beim Speichern gesetzt
    company_id: '', // Wird beim Speichern gesetzt
    vertical_id: breakdown.vertical_id,
    new_contacts: newContactsPerDay,
    followups: followupsPerDay,
    reactivations: reactivationsPerDay,
    custom_targets: {},
  };
}

