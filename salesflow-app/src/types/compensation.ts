/**
 * COMPENSATION PLAN & GOAL ENGINE - Type Definitions
 * 
 * Zod Schemas + TypeScript Types für:
 * - Compensation Plans (Zinzino, PM, LR, etc.)
 * - User Goals (Income/Rank-basiert)
 * - Daily Flow Targets
 * - Goal Calculation Engine
 */

import { z } from 'zod';

// ============================================
// PLAN STRUCTURE ENUMS
// ============================================

export const PlanUnitSchema = z.enum(['credits', 'pv', 'points', 'volume']);
export type PlanUnit = z.infer<typeof PlanUnitSchema>;

export const PlanTypeSchema = z.enum(['unilevel', 'binary', 'matrix', 'hybrid']);
export type PlanType = z.infer<typeof PlanTypeSchema>;

export const RegionSchema = z.enum(['DE', 'AT', 'CH', 'EU', 'GLOBAL']);
export type Region = z.infer<typeof RegionSchema>;

// ============================================
// RANK DEFINITION
// ============================================

export const RankRequirementSchema = z.object({
  min_personal_volume: z.number().optional(),
  min_group_volume: z.number().optional(),
  min_legs: z.number().optional(),
  leg_volume_requirements: z.object({
    legs_required: z.number(),
    min_volume_per_leg: z.number(),
  }).optional(),
});
export type RankRequirement = z.infer<typeof RankRequirementSchema>;

export const RankEarningEstimateSchema = z.object({
  avg_monthly_income: z.number(),
  range: z.tuple([z.number(), z.number()]).optional(),
});
export type RankEarningEstimate = z.infer<typeof RankEarningEstimateSchema>;

export const RankDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int(),
  unit: PlanUnitSchema,
  requirements: RankRequirementSchema,
  earning_estimate: RankEarningEstimateSchema.optional(),
});
export type RankDefinition = z.infer<typeof RankDefinitionSchema>;

// ============================================
// COMPENSATION PLAN
// ============================================

export const CompensationPlanSchema = z.object({
  company_id: z.string(),
  company_name: z.string(),
  company_logo: z.string().optional(),
  region: RegionSchema,
  plan_type: PlanTypeSchema,
  
  unit_label: z.string(),
  unit_code: PlanUnitSchema,
  currency: z.string().default('EUR'),
  
  ranks: z.array(RankDefinitionSchema),
  
  // Durchschnittswerte für Berechnungen
  avg_personal_volume_per_customer: z.number().optional(),
  avg_personal_volume_per_partner: z.number().optional(),
  
  // Meta
  version: z.number().default(1),
  last_updated: z.string().optional(),
  disclaimer: z.string().optional(),
});
export type CompensationPlan = z.infer<typeof CompensationPlanSchema>;

// ============================================
// GOAL TYPES
// ============================================

export const GoalTypeSchema = z.enum(['income', 'rank']);
export type GoalType = z.infer<typeof GoalTypeSchema>;

export const GoalStatusSchema = z.enum(['active', 'achieved', 'paused', 'cancelled']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const UserGoalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  company_id: z.string(),
  goal_type: GoalTypeSchema,
  target_monthly_income: z.number().nullable(),
  target_rank_id: z.string().nullable(),
  target_rank_name: z.string().nullable(),
  timeframe_months: z.number().int().positive(),
  start_date: z.string(),
  end_date: z.string(),
  calculated_group_volume: z.number().nullable(),
  calculated_customers: z.number().int().nullable(),
  calculated_partners: z.number().int().nullable(),
  status: GoalStatusSchema,
  achieved_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});
export type UserGoal = z.infer<typeof UserGoalSchema>;

// ============================================
// DAILY FLOW CONFIG
// ============================================

export const DailyFlowConfigSchema = z.object({
  working_days_per_week: z.number().int().min(1).max(7).default(5),
  contact_to_customer_rate: z.number().min(0).max(1).default(0.2),
  contact_to_partner_rate: z.number().min(0).max(1).default(0.05),
  followups_per_customer: z.number().default(3),
  followups_per_partner: z.number().default(5),
  reactivation_share: z.number().min(0).max(1).default(0.2),
});
export type DailyFlowConfig = z.infer<typeof DailyFlowConfigSchema>;

// ============================================
// DAILY FLOW TARGETS
// ============================================

export const WeeklyTargetsSchema = z.object({
  new_customers: z.number(),
  new_partners: z.number(),
  new_contacts: z.number(),
  followups: z.number(),
  reactivations: z.number(),
});
export type WeeklyTargets = z.infer<typeof WeeklyTargetsSchema>;

