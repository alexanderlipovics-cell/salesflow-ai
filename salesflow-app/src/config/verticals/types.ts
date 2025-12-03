/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL CONFIG TYPES                                    ║
 * ║  Type-Definitionen für Multi-Vertical Support                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL ID ENUM
// ═══════════════════════════════════════════════════════════════════════════

export const VerticalIdSchema = z.enum([
  'network_marketing',
  'real_estate',
  'coaching',
  'finance',
  'insurance',
  'solar',
  'custom',
]);
export type VerticalId = z.infer<typeof VerticalIdSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// COMMISSION MODEL
// ═══════════════════════════════════════════════════════════════════════════

export const CommissionModelSchema = z.enum([
  'mlm_rank',        // Network Marketing: Rang-basiert
  'per_deal',        // Makler: Pro Abschluss
  'recurring',       // Coaching: Laufende Einnahmen
  'hybrid',          // Mix aus mehreren
  'salary_plus',     // Fixum + Variable
]);
export type CommissionModel = z.infer<typeof CommissionModelSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// KPI DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

export const KpiDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string(),
  unit: z.string().optional(),
  description: z.string().optional(),
});
export type KpiDefinition = z.infer<typeof KpiDefinitionSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY TYPE DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

export const VerticalActivityTypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string(),
  color: z.string(),
  maps_to_daily_flow: z.enum(['new_contacts', 'followups', 'reactivations']).nullable(),
  description: z.string().optional(),
});
export type VerticalActivityType = z.infer<typeof VerticalActivityTypeSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// GOAL TYPE DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

export const VerticalGoalTypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string(),
  unit: z.string(),
  description: z.string().optional(),
});
export type VerticalGoalType = z.infer<typeof VerticalGoalTypeSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// OBJECTION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

export const ObjectionContextSchema = z.object({
  typical_objections: z.array(z.string()),
  tone: z.string(),
  product_type: z.string(),
  decision_maker: z.string(),
  sales_cycle: z.string(),
  price_range: z.string().optional(),
});
export type ObjectionContext = z.infer<typeof ObjectionContextSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// VERTICAL CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const VerticalConfigSchema = z.object({
  // Identifikation
  id: VerticalIdSchema,
  label: z.string(),
  icon: z.string(),
  color: z.string(),
  description: z.string(),
  
  // Geschäftsmodell
  commission_model: CommissionModelSchema,
  has_compensation_plan: z.boolean(),
  has_team_structure: z.boolean(),
  
  // KPIs & Metriken
  kpis: z.array(KpiDefinitionSchema),
  primary_kpi: z.string(),
  
  // Aktivitätstypen
  activity_types: z.array(VerticalActivityTypeSchema),
  
  // Zieltypen
  goal_types: z.array(VerticalGoalTypeSchema),
  
  // Objection Brain Kontext
  objection_context: ObjectionContextSchema,
  
  // Daily Flow Defaults
  daily_flow_defaults: z.object({
    new_contacts: z.number(),
    followups: z.number(),
    reactivations: z.number(),
  }),
  
  // Playbook Templates
  playbook_categories: z.array(z.string()),
  
  // Feature Flags
  features: z.object({
    lead_scoring: z.boolean(),
    proposal_reminders: z.boolean(),
    team_dashboard: z.boolean(),
    finance_tracking: z.boolean(),
  }),
});
export type VerticalConfig = z.infer<typeof VerticalConfigSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// USER VERTICAL SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const UserVerticalSettingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  vertical_id: VerticalIdSchema,
  company_id: z.string().nullable(),
  custom_label: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type UserVerticalSettings = z.infer<typeof UserVerticalSettingsSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface VerticalSelectorOption {
  id: VerticalId;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface VerticalContextForChief {
  vertical: VerticalConfig;
  user_settings: UserVerticalSettings | null;
  formatted_context: string;
}

