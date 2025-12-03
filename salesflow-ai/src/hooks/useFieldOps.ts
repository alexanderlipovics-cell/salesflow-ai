/**
 * SALES FLOW AI - FIELD OPS HOOK
 * 
 * Hook for fetching nearby leads based on current location
 * Version: 2.0.0
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NearbyLead, GeoCoordinates } from '@/types/geolocation';

export function useFieldOps(workspaceId: string, userId: string) {
  const [nearbyLeads, setNearbyLeads] = useState<NearbyLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNearbyLeads = useCallback(
    async (coordinates: GeoCoordinates, radiusKm = 5.0) => {
      if (!coordinates.latitude || !coordinates.longitude) {
        setError(new Error('Koordinaten fehlen'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'fieldops_opportunity_radar',
          {
            p_workspace_id: workspaceId,
            p_user_id: userId,
            p_lat: coordinates.latitude,
            p_lng: coordinates.longitude,
            p_radius_km: radiusKm,
            p_limit: 10,
          }
        );

        if (rpcError) throw rpcError;
        setNearbyLeads(data || []);
      } catch (err: any) {
        console.error('FieldOps fetch error:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, userId]
  );

  const clearNearbyLeads = useCallback(() => {
    setNearbyLeads([]);
  }, []);

  return {
    nearbyLeads,
    isLoading,
    error,
    fetchNearbyLeads,
    clearNearbyLeads,
  };
}

