/**
 * SALES FLOW AI - PRIORITY FOLLOW-UPS HOOK
 * 
 * Hook for fetching follow-ups with priority scores
 * Version: 2.0.0
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { FollowUpItem, SegmentKey } from '@/types/priority';

export function usePriorityFollowUps(
  workspaceId: string,
  userId: string,
  initialSegment: SegmentKey = 'today'
) {
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [segment, setSegment] = useState<SegmentKey>(initialSegment);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchFollowUps = useCallback(
    async (targetSegment?: SegmentKey) => {
      const segmentToFetch = targetSegment || segment;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'followups_by_segment',
          {
            p_workspace_id: workspaceId,
            p_user_id: userId,
            p_segment: segmentToFetch,
          }
        );

        if (rpcError) throw rpcError;
        setFollowUps(data || []);
      } catch (err: any) {
        console.error('Follow-ups fetch error:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, userId, segment]
  );

  const changeSegment = useCallback(
    (newSegment: SegmentKey) => {
      setSegment(newSegment);
      fetchFollowUps(newSegment);
    },
    [fetchFollowUps]
  );

  // Initial fetch
  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  return {
    followUps,
    segment,
    isLoading,
    error,
    fetchFollowUps,
    changeSegment,
  };
}

