/**
 * 🔥 usePhoenixCache
 * ==================
 * Offline-Cache & Optimistic Updates für Phoenix.
 *
 * WARUM DIESE VERBESSERUNG?
 * ========================
 * 1. Offline-First: Auch ohne Netz nutzbar
 * 2. Schnellere UX: Keine Loading-Spinner
 * 3. Weniger API-Calls: Daten werden gecached
 * 4. Optimistic Updates: UI reagiert sofort
 *
 * FEATURES:
 * - AsyncStorage Cache
 * - Stale-While-Revalidate Pattern
 * - Background Sync
 * - Optimistic UI Updates
 */

import { useState, useEffect, useCallback, useRef } from "react";

// Web-compatible storage adapter
const storage = {
  getItem: (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

// Web-compatible network check
const checkNetworkStatus = (): boolean => {
  if (typeof window !== 'undefined' && 'navigator' in window) {
    return navigator.onLine ?? true;
  }
  return true;
};

import type { NearbyLead, ImEarlyResponse, FieldSession } from "../../api/types/phoenix";
import * as phoenixApi from "../../api/phoenix";

// =============================================================================
// TYPES
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PhoenixCacheState {
  nearbyLeads: NearbyLead[];
  imEarlyData: ImEarlyResponse | null;
  activeSession: FieldSession | null;
  isOnline: boolean;
  isStale: boolean;
  lastSync: Date | null;
}

interface UsePhoenixCacheOptions {
  /** Cache TTL in Sekunden */
  cacheTTL?: number;
  /** Auto-Refresh Intervall in Sekunden */
  refreshInterval?: number;
  /** Offline-Modus aktivieren */
  enableOffline?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_KEYS = {
  NEARBY_LEADS: "phoenix_nearby_leads",
  IM_EARLY: "phoenix_im_early",
  ACTIVE_SESSION: "phoenix_active_session",
  LAST_LOCATION: "phoenix_last_location",
};

const DEFAULT_TTL = 5 * 60 * 1000; // 5 Minuten

// =============================================================================
// HOOK
// =============================================================================

export function usePhoenixCache(options: UsePhoenixCacheOptions = {}) {
  const {
    cacheTTL = DEFAULT_TTL,
    refreshInterval = 60,
    enableOffline = true,
  } = options;

  // State
  const [state, setState] = useState<PhoenixCacheState>({
    nearbyLeads: [],
    imEarlyData: null,
    activeSession: null,
    isOnline: true,
    isStale: false,
    lastSync: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // CACHE UTILITIES
  // =============================================================================

  const saveToCache = useCallback(
    async <T>(key: string, data: T) => {
      if (!enableOffline) return;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + cacheTTL,
      };

      try {
        await storage.setItem(key, JSON.stringify(entry));
      } catch (e) {
        console.warn("Cache save failed:", e);
      }
    },
    [cacheTTL, enableOffline]
  );

  const loadFromCache = useCallback(
    async <T>(key: string): Promise<{ data: T | null; isStale: boolean }> => {
      if (!enableOffline) {
        return { data: null, isStale: true };
      }

      try {
        const cached = await storage.getItem(key);
        if (!cached) {
          return { data: null, isStale: true };
        }

        const entry: CacheEntry<T> = JSON.parse(cached);
        const isStale = Date.now() > entry.expiresAt;

        return { data: entry.data, isStale };
      } catch (e) {
        console.warn("Cache load failed:", e);
        return { data: null, isStale: true };
      }
    },
    [enableOffline]
  );

  // =============================================================================
  // NETWORK CHECK
  // =============================================================================

  useEffect(() => {
    // Web-compatible network status listener
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      if (state.isStale) {
        refreshAllData();
      }
    };
    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setState((prev) => ({ ...prev, isOnline: checkNetworkStatus() }));
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [state.isStale, refreshAllData]);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchNearbyLeads = useCallback(
    async (
      latitude: number,
      longitude: number,
      options: { forceRefresh?: boolean } = {}
    ) => {
      // 1. Check Cache first
      if (!options.forceRefresh) {
        const cached = await loadFromCache<NearbyLead[]>(CACHE_KEYS.NEARBY_LEADS);
        if (cached.data && !cached.isStale) {
          setState((prev) => ({ ...prev, nearbyLeads: cached.data!, isStale: false }));
          return cached.data;
        }

        // Stale data als Fallback
        if (cached.data) {
          setState((prev) => ({ ...prev, nearbyLeads: cached.data!, isStale: true }));
        }
      }

      // 2. Fetch fresh data
      if (!state.isOnline) {
        return state.nearbyLeads;
      }

      setIsLoading(true);
      try {
        const leads = await phoenixApi.findNearbyLeads({
          latitude,
          longitude,
          radius_meters: 5000,
        });

        // Update state & cache
        setState((prev) => ({
          ...prev,
          nearbyLeads: leads,
          isStale: false,
          lastSync: new Date(),
        }));
        await saveToCache(CACHE_KEYS.NEARBY_LEADS, leads);

        // Save location for offline use
        await storage.setItem(
          CACHE_KEYS.LAST_LOCATION,
          JSON.stringify({ latitude, longitude })
        );

        return leads;
      } catch (e) {
        console.warn("Fetch nearby leads failed:", e);
        return state.nearbyLeads;
      } finally {
        setIsLoading(false);
      }
    },
    [state.isOnline, state.nearbyLeads, loadFromCache, saveToCache]
  );

  const fetchImEarlyData = useCallback(
    async (
      latitude: number,
      longitude: number,
      minutesAvailable: number = 30
    ) => {
      // Check cache
      const cached = await loadFromCache<ImEarlyResponse>(CACHE_KEYS.IM_EARLY);
      if (cached.data && !cached.isStale) {
        setState((prev) => ({ ...prev, imEarlyData: cached.data, isStale: false }));
        return cached.data;
      }

      if (!state.isOnline) {
        return state.imEarlyData;
      }

      setIsLoading(true);
      try {
        const data = await phoenixApi.imEarlyForMeeting({
          latitude,
          longitude,
          minutes_available: minutesAvailable,
        });

        setState((prev) => ({
          ...prev,
          imEarlyData: data,
          isStale: false,
          lastSync: new Date(),
        }));
        await saveToCache(CACHE_KEYS.IM_EARLY, data);

        return data;
      } catch (e) {
        console.warn("Fetch im early failed:", e);
        return state.imEarlyData;
      } finally {
        setIsLoading(false);
      }
    },
    [state.isOnline, state.imEarlyData, loadFromCache, saveToCache]
  );

  // =============================================================================
  // REFRESH ALL
  // =============================================================================

  const refreshAllData = useCallback(async () => {
    const lastLocation = await storage.getItem(CACHE_KEYS.LAST_LOCATION);
    if (lastLocation) {
      const { latitude, longitude } = JSON.parse(lastLocation);
      await Promise.all([
        fetchNearbyLeads(latitude, longitude, { forceRefresh: true }),
        fetchImEarlyData(latitude, longitude),
      ]);
    }
  }, [fetchNearbyLeads, fetchImEarlyData]);

  // =============================================================================
  // AUTO REFRESH
  // =============================================================================

  useEffect(() => {
    if (refreshInterval > 0 && state.isOnline) {
      refreshTimerRef.current = setInterval(() => {
        refreshAllData();
      }, refreshInterval * 1000);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [refreshInterval, state.isOnline, refreshAllData]);

  // =============================================================================
  // CLEAR CACHE
  // =============================================================================

  const clearCache = useCallback(async () => {
    await Promise.all([
      storage.removeItem(CACHE_KEYS.NEARBY_LEADS),
      storage.removeItem(CACHE_KEYS.IM_EARLY),
      storage.removeItem(CACHE_KEYS.ACTIVE_SESSION),
    ]);
    setState({
      nearbyLeads: [],
      imEarlyData: null,
      activeSession: null,
      isOnline: state.isOnline,
      isStale: true,
      lastSync: null,
    });
  }, [state.isOnline]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    ...state,
    isLoading,
    fetchNearbyLeads,
    fetchImEarlyData,
    refreshAllData,
    clearCache,
  };
}

export default usePhoenixCache;


