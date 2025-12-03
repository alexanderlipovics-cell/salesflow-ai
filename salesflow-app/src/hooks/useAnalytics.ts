/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useAnalytics Hook                                                         ║
 * ║  React Hook für Analytics & Learning Tracking                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  analyticsApi, 
  AnalyticsDashboard,
  TemplatePerformance,
  ChannelStats,
  TimeSeriesData,
  PerformanceSummary,
  PulseFunnelByIntent,
} from '../api/analytics';

export interface UseAnalyticsReturn {
  // State
  dashboard: AnalyticsDashboard | null;
  templates: TemplatePerformance[];
  channels: ChannelStats[];
  timeSeries: TimeSeriesData[];
  summary: PerformanceSummary | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadDashboard: (period?: 'last_7d' | 'last_30d' | 'this_month') => Promise<void>;
  loadTopTemplates: (options?: { category?: string; days?: number; limit?: number }) => Promise<void>;
  loadChannelAnalytics: (options?: { fromDate?: string; toDate?: string }) => Promise<void>;
  loadTimeSeries: (options?: { fromDate?: string; toDate?: string; granularity?: 'day' | 'week' | 'month' }) => Promise<void>;
  loadSummary: (options?: { fromDate?: string; toDate?: string }) => Promise<void>;
  
  // Event Tracking
  trackTemplateUsed: (templateId: string, leadId?: string, channel?: string) => Promise<void>;
  trackResponse: (templateId: string, leadId?: string, responseTimeHours?: number) => Promise<void>;
  trackOutcome: (templateId: string, outcome: 'appointment_booked' | 'deal_closed' | 'info_sent' | 'rejected', leadId?: string) => Promise<void>;
  
  // Pulse Analytics
  loadPulseFunnel: (days?: number) => Promise<PulseFunnelByIntent | null>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [templates, setTemplates] = useState<TemplatePerformance[]>([]);
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Dashboard
  const loadDashboard = useCallback(async (period?: 'last_7d' | 'last_30d' | 'this_month') => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDashboard({ period });
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Top Templates
  const loadTopTemplates = useCallback(async (options?: { category?: string; days?: number; limit?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getTopTemplates(options);
      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Channel Analytics
  const loadChannelAnalytics = useCallback(async (options?: { fromDate?: string; toDate?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getChannelAnalytics(options);
      setChannels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Time Series
  const loadTimeSeries = useCallback(async (options?: { fromDate?: string; toDate?: string; granularity?: 'day' | 'week' | 'month' }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getTimeSeries(options);
      setTimeSeries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Summary
  const loadSummary = useCallback(async (options?: { fromDate?: string; toDate?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getPerformanceSummary(options);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track Template Used
  const trackTemplateUsed = useCallback(async (templateId: string, leadId?: string, channel?: string) => {
    try {
      await analyticsApi.trackTemplateUsed(templateId, leadId, channel);
    } catch (err) {
      console.error('Failed to track template usage:', err);
    }
  }, []);

  // Track Response
  const trackResponse = useCallback(async (templateId: string, leadId?: string, responseTimeHours?: number) => {
    try {
      await analyticsApi.trackResponse(templateId, leadId, responseTimeHours);
    } catch (err) {
      console.error('Failed to track response:', err);
    }
  }, []);

  // Track Outcome
  const trackOutcome = useCallback(async (
    templateId: string, 
    outcome: 'appointment_booked' | 'deal_closed' | 'info_sent' | 'rejected',
    leadId?: string
  ) => {
    try {
      await analyticsApi.trackOutcome(templateId, outcome, leadId);
    } catch (err) {
      console.error('Failed to track outcome:', err);
    }
  }, []);

  // Load Pulse Funnel
  const loadPulseFunnel = useCallback(async (days: number = 30) => {
    try {
      return await analyticsApi.getFunnelByIntent(days);
    } catch (err) {
      console.error('Failed to load pulse funnel:', err);
      return null;
    }
  }, []);

  return {
    dashboard,
    templates,
    channels,
    timeSeries,
    summary,
    loading,
    error,
    loadDashboard,
    loadTopTemplates,
    loadChannelAnalytics,
    loadTimeSeries,
    loadSummary,
    trackTemplateUsed,
    trackResponse,
    trackOutcome,
    loadPulseFunnel,
  };
}

export default useAnalytics;

