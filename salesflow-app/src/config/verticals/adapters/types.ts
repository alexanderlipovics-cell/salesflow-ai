/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  VERTICAL ADAPTER SYSTEM - Type Definitions                               ║
 * ║  Types für Goal Breakdown & Adapter Logic                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import { VerticalId, KpiDefinition } from '../types';
import { DailyFlowConfig, CompensationPlan, RankDefinition } from '../../../types/compensation';

// ═══════════════════════════════════════════════════════════════════════════
// GOAL KIND ENUM
// ═══════════════════════════════════════════════════════════════════════════

export const GoalKindSchema = z.enum([
  'income',     // Einkommensziel (z.B. 2.000€/Monat)
  'rank',       // Rangziel (z.B. "Team Leader")
  'volume',     // Volumenziel (z.B. 10.000 Credits)
  'clients',    // Kundenziel (z.B. 50 Kunden)
  'deals',      // Deal-Ziel (z.B. 10 Abschlüsse/Monat)
]);
export type GoalKind = z.infer<typeof GoalKindSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// GOAL INPUT
// ═══════════════════════════════════════════════════════════════════════════

export const GoalInputSchema = z.object({
  /** Art des Ziels */
  goal_kind: GoalKindSchema,
  
  /** Zielwert (Betrag, Rang-Index, Volumen, etc.) */
  target_value: z.number(),
  
  /** Zeitraum in Monaten */
  timeframe_months: z.number().int().positive(),
  
  /** Vertical-spezifische Metadaten */
  vertical_meta: z.record(z.any()).optional().default({}),
  
  /** Aktueller Stand (optional) */
  current_value: z.number().optional(),
});
export type GoalInput = z.infer<typeof GoalInputSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// GOAL BREAKDOWN
// ═══════════════════════════════════════════════════════════════════════════

export const GoalBreakdownSchema = z.object({
  /** Vertical ID */
  vertical_id: z.string(),
  
  /** Art des Ziels */
  goal_kind: GoalKindSchema,
  
  /** Zeitraum in Monaten */
  timeframe_months: z.number(),
  
  /** Primäre Einheiten (z.B. Kunden, Deals) */
  primary_units: z.number(),
  
  /** Sekundäre Einheiten (z.B. Partner, Leads) */
  secondary_units: z.number(),
  
  /** Benötigtes Volumen/Umsatz */
  required_volume: z.number(),
  
  /** Volumen pro Monat */
  per_month_volume: z.number(),
  
  /** Volumen pro Woche */
  per_week_volume: z.number(),
  
  /** Volumen pro Tag */
  per_day_volume: z.number(),
  
  /** Vertical-spezifische Details */
  vertical_details: z.record(z.any()).optional().default({}),
  
  /** Notizen/Erklärungen */
  notes: z.string().optional(),
});
export type GoalBreakdown = z.infer<typeof GoalBreakdownSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// DAILY FLOW CONFIG (erweitert)
// ═══════════════════════════════════════════════════════════════════════════

export const VerticalDailyFlowConfigSchema = z.object({
  /** Arbeitstage pro Woche */
  working_days_per_week: z.number().int().min(1).max(7).default(5),
  
  /** Conversion: Kontakt → Primäre Einheit (Kunde) */
  contact_to_primary_unit: z.number().min(0).max(1).default(0.2),
  
  /** Conversion: Kontakt → Sekundäre Einheit (Partner) */
  contact_to_secondary_unit: z.number().min(0).max(1).default(0.05),
  
  /** Follow-ups pro primärer Einheit */
  followups_per_primary: z.number().default(3),
  
  /** Follow-ups pro sekundärer Einheit */
  followups_per_secondary: z.number().default(5),
  
  /** Anteil Reaktivierungen */
  reactivation_share: z.number().min(0).max(1).default(0.2),
});
export type VerticalDailyFlowConfig = z.infer<typeof VerticalDailyFlowConfigSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// KPI DEFINITION (erweitert für Adapter)
// ═══════════════════════════════════════════════════════════════════════════

export const AdapterKpiDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  unit: z.enum(['per_day', 'per_week', 'per_month', 'total', 'currency']),
  icon: z.string(),
  color: z.string(),
});
export type AdapterKpiDefinition = z.infer<typeof AdapterKpiDefinitionSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// COMPENSATION PLAN REFERENCE (für Adapter)
// ═══════════════════════════════════════════════════════════════════════════

export interface CompPlanReference {
  id: string;
  display_name: string;
  ranks: RankInfo[];
  avg_volume_per_customer: number;
  customer_to_partner_ratio: number;
}

export interface RankInfo {
  id: string;
  name: string;
  order: number;
  required_volume: number;
  avg_income: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AdapterCalculationContext {
  goal_input: GoalInput;
  compensation_plan?: CompensationPlan;
  user_settings?: Record<string, unknown>;
}

export interface AdapterCalculationResult {
  breakdown: GoalBreakdown;
  daily_flow_config: VerticalDailyFlowConfig;
  kpis: AdapterKpiDefinition[];
  warnings?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Convert CompensationPlan to CompPlanReference
// ═══════════════════════════════════════════════════════════════════════════

export function toCompPlanReference(plan: CompensationPlan): CompPlanReference {
  return {
    id: plan.company_id,
    display_name: plan.company_name,
    ranks: plan.ranks.map(r => ({
      id: r.id,
      name: r.name,
      order: r.order,
      required_volume: r.requirements.min_group_volume ?? 0,
      avg_income: r.earning_estimate?.avg_monthly_income ?? 0,
    })),
    avg_volume_per_customer: plan.avg_personal_volume_per_customer ?? 60,
    customer_to_partner_ratio: 5, // Default: 5 Kunden pro Partner
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_VERTICAL_DAILY_FLOW_CONFIG: VerticalDailyFlowConfig = {
  working_days_per_week: 5,
  contact_to_primary_unit: 0.20,
  contact_to_secondary_unit: 0.05,
  followups_per_primary: 3,
  followups_per_secondary: 5,
  reactivation_share: 0.20,
};

