/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  GOAL API TYPES                                                            ║
 * ║  TypeScript Types für Goal Engine API                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================
// ENUMS
// ============================================

export type GoalType = 'income' | 'rank';
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'cancelled';

// ============================================
// CONFIG
// ============================================

export interface DailyFlowConfig {
  working_days_per_week: number;
  contact_to_customer_rate: number;
  contact_to_partner_rate: number;
  followups_per_customer: number;
  followups_per_partner: number;
  reactivation_share: number;
}

export const DEFAULT_DAILY_FLOW_CONFIG: DailyFlowConfig = {
  working_days_per_week: 5,
  contact_to_customer_rate: 0.2,
  contact_to_partner_rate: 0.05,
  followups_per_customer: 3,
  followups_per_partner: 5,
  reactivation_share: 0.2,
};

// ============================================
// REQUEST TYPES
// ============================================

export interface GoalCalculateRequest {
  company_id: string;
  region?: string;
  goal_type: GoalType;
  target_monthly_income?: number;
  target_rank_id?: string;
  timeframe_months: number;
  current_group_volume?: number;
  config?: DailyFlowConfig;
}

export interface GoalSaveRequest {
  company_id: string;
  goal_type: GoalType;
  target_monthly_income?: number;
  target_rank_id?: string;
  target_rank_name?: string;
  timeframe_months: number;
  calculated_group_volume?: number;
  calculated_customers?: number;
  calculated_partners?: number;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface GoalCalculateResponse {
  success: boolean;
  
  // Target
  target_rank_id: string;
  target_rank_name: string;
  company_id: string;
  company_name: string;
  
  // Volume
  required_group_volume: number;
  missing_group_volume: number;
  
  // Estimates
  estimated_customers: number;
  estimated_partners: number;
  
  // Time distribution
  per_month_volume: number;
  per_week_volume: number;
  per_day_volume: number;
  timeframe_months: number;
  
  // Daily targets
  weekly_new_contacts: number;
  weekly_followups: number;
  weekly_reactivations: number;
  daily_new_contacts: number;
  daily_followups: number;
  daily_reactivations: number;
  
  // Text
  summary_text: string;
  disclaimer: string;
}

export interface GoalSaveResponse {
  success: boolean;
  goal_id?: string;
  message: string;
  error?: string;
}

export interface DailyTargetsResponse {
  has_goal: boolean;
  
  // Goal info
  company_id?: string;
  company_name?: string;
  target_rank_name?: string;
  target_monthly_income?: number;
  
  // Progress
  days_remaining?: number;
  progress_percent?: number;
  
  // Daily targets
  daily_new_contacts: number;
  daily_followups: number;
  daily_reactivations: number;
  
  // Weekly targets
  weekly_new_contacts: number;
  weekly_followups: number;
}

// ============================================
// COMPANY & RANK TYPES
// ============================================

export interface CompanyInfo {
  id: string;
  name: string;
  logo: string;
  region: string;
}

export interface CompanyListResponse {
  companies: CompanyInfo[];
  count: number;
}

export interface RankInfo {
  id: string;
  name: string;
  order: number;
  min_group_volume?: number;
  avg_monthly_income?: number;
  income_range?: [number, number];
}

export interface RankListResponse {
  company_id: string;
  company_name: string;
  ranks: RankInfo[];
  count: number;
}

// ============================================
// GOAL SUMMARY
// ============================================

export interface GoalSummary {
  goal_id: string;
  company_id: string;
  goal_type: GoalType;
  target_monthly_income?: number;
  target_rank_name?: string;
  timeframe_months: number;
  start_date: string;
  end_date: string;
  days_remaining: number;
  progress_percent: number;
  status: GoalStatus;
  
  daily_new_contacts: number;
  daily_followups: number;
  daily_reactivations: number;
}

