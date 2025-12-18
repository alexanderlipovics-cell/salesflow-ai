/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useFinanceApi Hook                                                        ║
 * ║  React Hook für Provisionen, Earnings & Compensation (API-basiert)         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  financeApi, 
  FinanceOverview,
  CommissionEntry,
  MonthlyEarnings,
  RankProgress,
  TeamEarnings,
  GoalProgress,
} from '../api/finance';

export interface UseFinanceApiReturn {
  // State
  overview: FinanceOverview | null;
  commissions: CommissionEntry[];
  monthlyEarnings: MonthlyEarnings[];
  rankProgress: RankProgress | null;
  teamEarnings: TeamEarnings[];
  goals: GoalProgress[];
  loading: boolean;
  error: string | null;
  
  // Computed
  currentMonthTotal: number;
  ytdTotal: number;
  pendingAmount: number;
  
  // Actions
  loadOverview: () => Promise<void>;
  loadCommissions: (options?: { month?: string; type?: string }) => Promise<void>;
  loadMonthlyEarnings: (months?: number) => Promise<void>;
  loadRankProgress: () => Promise<void>;
  loadTeamEarnings: (month?: string) => Promise<void>;
  loadGoals: () => Promise<void>;
  createGoal: (goal: { goal_type: string; target_amount: number; deadline?: string }) => Promise<GoalProgress>;
}

export function useFinanceApi(): UseFinanceApiReturn {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([]);
  const [rankProgress, setRankProgress] = useState<RankProgress | null>(null);
  const [teamEarnings, setTeamEarnings] = useState<TeamEarnings[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Overview
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getOverview();
      setOverview(data);
      setRankProgress(data.rank_progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Commissions
  const loadCommissions = useCallback(async (options?: { month?: string; type?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getCommissions(options as any);
      setCommissions(data.commissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Monthly Earnings
  const loadMonthlyEarnings = useCallback(async (months: number = 6) => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getMonthlyEarnings({ months });
      setMonthlyEarnings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Rank Progress
  const loadRankProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getRankProgress();
      setRankProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Team Earnings
  const loadTeamEarnings = useCallback(async (month?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getTeamEarnings({ month });
      setTeamEarnings(data.team_members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Goals
  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getGoals();
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Goal
  const createGoal = useCallback(async (goal: { goal_type: string; target_amount: number; deadline?: string }) => {
    const created = await financeApi.createGoal(goal as any);
    setGoals(prev => [...prev, created]);
    return created;
  }, []);

  // Initial Load
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Computed
  const currentMonthTotal = overview?.current_month?.total ?? 0;
  const ytdTotal = overview?.ytd_total ?? 0;
  const pendingAmount = overview?.pending_commissions ?? 0;

  return {
    overview,
    commissions,
    monthlyEarnings,
    rankProgress,
    teamEarnings,
    goals,
    loading,
    error,
    currentMonthTotal,
    ytdTotal,
    pendingAmount,
    loadOverview,
    loadCommissions,
    loadMonthlyEarnings,
    loadRankProgress,
    loadTeamEarnings,
    loadGoals,
    createGoal,
  };
}

export default useFinanceApi;

