// src/domain/goals/types.ts

/**
 * Core Goal Types - Frontend Mirror der Backend-Typen
 * 
 * Diese Types sind identisch mit dem Backend für Type Safety.
 */

export type VerticalId = 
  | "network_marketing"
  | "real_estate"
  | "finance"
  | "coaching"
  | "b2b_saas"
  | "insurance"
  | "generic";

export type GoalKind = 
  | "income"
  | "rank"
  | "deals"
  | "volume"
  | "clients";

export interface GoalInput {
  verticalId: VerticalId;
  goalKind: GoalKind;
  targetValue: number;
  timeframeMonths: number;
  verticalMeta?: Record<string, unknown>;
}

export interface GoalBreakdown {
  verticalId: VerticalId;
  goalKind: GoalKind;
  timeframeMonths: number;
  
  primaryUnits: number;
  secondaryUnits?: number | null;
  
  requiredVolume?: number | null;
  perMonthVolume: number;
  perWeekVolume: number;
  perDayVolume: number;
  
  verticalDetails?: Record<string, unknown>;
  notes?: string | null;
}

export interface DailyFlowConfig {
  workingDaysPerWeek: number;
  contactToPrimaryUnit: number;
  contactToSecondaryUnit?: number | null;
  followupsPerPrimary: number;
  followupsPerSecondary?: number | null;
  reactivationShare: number;
}

export interface DailyFlowTargets {
  userId: string;
  companyId: string;
  verticalId: VerticalId;
  
  newContacts: number;
  followups: number;
  reactivations: number;
  
  customTargets?: Record<string, number>;
}

export interface KpiDefinition {
  id: string;
  label: string;
  description?: string | null;
  unit: "per_day" | "per_week" | "per_month";
  icon?: string | null;
  color?: string | null;
}

// ============================================================
// Daily Flow Status Types
// ============================================================

export interface ProgressItem {
  target: number;
  done: number;
  remaining: number;
  percent: number;
}

export interface DailyFlowStatus {
  date: string;
  newContacts: ProgressItem;
  followups: ProgressItem;
  reactivations: ProgressItem;
  overallPercent: number;
  isOnTrack: boolean;
}

// ============================================================
// Vertical Types
// ============================================================

export interface VerticalInfo {
  id: VerticalId;
  label: string;
  kpis: KpiDefinition[];
}

// ============================================================
// Compensation Plan Types (MLM-specific)
// ============================================================

export interface RankDefinition {
  id: string;
  name: string;
  requiredVolume: number;
  avgIncome: number;
  requirements?: Record<string, unknown>;
}

export interface CompensationPlan {
  id: string;
  verticalId: string;
  displayName: string;
  currency: string;
  ranks: RankDefinition[];
  avgVolumePerCustomer: number;
  customerToPartnerRatio: number;
  notes?: string;
  officialUrl?: string | null;
}

export interface CompensationPlanOption {
  id: string;
  label: string;
  currency: string;
}

// ============================================================
// Default Configs
// ============================================================

export const DEFAULT_DAILY_FLOW_CONFIG: DailyFlowConfig = {
  workingDaysPerWeek: 5,
  contactToPrimaryUnit: 0.20,
  contactToSecondaryUnit: 0.05,
  followupsPerPrimary: 3,
  followupsPerSecondary: 5,
  reactivationShare: 0.20,
};

// ============================================================
// Helper Functions
// ============================================================

export function calculateGoalProgress(
  current: number,
  target: number
): { current: number; target: number; percent: number; remaining: number; isAchieved: boolean } {
  const remaining = Math.max(0, target - current);
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  
  return {
    current,
    target,
    percent: Math.round(percent * 10) / 10,
    remaining,
    isAchieved: remaining === 0,
  };
}

export function calculateTimeRemaining(
  endDate: Date | string
): { days: number; weeks: number; months: number; isExpired: boolean } {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    days: Math.max(0, diffDays),
    weeks: Math.max(0, Math.ceil(diffDays / 7)),
    months: Math.max(0, Math.ceil(diffDays / 30)),
    isExpired: diffDays <= 0,
  };
}
