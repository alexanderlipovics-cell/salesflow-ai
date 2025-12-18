/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USE UNIFIED ACTIONS HOOK                                 ║
 * ║  React Hook für vereinheitlichte Daily Flow Actions                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Kombiniert:
 * - Pending Actions (Zahlungsprüfungen, Follow-ups)
 * - Daily Flow Actions (aus Tagesplan)
 * - Automatisch priorisiert nach Dringlichkeit
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getUnifiedActions,
  getDailySummary,
  getUrgentActions,
  getPaymentChecks,
  completeAction,
  snoozeAction,
  snoozeUntilTomorrow,
  snoozeUntilNextWeek,
  formatActionType,
  getPriorityColor,
  groupActionsByType,
  estimateTimeForActions,
} from '../services/dailyFlowService';

// =============================================================================
// MAIN HOOK: useUnifiedActions
// =============================================================================

/**
 * Haupt-Hook für vereinheitlichte Actions
 * 
 * @param {Object} options
 * @param {string} options.forDate - Datum im ISO-Format
 * @param {boolean} options.includeCompleted - Auch abgeschlossene?
 * @param {number} options.limit - Max. Anzahl
 * @param {boolean} options.autoRefresh - Auto-Refresh alle 60s?
 * 
 * @returns {Object} Unified Actions State und Funktionen
 */
export function useUnifiedActions(options = {}) {
  const {
    forDate = null,
    includeCompleted = false,
    limit = 50,
    autoRefresh = false,
  } = options;

  // STATE
  const [actions, setActions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // DATA LOADING
  const loadActions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    setError(null);

    try {
      const [actionsData, summaryData] = await Promise.all([
        getUnifiedActions({ forDate, includeCompleted, limit }),
        getDailySummary(forDate),
      ]);

      setActions(actionsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('❌ Load Actions Error:', err);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [forDate, includeCompleted, limit]);

  // Initial Load
  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Auto-Refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadActions(true);
    }, 60000); // Alle 60s

    return () => clearInterval(interval);
  }, [autoRefresh, loadActions]);

  // ACTIONS
  const complete = useCallback(async (actionId, source, options = {}) => {
    setIsUpdating(true);
    try {
      await completeAction(actionId, source, options);
      await loadActions();
    } catch (err) {
      console.error('❌ Complete Action Error:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadActions]);

  const snooze = useCallback(async (actionId, source, snoozeUntil) => {
    setIsUpdating(true);
    try {
      await snoozeAction(actionId, source, snoozeUntil);
      await loadActions();
    } catch (err) {
      console.error('❌ Snooze Action Error:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadActions]);

  const snoozeTomorrow = useCallback(async (actionId, source) => {
    setIsUpdating(true);
    try {
      await snoozeUntilTomorrow(actionId, source);
      await loadActions();
    } catch (err) {
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadActions]);

  const snoozeNextWeek = useCallback(async (actionId, source) => {
    setIsUpdating(true);
    try {
      await snoozeUntilNextWeek(actionId, source);
      await loadActions();
    } catch (err) {
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadActions]);

  // COMPUTED VALUES
  const urgentActions = useMemo(
    () => actions.filter(a => a.is_urgent || a.is_overdue),
    [actions]
  );

  const pendingActions = useMemo(
    () => actions.filter(a => a.status === 'pending'),
    [actions]
  );

  const paymentChecks = useMemo(
    () => actions.filter(a => a.action_type === 'check_payment'),
    [actions]
  );

  const groupedByType = useMemo(
    () => groupActionsByType(pendingActions),
    [pendingActions]
  );

  const estimatedTime = useMemo(
    () => estimateTimeForActions(pendingActions),
    [pendingActions]
  );

  // RETURN
  return {
    // Data
    actions,
    summary,
    
    // Filtered
    urgentActions,
    pendingActions,
    paymentChecks,
    groupedByType,
    
    // Stats
    estimatedTime,
    totalActions: actions.length,
    completedCount: summary?.completed_actions ?? 0,
    completionRate: summary?.completion_rate ?? 0,
    
    // Actions
    complete,
    snooze,
    snoozeTomorrow,
    snoozeNextWeek,
    
    // Loading States
    isLoading,
    isRefreshing,
    isUpdating,
    
    // Error
    error,
    
    // Utils
    refresh: () => loadActions(true),
    
    // Helpers
    formatActionType,
    getPriorityColor,
  };
}

// =============================================================================
// HOOK: useUrgentActions
// =============================================================================

/**
 * Hook nur für dringende Actions
 */
export function useUrgentActions(limit = 10) {
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUrgentActions(limit);
      setActions(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    actions,
    isLoading,
    error,
    refresh: load,
    hasUrgent: actions.length > 0,
  };
}

// =============================================================================
// HOOK: usePaymentChecks
// =============================================================================

/**
 * Hook nur für Zahlungsprüfungen
 */
export function usePaymentChecks() {
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPaymentChecks();
      setActions(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPendingAmount = useMemo(() => {
    // Wenn deal_amount im Lead vorhanden ist
    return actions.reduce((sum, a) => {
      // Annahme: deal_amount kommt als Teil der Action-Daten
      return sum + (parseFloat(a.lead_deal_amount) || 0);
    }, 0);
  }, [actions]);

  return {
    actions,
    isLoading,
    error,
    refresh: load,
    count: actions.length,
    totalPendingAmount,
  };
}

// =============================================================================
// HOOK: useDailySummary
// =============================================================================

/**
 * Hook für die Tages-Zusammenfassung
 */
export function useDailySummary(forDate = null) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDailySummary(forDate);
      setSummary(data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [forDate]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    summary,
    isLoading,
    error,
    refresh: load,
    
    // Quick access
    totalActions: summary?.total_actions ?? 0,
    completedActions: summary?.completed_actions ?? 0,
    completionRate: summary?.completion_rate ?? 0,
    estimatedMinutes: summary?.estimated_time_minutes ?? 0,
    overdueCount: summary?.overdue_count ?? 0,
    urgentCount: summary?.urgent_count ?? 0,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useUnifiedActions;

