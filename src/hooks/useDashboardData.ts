/**
 * Dashboard Data Hook - Unified data access for the main dashboard
 *
 * Endpoints (best-effort with graceful fallbacks):
 * - GET /api/leads?count=true → total leads
 * - GET /api/followups/today → today's follow-ups (nutzt followup_suggestions Tabelle)
 * - GET /api/leads?status=won&period=this_month → deals won this month
 * - GET /api/leads?group_by=status → pipeline by stage
 * - GET /api/activities?limit=5 → recent activities
 * - GET /api/analytics/charts?period=7d → chart data
 */

import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const authFetch = async (endpoint: string) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export interface DashboardStats {
  revenue?: number;
  activeLeads?: number;
  conversionRate?: number;
  aiInteractions?: number;
}

export interface ChartData {
  date: string;
  revenue?: number;
  leads?: number;
  deals?: number;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
}

export interface KPIData {
  leadsTotal: number;
  followUpsToday: number;
  dealsThisMonth: number;
  pipelineValue: number;
}

export interface TaskItem {
  id: string;
  name: string;
  action?: string;
  dueTime?: string;
  overdue?: boolean;
  leadId?: string;
}

export interface PipelineStage {
  status: string;
  count: number;
  value?: number;
}

export interface InsightItem {
  title: string;
  description: string;
}

export const useDashboardData = () => {
  const query = useQuery({
    queryKey: ['dashboard', 'unified'],
    staleTime: 1000 * 60 * 5,
    retry: 1,
    queryFn: async () => {
      const [
        leadsRes,
        followUpsRes,
        dealsRes,
        pipelineRes,
        activitiesRes,
        chartsRes,
      ] = await Promise.allSettled([
        authFetch('/api/leads?count=true'),
        authFetch('/api/followups/today'), // Nutzt followup_suggestions Tabelle
        authFetch('/api/leads?status=won&period=this_month'),
        authFetch('/api/leads?group_by=status'),
        authFetch('/api/activities?limit=5'),
        authFetch('/api/analytics/charts?period=7d'),
      ]);

      const safe = <T,>(res: PromiseSettledResult<T>, fallback: T): T =>
        res.status === 'fulfilled' ? res.value : fallback;

      const leadsData: any = safe(leadsRes, { count: 0 });
      const followUpsData: any = safe(followUpsRes, { today: [] });
      const dealsData: any = safe(dealsRes, { count: 0, total_value: 0 });
      const pipelineData: any = safe(pipelineRes, { groups: [] });
      const activitiesData: any = safe(activitiesRes, { activities: [] });
      const chartsData: any = safe(chartsRes, { chartData: [] });
      
      // Debug-Logging für Follow-ups
      console.log("[Dashboard] Fetching followups for user");
      console.log("[Dashboard] /api/followups/today raw response:", followUpsData);
      console.log("[Dashboard] Followups result:", followUpsData?.today, followUpsData?.count);
      
      // Debug-Logging für Lead-Anzahl
      console.log("[Dashboard] /api/leads?count=true raw", leadsData);
      console.log("[Dashboard] leadsTotal calculation:", {
        responseType: typeof leadsData,
        isArray: Array.isArray(leadsData),
        dataType: typeof leadsData?.data,
        isDataArray: Array.isArray(leadsData?.data),
        length: leadsData?.length || leadsData?.data?.length || leadsData?.items?.length,
        hasCount: leadsData?.count,
        hasTotal: leadsData?.total,
      });
      const leadsTotal =
        (Array.isArray(leadsData?.items) ? leadsData.items.length : undefined) ??
        (Array.isArray(leadsData?.data) ? leadsData.data.length : undefined) ??
        (Array.isArray(leadsData) ? leadsData.length : undefined) ??
        leadsData.count ??
        leadsData.total ??
        0;

      // API gibt { today: [...], count: ... } zurück
      const followUpsToday = Array.isArray(followUpsData?.today)
        ? followUpsData.today.length
        : Array.isArray(followUpsData?.items)
          ? followUpsData.items.length
          : Array.isArray(followUpsData)
            ? followUpsData.length
            : followUpsData.count ?? 0;

      const dealsThisMonth = Array.isArray(dealsData)
        ? dealsData.length
        : dealsData.count ?? 0;

      const pipelineValue = pipelineData.total_value ?? dealsData.total_value ?? 0;

      const kpis: KPIData = {
        leadsTotal,
        followUpsToday,
        dealsThisMonth,
        pipelineValue,
      };

      console.log("[Dashboard] FINAL leadsTotal:", leadsTotal);

      // API gibt { today: [...], count: ... } zurück
      const followupsArray = followUpsData?.today ?? followUpsData?.items ?? (Array.isArray(followUpsData) ? followUpsData : []);
      const todaysTasks: TaskItem[] = Array.isArray(followupsArray)
        ? followupsArray.slice(0, 5).map((item: any) => {
            // Handle nested leads object
            const leadName = item.leads?.name ?? item.lead_name ?? item.title ?? 'Follow-up';
            return {
              id: item.id ?? item.followup_id ?? `${item.lead_id ?? item.id ?? Math.random()}`,
              name: leadName,
              action: item.reason ?? item.type ?? item.action ?? 'Follow-up',
              dueTime: item.due_at ?? item.due_time ?? item.due,
              overdue: Boolean(item.overdue),
              leadId: item.lead_id ?? item.leadId,
            };
          })
        : [];

      const pipeline: PipelineStage[] = Array.isArray(pipelineData.groups)
        ? pipelineData.groups.map((g: any) => ({
            status: g.status ?? g.stage ?? 'Unbekannt',
            count: g.count ?? g.total ?? 0,
            value: g.value ?? g.total_value,
          }))
        : [];

      const activities: Activity[] = Array.isArray(activitiesData.activities)
        ? activitiesData.activities.slice(0, 5).map((a: any, idx: number) => ({
            id: a.id ?? `act-${idx}`,
            type: a.type ?? 'activity',
            message: a.message ?? a.description ?? 'Aktivität',
            timestamp: a.timestamp ?? a.created_at ?? new Date().toISOString(),
            user: a.user ?? a.actor ?? undefined,
          }))
        : [];

      const chartData: ChartData[] = Array.isArray(chartsData.chartData)
        ? chartsData.chartData.map((c: any) => ({
            date: c.date ?? c.day ?? new Date().toISOString(),
            revenue: c.revenue ?? c.value ?? 0,
            leads: c.leads ?? c.count ?? 0,
            deals: c.deals ?? c.won ?? 0,
          }))
        : [];

      let insights: InsightItem[] = [];

      if (insights.length === 0 && (kpis.leadsTotal ?? 0) === 0) {
        insights = [
          { title: 'Tipp: Erstelle deinen ersten Lead mit dem + Button', description: '' },
          { title: 'Tipp: Importiere Kontakte per CSV', description: '' },
          { title: 'Tipp: Frag den AI Copilot für Hilfe', description: '' },
        ];
      }

      return {
        kpis,
        todaysTasks,
        pipeline,
        activities,
        chartData,
        insights,
      };
    },
  });

  return {
    kpis: query.data?.kpis ?? {
      leadsTotal: 0,
      followUpsToday: 0,
      dealsThisMonth: 0,
      pipelineValue: 0,
    },
    todaysTasks: query.data?.todaysTasks ?? [],
    pipeline: query.data?.pipeline ?? [],
    activities: query.data?.activities ?? [],
    chartData: query.data?.chartData ?? [],
    insights: query.data?.insights ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetchAll: query.refetch,
  };
};
