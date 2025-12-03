// ============================================================================
// FILE: src/hooks/useReactivation.ts
// DESCRIPTION: Custom hook for Reactivation Engine (warm leads that went cold)
// ============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ReactivationCandidate, ReactivationFilters } from '@/types/reactivation';
import { DEFAULT_REACTIVATION_FILTERS } from '@/types/reactivation';

interface UseReactivationResult {
  candidates: ReactivationCandidate[];
  isLoading: boolean;
  error: Error | null;
  fetchCandidates: (filters?: Partial<ReactivationFilters>) => Promise<void>;
  clearCandidates: () => void;
}

export function useReactivation(
  workspaceId: string,
  userId: string
): UseReactivationResult {
  const [candidates, setCandidates] = useState<ReactivationCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCandidates = useCallback(
    async (filters: Partial<ReactivationFilters> = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'fieldops_reactivation_candidates',
          {
            p_workspace_id: workspaceId,
            p_user_id: userId,
            p_min_days_since_last_contact:
              filters.minDaysSinceContact ?? DEFAULT_REACTIVATION_FILTERS.minDaysSinceContact,
            p_max_days_since_last_contact:
              filters.maxDaysSinceContact ?? DEFAULT_REACTIVATION_FILTERS.maxDaysSinceContact,
            p_limit: filters.limit ?? DEFAULT_REACTIVATION_FILTERS.limit,
          }
        );

        if (rpcError) throw rpcError;
        setCandidates(data || []);
      } catch (err: any) {
        console.error('[useReactivation] Fetch error:', err);
        setError(err);
        setCandidates([]);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, userId]
  );

  const clearCandidates = useCallback(() => {
    setCandidates([]);
    setError(null);
  }, []);

  return {
    candidates,
    isLoading,
    error,
    fetchCandidates,
    clearCandidates,
  };
}

