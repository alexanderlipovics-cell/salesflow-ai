/**
 * COMPENSATION API SERVICE
 * 
 * API-Calls für Compensation Plan Berechnungen
 */

import { api } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface TeamMemberInput {
  id: string;
  name: string;
  rank: string;
  personal_volume: number;
  group_volume?: number;
  is_active?: boolean;
  sponsor_id?: string;
}

export interface CalculateCommissionRequest {
  company_id: string;
  user: TeamMemberInput;
  team: TeamMemberInput[];
  period_start?: string;
  period_end?: string;
}

export interface CommissionItem {
  type: string;
  amount: number;
  description: string;
  volume?: number;
  rate?: number;
  level?: number;
  source_member?: string;
}

export interface CommissionResponse {
  user_id: string;
  company_id: string;
  rank: string;
  period_start: string;
  period_end: string;
  personal_volume: number;
  group_volume: number;
  total_volume: number;
  total_earnings: number;
  commissions: CommissionItem[];
  summary: {
    by_type: Record<string, number>;
    by_level: Record<string, number>;
    total_commissions: number;
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Berechnet Provisionen für einen User
 */
export async function calculateCommissions(
  request: CalculateCommissionRequest
): Promise<CommissionResponse> {
  return api.post<CommissionResponse>('/compensation/calculate', request);
}

/**
 * Holt alle verfügbaren Compensation Plans
 */
export async function getAvailablePlans() {
  return api.get('/compensation/plans');
}

/**
 * Holt Details zu einem spezifischen Plan
 */
export async function getPlanDetails(companyId: string) {
  return api.get(`/compensation/plans/${companyId}`);
}

/**
 * Bestimmt den Rang eines Users
 */
export async function determineRank(request: CalculateCommissionRequest) {
  return api.post('/compensation/rank/determine', request);
}

/**
 * Holt Rang-Anforderungen für einen Plan
 */
export async function getRankRequirements(companyId: string) {
  return api.get(`/compensation/plans/${companyId}/ranks`);
}

