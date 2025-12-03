import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import type {
  ApiError,
  TodayOverview,
  TodayTask,
  TopTemplate,
  FunnelStats,
  TopNetworker,
  NeedHelpRep,
  WeekOverview,
  WeekTimeseriesPoint,
  LoadState,
} from '@/types/dashboard';

type RpcOptions<T> = {
  enabled?: boolean;
  refetchInterval?: number;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
};

type RpcResult<T> = {
  data: T | null;
  state: LoadState;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
};

const DEFAULT_RETRY_DELAY = 1500;

function useRpcQuery<T>(
  functionName: string,
  params: Record<string, unknown>,
  options?: RpcOptions<T>
): RpcResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const serializedParams = useMemo(() => JSON.stringify(params ?? {}), [params]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (options?.enabled === false) {
      return;
    }

    setState('loading');
    setError(null);

    const maxRetries = options?.retry ?? 1;
    const delay = options?.retryDelay ?? DEFAULT_RETRY_DELAY;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data: result, error: rpcError } = await supabaseClient.rpc(
          functionName,
          JSON.parse(serializedParams)
        );

        if (rpcError) {
          throw {
            message: rpcError.message,
            code: rpcError.code,
            details: rpcError.details,
          } satisfies ApiError;
        }

        const finalData = Array.isArray(result) && result.length === 1 ? result[0] : result;

        if (!isMountedRef.current) return;

        setData(finalData as T);
        setState('success');
        options?.onSuccess?.(finalData as T);
        return;
      } catch (err: any) {
        const apiError: ApiError = {
          message: err?.message || 'Unbekannter Fehler',
          code: err?.code,
          details: err?.details,
        };

        if (attempt === maxRetries || options?.retry === 0) {
          if (!isMountedRef.current) return;
          setError(apiError);
          setState('error');
          options?.onError?.(apiError);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }, [functionName, serializedParams, options?.enabled, options?.onError, options?.onSuccess, options?.retry, options?.retryDelay]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  useEffect(() => {
    if (options?.refetchInterval && options.refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, options.refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }

    return undefined;
  }, [fetchData, options?.refetchInterval]);

  return {
    data,
    state,
    error,
    isLoading: state === 'loading',
    isError: state === 'error',
    isSuccess: state === 'success',
    refetch: fetchData,
  };
}

export function useTodayOverview(workspaceId: string, options?: RpcOptions<TodayOverview>) {
  return useRpcQuery<TodayOverview>(
    'dashboard_today_overview',
    { p_workspace_id: workspaceId },
    options
  );
}

export function useTodayTasks(
  workspaceId: string,
  limit = 100,
  options?: RpcOptions<TodayTask[]>
) {
  return useRpcQuery<TodayTask[]>(
    'dashboard_today_tasks',
    { p_workspace_id: workspaceId, p_limit: limit },
    options
  );
}

export function useWeekOverview(workspaceId: string, options?: RpcOptions<WeekOverview>) {
  return useRpcQuery<WeekOverview>(
    'dashboard_week_overview',
    { p_workspace_id: workspaceId },
    options
  );
}

export function useWeekTimeseries(
  workspaceId: string,
  options?: RpcOptions<WeekTimeseriesPoint[]>
) {
  return useRpcQuery<WeekTimeseriesPoint[]>(
    'dashboard_week_timeseries',
    { p_workspace_id: workspaceId },
    options
  );
}

export function useTopTemplates(
  workspaceId: string,
  daysBack = 30,
  limit = 20,
  options?: RpcOptions<TopTemplate[]>
) {
  return useRpcQuery<TopTemplate[]>(
    'dashboard_top_templates',
    {
      p_workspace_id: workspaceId,
      p_days_back: daysBack,
      p_limit: limit,
    },
    options
  );
}

export function useFunnelStats(workspaceId: string, options?: RpcOptions<FunnelStats>) {
  return useRpcQuery<FunnelStats>(
    'dashboard_funnel_stats',
    { p_workspace_id: workspaceId },
    options
  );
}

