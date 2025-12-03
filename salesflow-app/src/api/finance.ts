/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  FINANCE API                                                               ║
 * ║  API Functions für Provisionen, Earnings & Compensation                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export interface CommissionEntry {
  id: string;
  type: 'sale' | 'bonus' | 'override' | 'rank_bonus';
  amount: number;
  currency: string;
  source: string;
  source_id: string | null;
  description: string;
  status: 'pending' | 'approved' | 'paid';
  month: string; // YYYY-MM
  created_at: string;
}

export interface MonthlyEarnings {
  month: string;
  personal_sales: number;
  team_bonus: number;
  rank_bonus: number;
  total: number;
  currency: string;
  vs_previous_month: number;
  status: 'in_progress' | 'closed' | 'paid';
}

export interface RankProgress {
  current_rank: string;
  current_rank_title: string;
  next_rank: string | null;
  next_rank_title: string | null;
  progress_percent: number;
  requirements: Array<{
    name: string;
    current: number;
    target: number;
    met: boolean;
  }>;
  estimated_earnings_increase: number | null;
}

export interface FinanceOverview {
  current_month: MonthlyEarnings;
  previous_month: MonthlyEarnings;
  ytd_total: number;
  pending_commissions: number;
  rank_progress: RankProgress;
  next_payout_date: string | null;
  next_payout_amount: number;
}

export interface TeamEarnings {
  member_id: string;
  member_name: string;
  level: number;
  personal_volume: number;
  team_volume: number;
  your_override: number;
}

export interface GoalProgress {
  goal_id: string;
  goal_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  target_amount: number;
  current_amount: number;
  progress_percent: number;
  deadline: string;
  on_track: boolean;
  projected_outcome: number;
}

// =============================================================================
// HELPER
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// OVERVIEW
// =============================================================================

/**
 * Holt Finance-Übersicht.
 */
export async function getOverview(): Promise<FinanceOverview> {
  return apiRequest<FinanceOverview>('/finance/overview');
}

// =============================================================================
// COMMISSIONS
// =============================================================================

/**
 * Holt Provisionen.
 */
export async function getCommissions(options: {
  month?: string;
  type?: 'sale' | 'bonus' | 'override' | 'rank_bonus';
  status?: 'pending' | 'approved' | 'paid';
  limit?: number;
  offset?: number;
} = {}): Promise<{
  commissions: CommissionEntry[];
  total: number;
  total_amount: number;
}> {
  const params = new URLSearchParams();
  if (options.month) params.append('month', options.month);
  if (options.type) params.append('type', options.type);
  if (options.status) params.append('status', options.status);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  
  const queryString = params.toString();
  return apiRequest(`/finance/commissions${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// MONTHLY EARNINGS
// =============================================================================

/**
 * Holt monatliche Earnings.
 */
export async function getMonthlyEarnings(options: {
  months?: number;
  startMonth?: string;
} = {}): Promise<MonthlyEarnings[]> {
  const params = new URLSearchParams();
  if (options.months) params.append('months', options.months.toString());
  if (options.startMonth) params.append('start_month', options.startMonth);
  
  const queryString = params.toString();
  return apiRequest<MonthlyEarnings[]>(`/finance/earnings/monthly${queryString ? `?${queryString}` : ''}`);
}

/**
 * Holt Earnings für einen bestimmten Monat.
 */
export async function getEarningsForMonth(month: string): Promise<MonthlyEarnings> {
  return apiRequest<MonthlyEarnings>(`/finance/earnings/${month}`);
}

// =============================================================================
// RANK
// =============================================================================

/**
 * Holt Rank-Fortschritt.
 */
export async function getRankProgress(): Promise<RankProgress> {
  return apiRequest<RankProgress>('/finance/rank');
}

// =============================================================================
// TEAM EARNINGS
// =============================================================================

/**
 * Holt Team-Earnings (Downline Override).
 */
export async function getTeamEarnings(options: {
  month?: string;
  level?: number;
} = {}): Promise<{
  team_members: TeamEarnings[];
  total_team_volume: number;
  total_override: number;
}> {
  const params = new URLSearchParams();
  if (options.month) params.append('month', options.month);
  if (options.level) params.append('level', options.level.toString());
  
  const queryString = params.toString();
  return apiRequest(`/finance/team${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// GOALS
// =============================================================================

/**
 * Holt Finanz-Ziele.
 */
export async function getGoals(): Promise<GoalProgress[]> {
  return apiRequest<GoalProgress[]>('/finance/goals');
}

/**
 * Erstellt ein Finanz-Ziel.
 */
export async function createGoal(goal: {
  goal_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  target_amount: number;
  deadline?: string;
  description?: string;
}): Promise<GoalProgress> {
  return apiRequest<GoalProgress>('/finance/goals', {
    method: 'POST',
    body: JSON.stringify(goal),
  });
}

/**
 * Updated ein Finanz-Ziel.
 */
export async function updateGoal(
  goalId: string,
  update: Partial<{
    target_amount: number;
    deadline: string;
    description: string;
  }>
): Promise<GoalProgress> {
  return apiRequest<GoalProgress>(`/finance/goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}

// =============================================================================
// PROJECTIONS
// =============================================================================

/**
 * Holt Earnings-Projektion.
 */
export async function getProjection(months: number = 3): Promise<{
  projections: Array<{
    month: string;
    projected_personal: number;
    projected_team: number;
    projected_total: number;
    confidence: number;
  }>;
  assumptions: string[];
}> {
  return apiRequest(`/finance/projection?months=${months}`);
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const financeApi = {
  // Overview
  getOverview,
  
  // Commissions
  getCommissions,
  
  // Monthly Earnings
  getMonthlyEarnings,
  getEarningsForMonth,
  
  // Rank
  getRankProgress,
  
  // Team
  getTeamEarnings,
  
  // Goals
  getGoals,
  createGoal,
  updateGoal,
  
  // Projections
  getProjection,
};

export default financeApi;

