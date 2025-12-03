/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL ADAPTER TYPES                                   ║
 * ║  Type-Definitionen für Goal-Berechnung (sync mit Python-Backend)          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Sync mit Python:
 *   → backend/app/domain/goals/types.py
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export const GoalKindSchema = z.enum([
  'income',     // Ziel-Einkommen (€/Monat)
  'rank',       // Rang erreichen
  'volume',     // Volumen-Ziel (Credits/PV)
  'customers',  // Anzahl Kunden
  'partners',   // Anzahl Partner
  'deals',      // Abschlüsse (Immobilien, Solar)
]);
export type GoalKind = z.infer<typeof GoalKindSchema>;

// Re-export VerticalId from existing types
export { VerticalIdSchema, type VerticalId } from '../config/verticals/types';

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Eingabe für Goal-Berechnung.
 * 
 * @example
 * const input: GoalInput = {
 *   vertical_id: 'network_marketing',
 *   goal_kind: 'income',
 *   target_value: 2000,  // 2.000€/Monat
 *   timeframe_months: 6,
 *   vertical_meta: { comp_plan_id: 'zinzino' }
 * };
 */
export const GoalInputSchema = z.object({
  vertical_id: z.string(),
  goal_kind: GoalKindSchema,
  target_value: z.number(),
  timeframe_months: z.number().min(1).max(60),
  current_value: z.number().default(0),
  vertical_meta: z.record(z.any()).default({}),
});
export type GoalInput = z.infer<typeof GoalInputSchema>;

/**
 * Konfiguration für Daily Flow Berechnungen.
 */
export const DailyFlowConversionConfigSchema = z.object({
  working_days_per_week: z.number().default(5),
  contact_to_primary_unit: z.number().default(0.20),    // 20% Kontakte → Kunden
  contact_to_secondary_unit: z.number().default(0.05),  // 5% Kontakte → Partner
  followups_per_primary: z.number().default(3),
  followups_per_secondary: z.number().default(5),
  reactivation_share: z.number().default(0.20),
});
export type DailyFlowConversionConfig = z.infer<typeof DailyFlowConversionConfigSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ergebnis der Goal-Berechnung.
 */
export const GoalBreakdownSchema = z.object({
  vertical_id: z.string(),
  goal_kind: GoalKindSchema,
  timeframe_months: z.number(),
  
  // Primäre & sekundäre Einheiten
  primary_units: z.number(),
  secondary_units: z.number(),
  
  // Volumen-Aufschlüsselung
  required_volume: z.number(),
  per_month_volume: z.number(),
  per_week_volume: z.number(),
  per_day_volume: z.number(),
  
  // Vertical-spezifische Details
  vertical_details: z.record(z.any()).default({}),
  
  // Notizen/Erklärung
  notes: z.string().default(''),
});
export type GoalBreakdown = z.infer<typeof GoalBreakdownSchema>;

/**
 * Tägliche Aktivitäts-Ziele.
 */
export interface DailyFlowTargets {
  new_contacts: number;
  followups: number;
  reactivations: number;
}

/**
 * Wöchentliche Aktivitäts-Ziele.
 */
export interface WeeklyFlowTargets {
  new_contacts: number;
  followups: number;
  reactivations: number;
  primary_units: number;
  secondary_units: number;
}

/**
 * Kombinierte Daily/Weekly Targets.
 */
export interface FlowTargets {
  daily: DailyFlowTargets;
  weekly: WeeklyFlowTargets;
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Definition eines KPIs für das Dashboard.
 */
export const AdapterKpiDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  unit: z.enum(['per_day', 'per_week', 'per_month', 'total']),
  icon: z.string(),   // Lucide Icon Name
  color: z.string(),  // Tailwind Color Name
});
export type AdapterKpiDefinition = z.infer<typeof AdapterKpiDefinitionSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interface für Vertical-Adapter.
 * 
 * Jeder Adapter implementiert diese Schnittstelle:
 * - Network Marketing: Rang → Volumen → Kunden/Partner
 * - Immobilien: Provision → Deals → Leads
 * - Coaching: MRR → Klienten → Discovery Calls
 */
export interface IVerticalAdapter {
  /** Eindeutige ID der Branche */
  readonly verticalId: string;
  
  /** Anzeigename der Branche */
  getLabel(): string;
  
  /** Berechnet Goal Breakdown */
  computeGoalBreakdown(goalInput: GoalInput): GoalBreakdown;
  
  /** Standard-Conversion-Rates */
  getDefaultConversionConfig(): DailyFlowConversionConfig;
  
  /** KPIs für Dashboard */
  getKpiDefinitions(): AdapterKpiDefinition[];
  
  /** Berechnet Daily/Weekly Targets aus Breakdown */
  computeFlowTargets(breakdown: GoalBreakdown, config?: DailyFlowConversionConfig): FlowTargets;
  
  /** Formatiert Breakdown als Text */
  formatBreakdownSummary(breakdown: GoalBreakdown): string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_CONVERSION_CONFIG: DailyFlowConversionConfig = {
  working_days_per_week: 5,
  contact_to_primary_unit: 0.20,
  contact_to_secondary_unit: 0.05,
  followups_per_primary: 3,
  followups_per_secondary: 5,
  reactivation_share: 0.20,
};

