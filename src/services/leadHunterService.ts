/**
 * Lead Hunter Service
 * 
 * API Integration für den Lead Hunter.
 * Verbindet Frontend mit Claude's Lead Hunter Backend.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/apiConfig';

// ============================================
// TYPES
// ============================================

export interface HuntedLead {
  id: string;
  name?: string;
  handle?: string;
  platform: string;
  profile_url?: string;
  bio_keywords: string[];
  mlm_signals: string[];
  mlm_signal_strength: 'strong' | 'medium' | 'weak' | 'none';
  hunt_score: number;
  priority: 'hot' | 'warm' | 'cold' | 'nurture';
  source: string;
  suggested_opener?: string;
  reason: string;
  found_at: string;
}

export interface HuntCriteria {
  hashtags: string[];
  bio_keywords: string[];
  locations: string[];
  min_followers: number;
  max_followers: number;
}

export interface HuntResult {
  success: boolean;
  total_found: number;
  leads: HuntedLead[];
  criteria_used: HuntCriteria;
  hunt_duration_ms: number;
  suggestions: string[];
}

export interface DailyHuntQuota {
  user_id: string;
  date: string;
  leads_found: number;
  leads_contacted: number;
  goal: number;
  progress_percent: number;
}

export interface HuntRequest {
  hashtags?: string[];
  bio_keywords?: string[];
  locations?: string[];
  min_followers?: number;
  max_followers?: number;
  limit?: number;
}

// ============================================
// API FUNCTIONS
// ============================================

export async function getDailySuggestions(count: number = 5): Promise<HuntedLead[]> {
  const response = await apiClient.get<HuntedLead[]>(
    API_ENDPOINTS.LEAD_HUNTER.DAILY,
    { params: { count } }
  );
  return response.data;
}

export async function huntLeads(request: HuntRequest): Promise<HuntResult> {
  const response = await apiClient.post<HuntResult>(
    API_ENDPOINTS.LEAD_HUNTER.HUNT,
    {
      hashtags: request.hashtags || ['networkmarketing', 'nebeneinkommen'],
      bio_keywords: request.bio_keywords || ['coach', 'mama', 'business'],
      locations: request.locations || ['deutschland', 'österreich', 'schweiz'],
      min_followers: request.min_followers || 500,
      max_followers: request.max_followers || 50000,
      limit: request.limit || 20,
    }
  );
  return response.data;
}

export async function findLookalikes(
  referenceLeadIds: string[],
  limit: number = 10
): Promise<HuntResult> {
  const response = await apiClient.post<HuntResult>(
    API_ENDPOINTS.LEAD_HUNTER.LOOKALIKES,
    { reference_lead_ids: referenceLeadIds, limit }
  );
  return response.data;
}

export async function getReactivationCandidates(
  daysInactive: number = 30
): Promise<HuntResult> {
  const response = await apiClient.get<HuntResult>(
    API_ENDPOINTS.LEAD_HUNTER.REACTIVATION,
    { params: { days_inactive: daysInactive } }
  );
  return response.data;
}

export async function getDailyQuota(): Promise<DailyHuntQuota> {
  const response = await apiClient.get<DailyHuntQuota>(
    API_ENDPOINTS.LEAD_HUNTER.QUOTA
  );
  return response.data;
}

export async function convertToLead(
  huntedLeadId: string,
  notes?: string,
  tags?: string[]
): Promise<{ success: boolean; lead_id: string; message: string }> {
  const response = await apiClient.post<{ success: boolean; lead_id: string; message: string }>(
    API_ENDPOINTS.LEAD_HUNTER.CONVERT,
    { hunted_lead_id: huntedLeadId, notes, tags }
  );
  return response.data;
}

export async function getRecommendedHashtags(): Promise<{
  categories: Record<string, string[]>;
  top_10_for_mlm: string[];
}> {
  const response = await apiClient.get<{
    categories: Record<string, string[]>;
    top_10_for_mlm: string[];
  }>(API_ENDPOINTS.LEAD_HUNTER.HASHTAGS);
  return response.data;
}

export async function getMLMSignals(): Promise<{
  strong_signals: { description: string; keywords: string[]; action: string };
  medium_signals: { description: string; keywords: string[]; action: string };
  weak_signals: { description: string; keywords: string[]; action: string };
  negative_signals: { description: string; keywords: string[]; action: string };
}> {
  const response = await apiClient.get<{
    strong_signals: { description: string; keywords: string[]; action: string };
    medium_signals: { description: string; keywords: string[]; action: string };
    weak_signals: { description: string; keywords: string[]; action: string };
    negative_signals: { description: string; keywords: string[]; action: string };
  }>(API_ENDPOINTS.LEAD_HUNTER.SIGNALS);
  return response.data;
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const leadHunterQueryKeys = {
  all: ['lead-hunter'] as const,
  daily: (count: number) => ['lead-hunter', 'daily', count] as const,
  quota: ['lead-hunter', 'quota'] as const,
  hashtags: ['lead-hunter', 'hashtags'] as const,
  signals: ['lead-hunter', 'signals'] as const,
};

export default {
  getDailySuggestions,
  huntLeads,
  findLookalikes,
  getReactivationCandidates,
  getDailyQuota,
  convertToLead,
  getRecommendedHashtags,
  getMLMSignals,
};
