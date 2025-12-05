/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useGamification Hook                                                      ║
 * ║  React Hook für Streaks, Achievements & Gamification                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  gamificationApi, 
  Streak,
  Achievement,
  NewAchievement,
  GamificationSummary,
} from '../api/gamification';

export interface UseGamificationReturn {
  // State
  streak: Streak | null;
  achievements: Achievement[];
  inProgressAchievements: Achievement[];
  summary: GamificationSummary | null;
  newAchievements: NewAchievement[];
  loading: boolean;
  error: string | null;
  
  // Computed
  currentStreak: number;
  longestStreak: number;
  isStreakActive: boolean;
  isStreakAtRisk: boolean;
  freezeAvailable: boolean;
  totalAchievements: number;
  
  // Actions
  loadStreak: () => Promise<void>;
  loadAchievements: () => Promise<void>;
  loadSummary: () => Promise<void>;
  useFreeze: () => Promise<boolean>;
  checkAchievements: () => Promise<NewAchievement[]>;
  recordActivity: () => Promise<void>;
  clearNewAchievements: () => void;
}

export function useGamification(): UseGamificationReturn {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [inProgressAchievements, setInProgressAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [newAchievements, setNewAchievements] = useState<NewAchievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Streak
  const loadStreak = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gamificationApi.getStreak();
      setStreak(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Achievements
  const loadAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gamificationApi.getAchievements();
      setAchievements(data.unlocked);
      setInProgressAchievements(data.in_progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Summary
  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gamificationApi.getSummary();
      setSummary(data);
      setStreak(data.streak);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use Freeze
  const useFreeze = useCallback(async () => {
    try {
      const result = await gamificationApi.useStreakFreeze();
      if (result.success) {
        setStreak(result.streak);
      }
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Freeze');
      return false;
    }
  }, []);

  // Check Achievements
  const checkAchievements = useCallback(async () => {
    try {
      const unlocked = await gamificationApi.checkAchievements();
      if (unlocked.length > 0) {
        setNewAchievements(unlocked);
        // Reload achievements
        loadAchievements();
      }
      return unlocked;
    } catch (err) {
      console.error('Failed to check achievements:', err);
      return [];
    }
  }, [loadAchievements]);

  // Record Activity
  const recordActivity = useCallback(async () => {
    try {
      const data = await gamificationApi.recordActivity();
      setStreak(data);
    } catch (err) {
      console.error('Failed to record activity:', err);
    }
  }, []);

  // Clear New Achievements
  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  // Initial Load
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Computed values
  const currentStreak = streak?.current ?? 0;
  const longestStreak = streak?.longest ?? 0;
  const isStreakActive = streak?.status === 'active_today';
  const isStreakAtRisk = streak?.status === 'at_risk';
  const freezeAvailable = streak?.freeze_available ?? false;
  const totalAchievements = achievements.length;

  return {
    streak,
    achievements,
    inProgressAchievements,
    summary,
    newAchievements,
    loading,
    error,
    currentStreak,
    longestStreak,
    isStreakActive,
    isStreakAtRisk,
    freezeAvailable,
    totalAchievements,
    loadStreak,
    loadAchievements,
    loadSummary,
    useFreeze,
    checkAchievements,
    recordActivity,
    clearNewAchievements,
  };
}

export default useGamification;

