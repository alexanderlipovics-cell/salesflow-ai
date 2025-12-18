// ============================================================================
// FILE: src/hooks/useSquadCoachAnalysis.ts
// DESCRIPTION: Custom hook for Squad Coach Priority Analysis
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { SquadCoachPriorityAnalysis, SquadCoachFilters } from '@/types/squad-coach';
import { DEFAULT_SQUAD_COACH_FILTERS } from '@/types/squad-coach';

interface UseSquadCoachAnalysisResult {
  analysis: SquadCoachPriorityAnalysis[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSquadCoachAnalysis(
  workspaceId: string,
  options?: Partial<SquadCoachFilters>
): UseSquadCoachAnalysisResult {
  const [analysis, setAnalysis] = useState<SquadCoachPriorityAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'squad_coach_priority_analysis',
        {
          p_workspace_id: workspaceId,
          p_days_back: options?.daysBack ?? DEFAULT_SQUAD_COACH_FILTERS.daysBack,
        }
      );

      if (rpcError) throw rpcError;
      setAnalysis(data || []);
    } catch (err: any) {
      console.error('[useSquadCoachAnalysis] Fetch error:', err);
      setError(err);
      setAnalysis([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, options?.daysBack]);

  useEffect(() => {
    fetchAnalysis();

    const refetchInterval = options?.refetchInterval ?? DEFAULT_SQUAD_COACH_FILTERS.refetchInterval;
    
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(fetchAnalysis, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAnalysis, options?.refetchInterval]);

  return {
    analysis,
    isLoading,
    error,
    refetch: fetchAnalysis,
  };
}

