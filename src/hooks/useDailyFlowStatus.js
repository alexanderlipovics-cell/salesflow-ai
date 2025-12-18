/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USE DAILY FLOW STATUS HOOK                               ║
 * ║  React Hook für Daily Flow Status - IST vs. SOLL Tracking                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getDailyFlowStatus,
  getRecentActivities,
  logNewContact,
  logFollowup,
  logReactivation,
  updateDailyFlowTargets,
  ActivityError,
} from '../services/activityService';
import {
  buildSummaryMessage,
  buildTipMessage,
} from '../types/activity';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK: useDailyFlowStatus
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Haupt-Hook für Daily Flow Status
 * 
 * @param {string} [companyId='default'] - Company ID für Multi-Company Support
 * @returns {Object} Daily Flow Status State und Funktionen
 * 
 * @example
 * const { 
 *   status, 
 *   summaryMessage,
 *   tipMessage,
 *   isLoading,
 *   logContact,
 *   logFollowUp,
 *   logReactivate,
 *   refresh
 * } = useDailyFlowStatus('my-company');
 */
export function useDailyFlowStatus(companyId = 'default') {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesOffset, setActivitiesOffset] = useState(0);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Menschliche Summary-Nachricht
   */
  const summaryMessage = useMemo(
    () => status ? buildSummaryMessage(status) : '',
    [status]
  );

  /**
   * Tipp-Nachricht
   */
  const tipMessage = useMemo(
    () => status ? buildTipMessage(status) : null,
    [status]
  );

  /**
   * Gesamtfortschritt in Prozent
   */
  const overallProgress = useMemo(() => {
    if (!status) return 0;
    
    const { daily } = status;
    const totalDone = 
      (daily.new_contacts?.done || 0) + 
      (daily.followups?.done || 0) + 
      (daily.reactivations?.done || 0);
    const totalTarget = 
      (daily.new_contacts?.target || 0) + 
      (daily.followups?.target || 0) + 
      (daily.reactivations?.target || 0);
    
    return totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  }, [status]);

  /**
   * Anzahl fehlender Aktivitäten
   */
  const missingActivities = useMemo(() => {
    if (!status) return { contacts: 0, followups: 0, reactivations: 0, total: 0 };
    
    const { daily } = status;
    const contacts = Math.max(0, (daily.new_contacts?.target || 0) - (daily.new_contacts?.done || 0));
    const followups = Math.max(0, (daily.followups?.target || 0) - (daily.followups?.done || 0));
    const reactivations = Math.max(0, (daily.reactivations?.target || 0) - (daily.reactivations?.done || 0));
    
    return {
      contacts: Math.round(contacts),
      followups: Math.round(followups),
      reactivations: Math.round(reactivations),
      total: Math.round(contacts + followups + reactivations),
    };
  }, [status]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Status laden
   */
  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getDailyFlowStatus(companyId);
      setStatus(data);

      // Auch die letzten Aktivitäten laden
      const activities = await getRecentActivities(companyId, 10, 0);
      setRecentActivities(activities);
      setActivitiesOffset(10);
      
      return data;
    } catch (err) {
      console.error('❌ Load Status Error:', err);
      setError(err instanceof ActivityError ? err.message : 'Fehler beim Laden');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Initial Load
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Neuen Kontakt loggen
   */
  const logContact = useCallback(async (leadId = null, channel = null, notes = null) => {
    try {
      await logNewContact(companyId, leadId, channel, notes);
      await loadStatus(); // Reload to get updated counts
    } catch (err) {
      console.error('❌ Log Contact Error:', err);
      throw err;
    }
  }, [companyId, loadStatus]);

  /**
   * Follow-up loggen
   */
  const logFollowUp = useCallback(async (leadId = null, channel = null, notes = null) => {
    try {
      await logFollowup(companyId, leadId, channel, notes);
      await loadStatus();
    } catch (err) {
      console.error('❌ Log Follow-up Error:', err);
      throw err;
    }
  }, [companyId, loadStatus]);

  /**
   * Reaktivierung loggen
   */
  const logReactivate = useCallback(async (leadId = null, channel = null, notes = null) => {
    try {
      await logReactivation(companyId, leadId, channel, notes);
      await loadStatus();
    } catch (err) {
      console.error('❌ Log Reactivation Error:', err);
      throw err;
    }
  }, [companyId, loadStatus]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TARGETS UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Targets aktualisieren
   */
  const updateTargets = useCallback(async (newTargets) => {
    try {
      await updateDailyFlowTargets(newTargets, companyId);
      await loadStatus();
    } catch (err) {
      console.error('❌ Update Targets Error:', err);
      throw err;
    }
  }, [companyId, loadStatus]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Mehr Aktivitäten laden
   */
  const loadMoreActivities = useCallback(async () => {
    try {
      const more = await getRecentActivities(companyId, 10, activitiesOffset);
      setRecentActivities(prev => [...prev, ...more]);
      setActivitiesOffset(prev => prev + 10);
    } catch (err) {
      console.error('❌ Load More Activities Error:', err);
    }
  }, [companyId, activitiesOffset]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Status Data
    status,
    summaryMessage,
    tipMessage,
    overallProgress,
    missingActivities,
    
    // Loading State
    isLoading,
    error,
    
    // Actions
    refresh: loadStatus,
    logContact,
    logFollowUp,
    logReactivate,
    updateTargets,
    
    // Recent Activities
    recentActivities,
    loadMoreActivities,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useActivityLog
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für schnelles Activity Logging
 * 
 * @param {string} [companyId='default'] - Company ID
 * @returns {Object} Activity Logging Funktionen
 * 
 * @example
 * const { logContact, logFollowUp, isLogging } = useActivityLog();
 * await logContact({ leadId: 'abc', channel: 'whatsapp' });
 */
export function useActivityLog(companyId = 'default') {
  const [isLogging, setIsLogging] = useState(false);
  const [lastLogged, setLastLogged] = useState(null);

  const logContact = useCallback(async (options = {}) => {
    setIsLogging(true);
    try {
      const id = await logNewContact(
        companyId,
        options.leadId,
        options.channel,
        options.notes
      );
      setLastLogged({ type: 'new_contact', id, timestamp: new Date() });
      return id;
    } finally {
      setIsLogging(false);
    }
  }, [companyId]);

  const logFollowUp = useCallback(async (options = {}) => {
    setIsLogging(true);
    try {
      const id = await logFollowup(
        companyId,
        options.leadId,
        options.channel,
        options.notes
      );
      setLastLogged({ type: 'followup', id, timestamp: new Date() });
      return id;
    } finally {
      setIsLogging(false);
    }
  }, [companyId]);

  const logReactivate = useCallback(async (options = {}) => {
    setIsLogging(true);
    try {
      const id = await logReactivation(
        companyId,
        options.leadId,
        options.channel,
        options.notes
      );
      setLastLogged({ type: 'reactivation', id, timestamp: new Date() });
      return id;
    } finally {
      setIsLogging(false);
    }
  }, [companyId]);

  return {
    logContact,
    logFollowUp,
    logReactivate,
    isLogging,
    lastLogged,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useDailyFlowStatus;