export const DailyTargetsSchema = z.object({
  new_contacts: z.number(),
  followups: z.number(),
  reactivations: z.number(),
});
export type DailyTargets = z.infer<typeof DailyTargetsSchema>;

export const DailyFlowTargetsSchema = z.object({
  weekly: WeeklyTargetsSchema,
  daily: DailyTargetsSchema,
});
export type DailyFlowTargets = z.infer<typeof DailyFlowTargetsSchema>;

// ============================================
// GOAL CALCULATION
// ============================================

export interface GoalCalculationInput {
  plan: CompensationPlan;
  goal_type: GoalType;
  target_monthly_income?: number;
  target_rank_id?: string;
  timeframe_months: number;
  current_group_volume?: number;
  config: DailyFlowConfig;
}

export interface GoalCalculationResult {
  target_rank: RankDefinition;
  required_group_volume: number;
  missing_group_volume: number;
  estimated_customers: number;
  estimated_partners: number;
  per_month_volume: number;
  per_week_volume: number;
  per_day_volume: number;
  daily_targets: DailyFlowTargets;
}

// ============================================
// DATABASE TYPES (für Supabase)
// ============================================

export interface UserCompanySelectionDB {
  id: string;
  user_id: string;
  workspace_id: string;
  company_id: string;
  company_name: string;
  region: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserGoalDB {
  id: string;
  user_id: string;
  workspace_id: string;
  company_id: string;
  goal_type: GoalType;
  target_monthly_income: number | null;
  target_rank_id: string | null;
  target_rank_name: string | null;
  timeframe_months: number;
  start_date: string;
  end_date: string;
  calculated_group_volume: number | null;
  calculated_customers: number | null;
  calculated_partners: number | null;
  status: GoalStatus;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDailyFlowTargetsDB {
  id: string;
  user_id: string;
  workspace_id: string;
  goal_id: string | null;
  company_id: string;
  weekly_new_customers: number;
  weekly_new_partners: number;
  weekly_new_contacts: number;
  weekly_followups: number;
  weekly_reactivations: number;
  daily_new_contacts: number;
  daily_followups: number;
  daily_reactivations: number;
  config: DailyFlowConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// WIZARD TYPES
// ============================================

export type WizardStep = 1 | 2 | 3;

export interface CompanyOption {
  id: string;
  name: string;
  logo: string;
}

export interface GoalWizardState {
  step: WizardStep;
  companyId: string | null;
  goalType: GoalType;
  targetIncome: number;
  targetRankId: string | null;
  timeframeMonths: number;
  result: GoalCalculationResult | null;
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_DAILY_FLOW_CONFIG: DailyFlowConfig = {
  working_days_per_week: 5,
  contact_to_customer_rate: 0.2,    // 20% werden Kunde
  contact_to_partner_rate: 0.05,    // 5% werden Partner
  followups_per_customer: 3,
  followups_per_partner: 5,
  reactivation_share: 0.2,          // 20% für Reaktivierung
};

export const MIN_TIMEFRAME_MONTHS = 3;
export const MAX_TIMEFRAME_MONTHS = 24;
export const DEFAULT_TIMEFRAME_MONTHS = 6;

export const MIN_TARGET_INCOME = 500;
export const MAX_TARGET_INCOME = 50000;
export const DEFAULT_TARGET_INCOME = 2000;

export const DISCLAIMER_TEXT = `
⚠️ Hinweis: Alle Angaben sind unverbindliche Beispielrechnungen und keine Verdienstgarantie.
Dein tatsächliches Einkommen hängt von deiner eigenen Leistung, deinem Team
und den offiziellen Richtlinien deiner Firma ab.
`.trim();

export const INCOME_DISCLAIMER = 
  'Durchschnittswerte basierend auf öffentlichen Daten. Keine Garantie auf Erreichung.';

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateCompensationPlan(plan: unknown): CompensationPlan {
  return CompensationPlanSchema.parse(plan);
}

export function validateUserGoal(goal: unknown): UserGoal {
  return UserGoalSchema.parse(goal);
}

export function validateDailyFlowConfig(config: unknown): DailyFlowConfig {
  return DailyFlowConfigSchema.parse(config);
}

// ============================================
// TYPE GUARDS
// ============================================

export function isValidGoalType(value: string): value is GoalType {
  return value === 'income' || value === 'rank';
}

export function isValidGoalStatus(value: string): value is GoalStatus {
  return ['active', 'achieved', 'paused', 'cancelled'].includes(value);
}

export function isValidPlanUnit(value: string): value is PlanUnit {
  return ['credits', 'pv', 'points', 'volume'].includes(value);
}

