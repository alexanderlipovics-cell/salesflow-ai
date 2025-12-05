/**
 * SALES FLOW AI - DASHBOARD DATA HOOKS
 * 
 * React Hooks für Data Fetching aller Dashboard Analytics
 * Version: 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  TodayOverview,
  TodayTask,
  WeekOverview,
  WeekTimeseriesPoint,
  TopTemplate,
  FunnelStats,
  TopNetworker,
  NeedsHelpRep,
  LoadState,
  HookResult,
} from '../types/dashboard';

// ============================================================================
// SUPABASE CLIENT SETUP
// ============================================================================

const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase credentials missing. Check environment variables.');
  }
  
  return createClient(url, key);
};

// ============================================================================
// HOOK: useTodayOverview
// ============================================================================

export function useTodayOverview(workspaceId: string): HookResult<TodayOverview | null> {
  const [data, setData] = useState<TodayOverview | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase
        .rpc('dashboard_today_overview', {
          p_workspace_id: workspaceId,
        })
        .single();

      if (rpcError) throw rpcError;

      setData(result);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// HOOK: useTodayTasks
// ============================================================================

export function useTodayTasks(
  workspaceId: string,
  limit = 100
): HookResult<TodayTask[]> {
  const [data, setData] = useState<TodayTask[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase.rpc(
        'dashboard_today_tasks',
        {
          p_workspace_id: workspaceId,
          p_limit: limit,
        }
      );

      if (rpcError) throw rpcError;

      setData(result || []);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId, limit]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// HOOK: useWeekOverview
// ============================================================================

export function useWeekOverview(workspaceId: string): HookResult<WeekOverview | null> {
  const [data, setData] = useState<WeekOverview | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase
        .rpc('dashboard_week_overview', {
          p_workspace_id: workspaceId,
        })
        .single();

      if (rpcError) throw rpcError;

      setData(result);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// HOOK: useWeekTimeseries
// ============================================================================

export function useWeekTimeseries(
  workspaceId: string
): HookResult<WeekTimeseriesPoint[]> {
  const [data, setData] = useState<WeekTimeseriesPoint[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase.rpc(
        'dashboard_week_timeseries',
        {
          p_workspace_id: workspaceId,
        }
      );

      if (rpcError) throw rpcError;

      setData(result || []);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// HOOK: useTopTemplates
// ============================================================================

export function useTopTemplates(
  workspaceId: string,
  daysBack = 30,
  limit = 20
): HookResult<TopTemplate[]> {
  const [data, setData] = useState<TopTemplate[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase.rpc(
        'dashboard_top_templates',
        {
          p_workspace_id: workspaceId,
          p_days_back: daysBack,
          p_limit: limit,
        }
      );

      if (rpcError) throw rpcError;

      setData(result || []);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId, daysBack, limit]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// HOOK: useFunnelStats
// ============================================================================

export function useFunnelStats(workspaceId: string): HookResult<FunnelStats | null> {
  const [data, setData] = useState<FunnelStats | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase
        .rpc('dashboard_funnel_stats', {
          p_workspace_id: workspaceId,
        })
        .single();

      if (rpcError) throw rpcError;

      setData(result);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// HOOK: useTopNetworkers
// ============================================================================

export function useTopNetworkers(
  workspaceId: string,
  daysBack = 30,
  limit = 5
): HookResult<TopNetworker[]> {
  const [data, setData] = useState<TopNetworker[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase.rpc(
        'dashboard_top_networkers',
        {
          p_workspace_id: workspaceId,
          p_days_back: daysBack,
          p_limit: limit,
        }
      );

      if (rpcError) throw rpcError;

      setData(result || []);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId, daysBack, limit]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// HOOK: useNeedsHelp
// ============================================================================

export function useNeedsHelp(
  workspaceId: string,
  daysBack = 30,
  minContacts = 10,
  limit = 5
): HookResult<NeedsHelpRep[]> {
  const [data, setData] = useState<NeedsHelpRep[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: result, error: rpcError } = await supabase.rpc(
        'dashboard_needs_help',
        {
          p_workspace_id: workspaceId,
          p_days_back: daysBack,
          p_min_contacts: minContacts,
          p_limit: limit,
        }
      );

      if (rpcError) throw rpcError;

      setData(result || []);
      setState('success');
    } catch (err) {
      setError(err as Error);
      setState('error');
    }
  }, [workspaceId, daysBack, minContacts, limit]);

  useEffect(() => {
    if (workspaceId) {
      fetch();
    }
  }, [fetch, workspaceId]);

  return { data, state, error, refetch: fetch };
}

// ============================================================================
// MASTER HOOK: useDashboard
// Lädt alle Dashboard Daten auf einmal
// ============================================================================

export function useDashboard(workspaceId: string) {
  const todayOverview = useTodayOverview(workspaceId);
  const todayTasks = useTodayTasks(workspaceId);
  const weekOverview = useWeekOverview(workspaceId);
  const weekTimeseries = useWeekTimeseries(workspaceId);
  const topTemplates = useTopTemplates(workspaceId);
  const funnelStats = useFunnelStats(workspaceId);
  const topNetworkers = useTopNetworkers(workspaceId);
  const needsHelp = useNeedsHelp(workspaceId);

  const isLoading =
    todayOverview.state === 'loading' ||
    todayTasks.state === 'loading' ||
    weekOverview.state === 'loading' ||
    weekTimeseries.state === 'loading' ||
    topTemplates.state === 'loading' ||
    funnelStats.state === 'loading' ||
    topNetworkers.state === 'loading' ||
    needsHelp.state === 'loading';

  const hasError =
    todayOverview.state === 'error' ||
    todayTasks.state === 'error' ||
    weekOverview.state === 'error' ||
    weekTimeseries.state === 'error' ||
    topTemplates.state === 'error' ||
    funnelStats.state === 'error' ||
    topNetworkers.state === 'error' ||
    needsHelp.state === 'error';

  const refetchAll = useCallback(() => {
    todayOverview.refetch();
    todayTasks.refetch();
    weekOverview.refetch();
    weekTimeseries.refetch();
    topTemplates.refetch();
    funnelStats.refetch();
    topNetworkers.refetch();
    needsHelp.refetch();
  }, [
    todayOverview,
    todayTasks,
    weekOverview,
    weekTimeseries,
    topTemplates,
    funnelStats,
    topNetworkers,
    needsHelp,
  ]);

  return {
    todayOverview: todayOverview.data,
    todayTasks: todayTasks.data,
    weekOverview: weekOverview.data,
    weekTimeseries: weekTimeseries.data,
    topTemplates: topTemplates.data,
    funnelStats: funnelStats.data,
    topNetworkers: topNetworkers.data,
    needsHelp: needsHelp.data,
    isLoading,
    hasError,
    refetchAll,
    errors: {
      todayOverview: todayOverview.error,
      todayTasks: todayTasks.error,
      weekOverview: weekOverview.error,
      weekTimeseries: weekTimeseries.error,
      topTemplates: topTemplates.error,
      funnelStats: funnelStats.error,
      topNetworkers: topNetworkers.error,
      needsHelp: needsHelp.error,
    },
  };
}

// ============================================================================
// UTILITY: useDashboardRefresh
// Auto-refresh mit konfigurierbarem Interval
// ============================================================================

export function useDashboardRefresh(
  workspaceId: string,
  intervalMs = 60000 // Default: 1 Minute
) {
  const dashboard = useDashboard(workspaceId);

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;

    const timer = setInterval(() => {
      dashboard.refetchAll();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [dashboard, intervalMs]);

  return dashboard;
}

