/**
 * useAnalytics Hook
 * Lädt alle Analytics-Daten und managed Loading/Error States
 * Auto-Refresh alle N Sekunden
 */
import { useState, useEffect, useCallback } from "react";
import * as api from "@/services/analyticsApi";
import type { AnalyticsData } from "@/types/analytics";

type LoadState = "idle" | "loading" | "success" | "error";

export function useAnalytics(autoRefreshSeconds = 30) {
  const [data, setData] = useState<AnalyticsData>({
    topTemplates: [],
    funnelSpeed: [],
    segmentPerformance: [],
    repLeaderboard: [],
    todayCockpit: [],
  });
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadState("loading");
    setError(null);

    try {
      const [templates, funnel, segments, reps, cockpit] = await Promise.all([
        api.fetchTopTemplates(),
        api.fetchFunnelSpeed(),
        api.fetchSegmentPerformance(),
        api.fetchRepLeaderboard(),
        api.fetchTodayCockpit(),
      ]);

      setData({
        topTemplates: templates,
        funnelSpeed: funnel,
        segmentPerformance: segments,
        repLeaderboard: reps,
        todayCockpit: cockpit,
      });
      setLoadState("success");
    } catch (err: any) {
      console.error("Analytics load error:", err);
      setError(err.message || "Failed to load analytics");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadData();

    if (autoRefreshSeconds > 0) {
      const interval = setInterval(loadData, autoRefreshSeconds * 1000);
      return () => clearInterval(interval);
    }
  }, [loadData, autoRefreshSeconds]);

  return { data, loadState, error, refetch: loadData };
}

