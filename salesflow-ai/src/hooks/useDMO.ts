/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useDMO Hook - NetworkerOS                                                 ║
 * ║  Zentraler Hook für DMO Tracker Daten                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from 'react';
import {
  mockDMOApi,
  mockCheckInsApi,
  mockContactsApi,
  DMOSummary,
  CheckIn,
  SuggestedContact,
} from '../services/mockDMOService';

// =============================================================================
// useDMO - Hook für DMO Summary
// =============================================================================

export function useDMO() {
  const [summary, setSummary] = useState<DMOSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockDMOApi.getDMOSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der DMO-Daten');
    } finally {
      setLoading(false);
    }
  }, []);

  const incrementMetric = useCallback(async (metricId: string) => {
    if (!summary) return;

    // Optimistic Update
    const updatedMetrics = summary.metrics.map(m =>
      m.id === metricId ? { ...m, current: m.current + 1 } : m
    );

    const totalProgress = updatedMetrics.reduce((sum, m) => sum + (m.current / m.target), 0);
    const newCompletionRate = Math.min(100, Math.round((totalProgress / updatedMetrics.length) * 100));

    setSummary({
      ...summary,
      metrics: updatedMetrics,
      completionRate: newCompletionRate,
      statusLevel: getStatusLevel(newCompletionRate),
    });

    try {
      await mockDMOApi.logActivity(metricId);
    } catch (err) {
      // Rollback bei Fehler
      fetchSummary();
    }
  }, [summary, fetchSummary]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
    incrementMetric,
  };
}

// =============================================================================
// useCheckIns - Hook für Check-ins (früher Follow-ups)
// =============================================================================

export function useCheckIns() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckIns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockCheckInsApi.getTodaysCheckIns();
      setCheckIns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Check-ins');
    } finally {
      setLoading(false);
    }
  }, []);

  const completeCheckIn = useCallback(async (checkInId: string) => {
    // Optimistic Update
    setCheckIns(prev => prev.filter(c => c.id !== checkInId));

    try {
      await mockCheckInsApi.completeCheckIn(checkInId);
    } catch (err) {
      // Rollback bei Fehler
      fetchCheckIns();
    }
  }, [fetchCheckIns]);

  const snoozeCheckIn = useCallback(async (checkInId: string, newDate: string) => {
    try {
      await mockCheckInsApi.snoozeCheckIn(checkInId, newDate);
      fetchCheckIns();
    } catch (err) {
      console.error('Failed to snooze check-in:', err);
    }
  }, [fetchCheckIns]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  // Gruppierte Check-ins
  const overdueCheckIns = checkIns.filter(c => c.isOverdue);
  const todayCheckIns = checkIns.filter(c => !c.isOverdue && c.dueDate.includes('Heute'));
  const upcomingCheckIns = checkIns.filter(c => !c.isOverdue && !c.dueDate.includes('Heute'));

  return {
    checkIns,
    overdueCheckIns,
    todayCheckIns,
    upcomingCheckIns,
    loading,
    error,
    refetch: fetchCheckIns,
    completeCheckIn,
    snoozeCheckIn,
    totalCount: checkIns.length,
    overdueCount: overdueCheckIns.length,
  };
}

// =============================================================================
// useSuggestedContacts - Hook für Kontakt-Vorschläge
// =============================================================================

export function useSuggestedContacts() {
  const [contacts, setContacts] = useState<SuggestedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mockContactsApi.getSuggestedContacts();
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Kontakte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Sortiert nach Score
  const sortedByScore = [...contacts].sort((a, b) => b.score - a.score);
  const topContacts = sortedByScore.slice(0, 5);

  return {
    contacts,
    topContacts,
    loading,
    error,
    refetch: fetchContacts,
  };
}

// =============================================================================
// useGuidedDailyFlow - Kombinierter Hook für den Guided Flow Screen
// =============================================================================

export function useGuidedDailyFlow() {
  const dmo = useDMO();
  const checkIns = useCheckIns();
  const suggestedContacts = useSuggestedContacts();

  const loading = dmo.loading || checkIns.loading || suggestedContacts.loading;
  const error = dmo.error || checkIns.error || suggestedContacts.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      dmo.refetch(),
      checkIns.refetch(),
      suggestedContacts.refetch(),
    ]);
  }, [dmo.refetch, checkIns.refetch, suggestedContacts.refetch]);

  return {
    dmo: dmo.summary,
    checkIns: checkIns.checkIns,
    overdueCheckIns: checkIns.overdueCheckIns,
    suggestedContacts: suggestedContacts.topContacts,
    loading,
    error,
    refetch: refetchAll,
    incrementMetric: dmo.incrementMetric,
    completeCheckIn: checkIns.completeCheckIn,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusLevel(rate: number): DMOSummary['statusLevel'] {
  if (rate >= 100) return 'ahead';
  if (rate >= 75) return 'on_track';
  if (rate >= 50) return 'behind';
  return 'critical';
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  useDMO,
  useCheckIns,
  useSuggestedContacts,
  useGuidedDailyFlow,
};

