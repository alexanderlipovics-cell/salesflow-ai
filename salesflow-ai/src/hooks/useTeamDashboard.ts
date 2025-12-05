/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useTeamDashboard Hook - NetworkerOS                                       ║
 * ║  Hook für Team Dashboard Daten                                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  mockTeamApi,
  TeamStats,
  TeamMember,
  TeamAlert,
} from '../services/mockDMOService';

// =============================================================================
// useTeamStats - Hook für Team-Statistiken
// =============================================================================

export function useTeamStats() {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockTeamApi.getTeamStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Team-Stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

// =============================================================================
// useTeamMembers - Hook für Team-Mitglieder
// =============================================================================

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'needs_help'>('all');

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockTeamApi.getTeamMembers();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Team-Mitglieder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Gefilterte Mitglieder
  const filteredMembers = useMemo(() => {
    switch (filter) {
      case 'active':
        return members.filter(m => m.status === 'active');
      case 'needs_help':
        return members.filter(m => m.needsHelp);
      default:
        return members;
    }
  }, [members, filter]);

  // Gruppierte Mitglieder
  const activeMembers = members.filter(m => m.status === 'active');
  const inactiveMembers = members.filter(m => m.status === 'inactive');
  const newMembers = members.filter(m => m.status === 'new');
  const needsHelpMembers = members.filter(m => m.needsHelp);

  // Top Performer
  const topPerformers = [...members]
    .sort((a, b) => b.dmoProgress - a.dmoProgress)
    .slice(0, 3);

  return {
    members,
    filteredMembers,
    activeMembers,
    inactiveMembers,
    newMembers,
    needsHelpMembers,
    topPerformers,
    loading,
    error,
    filter,
    setFilter,
    refetch: fetchMembers,
  };
}

// =============================================================================
// useTeamAlerts - Hook für Team-Alerts
// =============================================================================

export function useTeamAlerts() {
  const [alerts, setAlerts] = useState<TeamAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockTeamApi.getTeamAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissAlert = useCallback(async (alertId: string) => {
    // Optimistic Update
    setAlerts(prev => prev.filter(a => a.id !== alertId));

    try {
      await mockTeamApi.dismissAlert(alertId);
    } catch (err) {
      // Rollback bei Fehler
      fetchAlerts();
    }
  }, [fetchAlerts]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Gruppiert nach Priorität
  const highPriorityAlerts = alerts.filter(a => a.priority === 'high');
  const mediumPriorityAlerts = alerts.filter(a => a.priority === 'medium');
  const lowPriorityAlerts = alerts.filter(a => a.priority === 'low');

  // Gruppiert nach Typ
  const inactiveAlerts = alerts.filter(a => a.type === 'inactive');
  const strugglingAlerts = alerts.filter(a => a.type === 'struggling');
  const achievementAlerts = alerts.filter(a => a.type === 'achievement');
  const milestoneAlerts = alerts.filter(a => a.type === 'milestone');

  return {
    alerts,
    highPriorityAlerts,
    mediumPriorityAlerts,
    lowPriorityAlerts,
    inactiveAlerts,
    strugglingAlerts,
    achievementAlerts,
    milestoneAlerts,
    loading,
    error,
    refetch: fetchAlerts,
    dismissAlert,
    totalCount: alerts.length,
    urgentCount: highPriorityAlerts.length,
  };
}

// =============================================================================
// useTeamDashboard - Kombinierter Hook
// =============================================================================

export function useTeamDashboard() {
  const stats = useTeamStats();
  const members = useTeamMembers();
  const alerts = useTeamAlerts();

  const loading = stats.loading || members.loading || alerts.loading;
  const error = stats.error || members.error || alerts.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      stats.refetch(),
      members.refetch(),
      alerts.refetch(),
    ]);
  }, [stats.refetch, members.refetch, alerts.refetch]);

  return {
    stats: stats.stats,
    members: members.filteredMembers,
    allMembers: members.members,
    activeMembers: members.activeMembers,
    needsHelpMembers: members.needsHelpMembers,
    topPerformers: members.topPerformers,
    alerts: alerts.alerts,
    urgentAlerts: alerts.highPriorityAlerts,
    loading,
    error,
    refetch: refetchAll,
    filter: members.filter,
    setFilter: members.setFilter,
    dismissAlert: alerts.dismissAlert,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  useTeamStats,
  useTeamMembers,
  useTeamAlerts,
  useTeamDashboard,
};

