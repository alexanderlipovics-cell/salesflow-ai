/**
 * GENEALOGY API SERVICE
 * 
 * API-Calls für Genealogy Tree & Downline-Struktur
 */

import { api } from '../lib/api';

// ============================================
// TYPES
// ============================================

export interface DownlineMember {
  id: string;
  user_id: string;
  name?: string;
  rank?: string;
  monthly_pv: number;
  monthly_gv: number;
  total_downline_count: number;
  active_downline_count: number;
  is_active: boolean;
  level: number;
  sponsor_id?: string;
  children: DownlineMember[];
}

export interface DownlineTreeResponse {
  user_id: string;
  company_name: string;
  root: DownlineMember;
  total_members: number;
  total_levels: number;
  total_volume: number;
}

export interface DownlineStats {
  total_downline_count: number;
  active_downline_count: number;
  monthly_pv: number;
  monthly_gv: number;
  rank?: string;
  is_active: boolean;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Holt die komplette Downline-Struktur als Tree
 */
export async function getDownlineTree(
  userId: string,
  companyName?: string,
  maxLevels: number = 5
): Promise<DownlineTreeResponse> {
  const params: Record<string, string | number> = { max_levels: maxLevels };
  if (companyName) {
    params.company_name = companyName;
  }
  
  return api.get<DownlineTreeResponse>(
    `/genealogy/downline/${userId}`,
    { query: params }
  );
}

/**
 * Holt Downline als flache Liste (für Tabellen)
 */
export async function getDownlineFlat(
  userId: string,
  companyName?: string,
  maxLevels: number = 5
) {
  const params: Record<string, string | number> = { max_levels: maxLevels };
  if (companyName) {
    params.company_name = companyName;
  }
  
  return api.get(`/genealogy/downline/${userId}/flat`, { query: params });
}

/**
 * Holt Statistiken zur Downline
 */
export async function getDownlineStats(
  userId: string,
  companyName?: string
): Promise<{ user_id: string; company_name: string; stats: DownlineStats }> {
  const params: Record<string, string> = {};
  if (companyName) {
    params.company_name = companyName;
  }
  
  return api.get(`/genealogy/stats/${userId}`, { query: params });
}

