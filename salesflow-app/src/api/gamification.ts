/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  GAMIFICATION API                                                          ║
 * ║  API Functions für Streaks, Achievements & Gamification                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type StreakStatus = 'active_today' | 'at_risk' | 'broken' | 'inactive';

export interface Streak {
  current: number;
  longest: number;
  last_active: string | null;
  total_days: number;
  freeze_available: boolean;
  status: StreakStatus;
}

export interface Achievement {
  id?: string;
  type: string;
  level: number;
  name: string;
  description?: string;
  emoji: string;
  current: number;
  target: number;
  progress: number;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface NewAchievement {
  type: string;
  level: number;
  name: string;
  emoji: string;
  description?: string;
}

export interface GamificationSummary {
  streak: Streak;
  achievements_unlocked: number;
  next_achievements: Achievement[];
  total_active_days: number;
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
// STREAKS
// =============================================================================

/**
 * Holt aktuelle Streak-Daten.
 */
export async function getStreak(): Promise<Streak> {
  return apiRequest<Streak>('/gamification/streak');
}

/**
 * Nutzt Streak Freeze.
 */
export async function useStreakFreeze(): Promise<{
  success: boolean;
  message: string;
  streak: Streak;
}> {
  return apiRequest('/gamification/streak/freeze', {
    method: 'POST',
  });
}

/**
 * Zeichnet eine Aktivität auf.
 */
export async function recordActivity(): Promise<Streak> {
  return apiRequest('/gamification/streak/record', {
    method: 'POST',
  });
}

// =============================================================================
// ACHIEVEMENTS
// =============================================================================

/**
 * Holt alle Achievements.
 */
export async function getAchievements(): Promise<{
  total_unlocked: number;
  unlocked: Achievement[];
  in_progress: Achievement[];
}> {
  return apiRequest('/gamification/achievements');
}

/**
 * Prüft und schaltet Achievements frei.
 */
export async function checkAchievements(): Promise<NewAchievement[]> {
  return apiRequest('/gamification/achievements/check', {
    method: 'POST',
  });
}

// =============================================================================
// SUMMARY
// =============================================================================

/**
 * Holt Gamification-Zusammenfassung.
 */
export async function getSummary(): Promise<GamificationSummary> {
  return apiRequest<GamificationSummary>('/gamification/summary');
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const gamificationApi = {
  // Streaks
  getStreak,
  useStreakFreeze,
  recordActivity,
  
  // Achievements
  getAchievements,
  checkAchievements,
  
  // Summary
  getSummary,
};

export default gamificationApi;

