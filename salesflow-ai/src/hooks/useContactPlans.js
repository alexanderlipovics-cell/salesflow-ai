/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  USE CONTACT PLANS HOOK                                                     ║
 * ║  React Hook für Contact Plans aus dem Chat-Import-System                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getTodaysContactPlans,
  getOverdueContactPlans,
  getUpcomingContactPlans,
  completeContactPlan as apiCompleteContactPlan,
  skipContactPlan as apiSkipContactPlan,
  rescheduleContactPlan as apiRescheduleContactPlan,
  getActionTypeIcon,
  getActionTypeLabel,
  getActionTypeColor,
  getDealStateIcon,
  isDealStateUrgent,
} from '../services/chatImportService';

/**
 * Hook für Contact Plans
 */
export function useContactPlans() {
  const { session } = useAuth();
  const [todaysPlans, setTodaysPlans] = useState([]);
  const [overduePlans, setOverduePlans] = useState([]);
  const [upcomingPlans, setUpcomingPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const accessToken = session?.access_token || null;

  // Daten abrufen
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [today, overdue, upcoming] = await Promise.all([
        getTodaysContactPlans(accessToken),
        getOverdueContactPlans(accessToken),
        getUpcomingContactPlans(7, accessToken),
      ]);

      setTodaysPlans(today || []);
      setOverduePlans(overdue || []);
      setUpcomingPlans(upcoming || []);
    } catch (err) {
      console.log('Contact Plans Fehler:', err);
      setError(err.message);
      // Demo-Daten bei Fehler
      setTodaysPlans([]);
      setOverduePlans([]);
      setUpcomingPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Initial fetch
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Plan abschließen
  const completeContactPlan = useCallback(async (planId, note = null) => {
    try {
      await apiCompleteContactPlan(planId, note, accessToken);
      // Aus Listen entfernen
      setTodaysPlans(prev => prev.filter(p => p.id !== planId));
      setOverduePlans(prev => prev.filter(p => p.id !== planId));
      setUpcomingPlans(prev => prev.filter(p => p.id !== planId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [accessToken]);

  // Plan überspringen
  const skipContactPlan = useCallback(async (planId, reason = null) => {
    try {
      await apiSkipContactPlan(planId, reason, accessToken);
      // Aus Listen entfernen
      setTodaysPlans(prev => prev.filter(p => p.id !== planId));
      setOverduePlans(prev => prev.filter(p => p.id !== planId));
      setUpcomingPlans(prev => prev.filter(p => p.id !== planId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [accessToken]);

  // Plan verschieben
  const rescheduleContactPlan = useCallback(async (planId, newDate) => {
    try {
      await apiRescheduleContactPlan(planId, newDate, accessToken);
      // Neu laden für korrekte Einordnung
      await fetchPlans();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [accessToken, fetchPlans]);

  // Statistiken berechnen
  const stats = {
    todayTotal: todaysPlans.length,
    overdueTotal: overduePlans.length,
    upcomingTotal: upcomingPlans.length,
    paymentChecks: [...todaysPlans, ...overduePlans].filter(
      p => p.action_type === 'check_payment'
    ).length,
    urgentTotal: [...todaysPlans, ...overduePlans].filter(p => p.is_urgent).length,
  };

  // Gruppiert nach Typ
  const groupedByType = {
    checkPayment: [...todaysPlans, ...overduePlans].filter(
      p => p.action_type === 'check_payment'
    ),
    followUp: [...todaysPlans, ...overduePlans].filter(
      p => p.action_type === 'follow_up_message'
    ),
    call: [...todaysPlans, ...overduePlans].filter(
      p => p.action_type === 'call'
    ),
    reactivation: [...todaysPlans, ...overduePlans].filter(
      p => p.action_type === 'reactivation_follow_up'
    ),
    other: [...todaysPlans, ...overduePlans].filter(
      p => !['check_payment', 'follow_up_message', 'call', 'reactivation_follow_up'].includes(p.action_type)
    ),
  };

  return {
    todaysPlans,
    overduePlans,
    upcomingPlans,
    isLoading,
    error,
    stats,
    groupedByType,
    refetch: fetchPlans,
    completeContactPlan,
    skipContactPlan,
    rescheduleContactPlan,
    // Helpers
    getActionTypeIcon,
    getActionTypeLabel,
    getActionTypeColor,
    getDealStateIcon,
    isDealStateUrgent,
  };
}

/**
 * Hook nur für heutige + überfällige Plans (für Daily Flow)
 */
export function useTodaysContactPlans() {
  const { session } = useAuth();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const accessToken = session?.access_token || null;

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const [today, overdue] = await Promise.all([
        getTodaysContactPlans(accessToken),
        getOverdueContactPlans(accessToken),
      ]);

      // Kombinieren und sortieren (überfällige zuerst, dann nach Priorität)
      const combined = [
        ...(overdue || []).map(p => ({ ...p, isOverdue: true })),
        ...(today || []).map(p => ({ ...p, isOverdue: false })),
      ].sort((a, b) => {
        // Überfällige zuerst
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        // Dann nach Priorität
        return (b.priority || 50) - (a.priority || 50);
      });

      setPlans(combined);
    } catch (err) {
      console.log('Heute Contact Plans Fehler:', err);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const completeContactPlan = useCallback(async (planId, note = null) => {
    try {
      await apiCompleteContactPlan(planId, note, accessToken);
      setPlans(prev => prev.filter(p => p.id !== planId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [accessToken]);

  const stats = {
    total: plans.length,
    overdue: plans.filter(p => p.isOverdue).length,
    checkPayment: plans.filter(p => p.action_type === 'check_payment').length,
    urgent: plans.filter(p => p.is_urgent).length,
  };

  return {
    plans,
    isLoading,
    stats,
    refetch: fetchPlans,
    completeContactPlan,
    getActionTypeIcon,
    getActionTypeLabel,
    getActionTypeColor,
  };
}

export default useContactPlans;

