// ============================================================================
// FILE: src/hooks/useSquadCoachReport.ts
// DESCRIPTION: Enhanced Squad Coach Report Hook with analytics
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { SquadCoachReport } from '@/types/squad-coach';

export interface SquadCoachReportOptions {
  daysBack?: number;
  refetchInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: SquadCoachReport[]) => void;
}

export interface SquadCoachAnalytics {
  totalReps: number;
  needsCoaching: number;
  avgHealthScore: number;
  focusAreaDistribution: Record<string, number>;
  topPerformer: SquadCoachReport | null;
  bottomPerformer: SquadCoachReport | null;
}

export interface UseSquadCoachReportResult {
  reports: SquadCoachReport[];
  isLoading: boolean;
  error: Error | null;
  analytics: SquadCoachAnalytics;
  lastFetched: Date | null;
  refetch: () => Promise<void>;
}

export function useSquadCoachReport(
  workspaceId: string,
  options: SquadCoachReportOptions = {}
): UseSquadCoachReportResult {
  const [reports, setReports] = useState<SquadCoachReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchReport = useCallback(async () => {
    if (!workspaceId) {
      setError(new Error('Workspace ID is required'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('squad_coach_report', {
        p_workspace_id: workspaceId,
        p_days_back: options.daysBack ?? 30,
      });

      if (rpcError) throw rpcError;

      const typedData = (data || []) as SquadCoachReport[];
      setReports(typedData);
      setLastFetched(new Date());
      options.onSuccess?.(typedData);
    } catch (err: any) {
      console.error('[useSquadCoachReport] Error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, options.daysBack]);

  useEffect(() => {
    fetchReport();

    if (options.refetchInterval && options.refetchInterval > 0) {
      const interval = setInterval(fetchReport, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchReport, options.refetchInterval]);

  // Computed analytics
  const analytics = useMemo<SquadCoachAnalytics>(() => {
    if (reports.length === 0) {
      return {
        totalReps: 0,
        needsCoaching: 0,
        avgHealthScore: 0,
        focusAreaDistribution: {},
        topPerformer: null,
        bottomPerformer: null,
      };
    }

    const needsCoaching = reports.filter((r) => r.coaching_priority <= 3);
    const avgHealthScore =
      reports.reduce((sum, r) => sum + r.health_score, 0) / reports.length;

    const focusAreaDistribution = reports.reduce((acc, r) => {
      acc[r.focus_area] = (acc[r.focus_area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = [...reports].sort((a, b) => b.health_score - a.health_score);
    const topPerformer = sorted[0] || null;
    const bottomPerformer = sorted[sorted.length - 1] || null;

    return {
      totalReps: reports.length,
      needsCoaching: needsCoaching.length,
      avgHealthScore: Math.round(avgHealthScore * 10) / 10,
      focusAreaDistribution,
      topPerformer,
      bottomPerformer,
    };
  }, [reports]);

  return {
    reports,
    isLoading,
    error,
    analytics,
    lastFetched,
    refetch: fetchReport,
  };
}