export function useTopNetworkers(
  workspaceId: string,
  daysBack = 30,
  limit = 5,
  options?: RpcOptions<TopNetworker[]>
) {
  return useRpcQuery<TopNetworker[]>(
    'dashboard_top_networkers',
    {
      p_workspace_id: workspaceId,
      p_days_back: daysBack,
      p_limit: limit,
    },
    options
  );
}

export function useNeedHelpReps(
  workspaceId: string,
  daysBack = 30,
  minContacts = 20,
  limit = 5,
  options?: RpcOptions<NeedHelpRep[]>
) {
  return useRpcQuery<NeedHelpRep[]>(
    'dashboard_need_help_reps',
    {
      p_workspace_id: workspaceId,
      p_days_back: daysBack,
      p_min_contacts: minContacts,
      p_limit: limit,
    },
    options
  );
}

type DashboardHookOptions = {
  refetchInterval?: number;
  onError?: (section: string, error: ApiError) => void;
};

export function useDashboard(workspaceId: string, options?: DashboardHookOptions) {
  const sharedOptions = {
    refetchInterval: options?.refetchInterval,
    retry: 2,
    retryDelay: 1000,
  };

  const todayOverview = useTodayOverview(workspaceId, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('todayOverview', err),
  });

  const todayTasks = useTodayTasks(workspaceId, 120, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('todayTasks', err),
  });

  const weekOverview = useWeekOverview(workspaceId, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('weekOverview', err),
  });

  const weekTimeseries = useWeekTimeseries(workspaceId, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('weekTimeseries', err),
  });

  const topTemplates = useTopTemplates(workspaceId, 30, 20, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('topTemplates', err),
  });

  const funnelStats = useFunnelStats(workspaceId, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('funnelStats', err),
  });

  const topNetworkers = useTopNetworkers(workspaceId, 30, 5, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('topNetworkers', err),
  });

  const needHelpReps = useNeedHelpReps(workspaceId, 30, 20, 5, {
    ...sharedOptions,
    onError: (err) => options?.onError?.('needHelpReps', err),
  });

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      todayOverview.refetch(),
      todayTasks.refetch(),
      weekOverview.refetch(),
      weekTimeseries.refetch(),
      topTemplates.refetch(),
      funnelStats.refetch(),
      topNetworkers.refetch(),
      needHelpReps.refetch(),
    ]);
  }, [
    todayOverview,
    todayTasks,
    weekOverview,
    weekTimeseries,
    topTemplates,
    funnelStats,
    topNetworkers,
    needHelpReps,
  ]);

  const loadingStates = {
    todayOverview: todayOverview.isLoading,
    todayTasks: todayTasks.isLoading,
    weekOverview: weekOverview.isLoading,
    weekTimeseries: weekTimeseries.isLoading,
    topTemplates: topTemplates.isLoading,
    funnelStats: funnelStats.isLoading,
    topNetworkers: topNetworkers.isLoading,
    needHelpReps: needHelpReps.isLoading,
  };

  const errorStates = {
    todayOverview: todayOverview.error,
    todayTasks: todayTasks.error,
    weekOverview: weekOverview.error,
    weekTimeseries: weekTimeseries.error,
    topTemplates: topTemplates.error,
    funnelStats: funnelStats.error,
    topNetworkers: topNetworkers.error,
    needHelpReps: needHelpReps.error,
  };

  const isLoading = Object.values(loadingStates).some(Boolean);
  const hasError = Object.values(errorStates).some(Boolean);

  return {
    todayOverview: todayOverview.data,
    todayTasks: todayTasks.data ?? [],
    weekOverview: weekOverview.data,
    weekTimeseries: weekTimeseries.data ?? [],
    topTemplates: topTemplates.data ?? [],
    funnelStats: funnelStats.data,
    topNetworkers: topNetworkers.data ?? [],
    needHelpReps: needHelpReps.data ?? [],
    isLoading,
    hasError,
    refetchAll,
    loadingStates,
    errorStates,
  };
}

