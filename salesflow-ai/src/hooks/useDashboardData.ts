/**
 * Dashboard Data Hook - Optimized with React Query
 * 
 * Features:
 * - Parallel API fetching
 * - Smart caching (5-15 min based on data type)
 * - Optimistic updates ready
 * - Aggregated loading/error states
 * 
 * @author Gemini 3 Ultra - Frontend Optimization
 */

import { useQuery } from '@tanstack/react-query';

// API Service (adjust import based on your structure)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
};

export interface DashboardStats {
  revenue: number;
  activeLeads: number;
  conversionRate: number;
  aiInteractions: number;
}

export interface ChartData {
  date: string;
  revenue: number;
  leads: number;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
}

export const useDashboardData = () => {
  // 1. API Optimization: Paralleles Fetching & Caching
  // Wir trennen kritische Daten (Stats) von schweren Daten (Charts)
  
  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/stats');
      return response as DashboardStats;
    },
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
    retry: 2,
  });

  const chartQuery = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/charts');
      return response as { chartData: ChartData[] };
    },
    staleTime: 1000 * 60 * 15, // 15 Minuten Cache für teure Charts
    retry: 1,
  });

  const activityQuery = useQuery({
    queryKey: ['dashboard', 'activities'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/activities?limit=20');
      return response as { activities: Activity[] };
    },
    staleTime: 1000 * 60 * 2, // 2 Minuten Cache für Recent Activity
    retry: 1,
    // Optimistic Updates würden hier in Mutationen (z.B. markAsRead) implementiert werden
  });

  // Aggregierter Loading/Error State
  const isLoading = statsQuery.isLoading || chartQuery.isLoading || activityQuery.isLoading;
  const isError = statsQuery.isError || chartQuery.isError || activityQuery.isError;
  const error = statsQuery.error || chartQuery.error || activityQuery.error;

  return {
    stats: statsQuery.data,
    charts: chartQuery.data?.chartData,
    activities: activityQuery.data?.activities,
    isLoading,
    isError,
    error,
    refetchAll: () => {
      statsQuery.refetch();
      chartQuery.refetch();
      activityQuery.refetch();
    }
  };
};
