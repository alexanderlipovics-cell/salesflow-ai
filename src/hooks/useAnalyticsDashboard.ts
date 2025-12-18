/**
 * useAnalyticsDashboard Hook
 * Fetches advanced analytics from backend/app/api/analytics_dashboard.py
 */
import { useState, useEffect, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE = API_BASE_URL;

export type DateRange = "7d" | "30d" | "90d";

export type AdvancedAnalyticsData = {
  revenue_timeline: Array<{ date: string; revenue: number; signups: number }>;
  top_products: Array<{ product_id: string; product_name: string; revenue: number; units: number }>;
  user_growth: Array<{ date: string; new_users: number; churned_users: number; net_growth: number }>;
  cohort_retention: Array<{ cohort: string; month_0: number; month_1: number; month_3: number; month_6: number }>;
  feature_adoption: Array<{ feature_name: string; active_users: number; adoption_rate: number }>;
  geo_distribution: Array<{ country: string; users: number; revenue: number }>;
};

type UseAnalyticsDashboardProps = {
  workspaceId: string;
  range?: DateRange;
  autoRefreshInterval?: number;
};

export function useAnalyticsDashboard({
  workspaceId,
  range = "30d",
  autoRefreshInterval = 60000,
}: UseAnalyticsDashboardProps) {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    if (!workspaceId) {
      setError("Workspace ID ist erforderlich");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/dashboard/complete?workspace_id=${workspaceId}&range=${range}`,
        {
          headers: {
            "Content-Type": "application/json",
            // Add auth token if available
            ...(localStorage.getItem("auth_token") && {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Transform backend response to match our AdvancedAnalyticsData type
      setData({
        revenue_timeline: result.week_timeseries || [],
        top_products: result.top_templates || [],
        user_growth: [],
        cohort_retention: [],
        feature_adoption: [],
        geo_distribution: [],
      });
    } catch (err: any) {
      console.error("Analytics Dashboard Error:", err);
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, autoRefreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    autoRefresh,
    setAutoRefresh,
  };
}
