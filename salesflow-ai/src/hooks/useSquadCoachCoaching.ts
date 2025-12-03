import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchSquadCoachReport,
  fetchFollowupsScored,
  buildCoachingInput,
  requestCoachingFromChief,
} from '@/services/coachingApi';
import type { CoachingError, CoachingOutput, CoachingState } from '@/types/coaching';

export interface UseSquadCoachCoachingOptions {
  workspaceId: string;
  daysBack?: number;
  language?: string;
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onSuccess?: (coaching: CoachingOutput) => void;
  onError?: (error: CoachingError) => void;
}

export interface UseSquadCoachCoachingResult extends CoachingState {
  refetch: (force?: boolean) => Promise<void>;
  isRefetching: boolean;
}

const CACHE = new Map<
  string,
  {
    state: CoachingState;
    timestamp: number;
  }
>();

const DEFAULT_STATE: CoachingState = {
  report: null,
  coaching: null,
  loading: false,
  error: null,
  lastFetched: null,
};

export function useSquadCoachCoaching(options: UseSquadCoachCoachingOptions): UseSquadCoachCoachingResult {
  const {
    workspaceId,
    daysBack = 30,
    language = 'de',
    enabled = true,
    autoRefresh = false,
    refreshInterval = 300_000,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<CoachingState>(DEFAULT_STATE);
  const [isRefetching, setIsRefetching] = useState(false);

  const mountedRef = useRef(true);
  const cacheKey = useMemo(() => `${workspaceId}:${daysBack}:${language}`, [workspaceId, daysBack, language]);

  const hydrateFromCache = useCallback(() => {
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < refreshInterval) {
      setState({ ...cached.state, loading: false, error: null });
      return true;
    }
    return false;
  }, [cacheKey, refreshInterval]);

  const saveToCache = useCallback(
    (nextState: CoachingState) => {
      CACHE.set(cacheKey, { state: nextState, timestamp: Date.now() });
    },
    [cacheKey]
  );

  const fetchData = useCallback(
    async (force = false) => {
      if (!workspaceId || !enabled) return;

      if (!force && hydrateFromCache()) {
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const [report, followups] = await Promise.all([
          fetchSquadCoachReport(workspaceId, daysBack),
          fetchFollowupsScored(workspaceId),
        ]);

        if (!mountedRef.current) return;

        if (report.length === 0) {
          const nextState: CoachingState = {
            report,
            coaching: null,
            loading: false,
            error: null,
            lastFetched: new Date(),
          };
          setState(nextState);
          saveToCache(nextState);
          return;
        }

        const input = buildCoachingInput(workspaceId, daysBack, language, report, followups);
        const coaching = await requestCoachingFromChief(input, { maxRetries: 3, retryDelay: 1_000 });

        if (!mountedRef.current) return;

        const nextState: CoachingState = {
          report,
          coaching,
          loading: false,
          error: null,
          lastFetched: new Date(),
        };
        setState(nextState);
        saveToCache(nextState);
        onSuccess?.(coaching);
      } catch (error) {
        if (!mountedRef.current) return;

        const err = error as Error;
        const coachingError: CoachingError = err.message.includes('network')
          ? { code: 'NETWORK_ERROR', message: 'Netzwerkfehler beim Laden der Coaching-Daten', details: err.message }
          : err.message.includes('Invalid')
          ? { code: 'VALIDATION_ERROR', message: 'Datenvalidierung fehlgeschlagen', details: err.message }
          : err.message.includes('API')
          ? { code: 'API_ERROR', message: 'CHIEF API Fehler', details: err.message }
          : { code: 'UNKNOWN_ERROR', message: 'Ein unbekannter Fehler ist aufgetreten', details: err.message };

        setState((prev) => ({ ...prev, loading: false, error: coachingError }));
        onError?.(coachingError);
      }
    },
    [workspaceId, daysBack, language, enabled, hydrateFromCache, onError, onSuccess, saveToCache]
  );

  const refetch = useCallback(
    async (force = true) => {
      setIsRefetching(true);
      await fetchData(force);
      setIsRefetching(false);
    },
    [fetchData]
  );

  useEffect(() => {
    mountedRef.current = true;
    fetchData(false);
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || !enabled) return undefined;
    const interval = setInterval(() => {
      fetchData(true);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval, fetchData]);

  return {
    ...state,
    refetch,
    isRefetching,
  };
}

