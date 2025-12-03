/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  GOAL API CLIENT                                                           ║
 * ║  HTTP Client für Goal Engine Backend                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import {
  GoalCalculateRequest,
  GoalCalculateResponse,
  GoalSaveRequest,
  GoalSaveResponse,
  DailyTargetsResponse,
  CompanyListResponse,
  RankListResponse,
} from './types/goals';

// ============================================
// CONFIG
// ============================================

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

// ============================================
// HTTP CLIENT
// ============================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }
  
  return response.json();
}

// ============================================
// GOAL API
// ============================================

export const goalApi = {
  /**
   * Berechne Goal Targets
   */
  calculate: async (request: GoalCalculateRequest): Promise<GoalCalculateResponse> => {
    return apiRequest<GoalCalculateResponse>('/goals/calculate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
  
  /**
   * Speichere ein Ziel
   */
  save: async (request: GoalSaveRequest): Promise<GoalSaveResponse> => {
    return apiRequest<GoalSaveResponse>('/goals/save', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
  
  /**
   * Hole Daily Targets des Users
   */
  getDailyTargets: async (): Promise<DailyTargetsResponse> => {
    return apiRequest<DailyTargetsResponse>('/goals/daily-targets');
  },
  
  /**
   * Markiere Ziel als erreicht
   */
  markAchieved: async (goalId: string): Promise<{ success: boolean }> => {
    return apiRequest(`/goals/${goalId}/achieved`, {
      method: 'POST',
    });
  },
};

// ============================================
// COMPENSATION API
// ============================================

export const compensationApi = {
  /**
   * Liste aller Firmen
   */
  getCompanies: async (region: string = 'DE'): Promise<CompanyListResponse> => {
    return apiRequest<CompanyListResponse>(`/compensation/companies?region=${region}`);
  },
  
  /**
   * Hole Ränge für eine Firma
   */
  getRanks: async (companyId: string, region: string = 'DE'): Promise<RankListResponse> => {
    return apiRequest<RankListResponse>(`/compensation/plans/${companyId}/ranks?region=${region}`);
  },
  
  /**
   * Finde Rang nach Einkommen
   */
  findRank: async (companyId: string, targetIncome: number): Promise<any> => {
    return apiRequest('/compensation/find-rank', {
      method: 'POST',
      body: JSON.stringify({
        company_id: companyId,
        target_income: targetIncome,
      }),
    });
  },
};

// ============================================
// COMBINED EXPORT
// ============================================

export default {
  goals: goalApi,
  compensation: compensationApi,
};

