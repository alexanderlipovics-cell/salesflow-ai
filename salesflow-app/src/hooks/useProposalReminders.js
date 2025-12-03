/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USE PROPOSAL REMINDERS HOOK                               ║
 * ║  React Hook für Proposal Reminder Management                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  checkProposalReminders,
  processProposalReminders,
  createReminderTask,
  getPendingProposalReminders,
  completeReminderTask,
  snoozeReminderTask,
  cancelReminderTask,
  getReminderStats,
  formatDaysSinceProposal,
  getUrgencyLevel
} from '../services/proposalReminderService';
import {
  REMINDER_STATUS,
  PRIORITY_CONFIG,
  DEFAULT_REMINDER_CONFIG,
  getPriorityCategory,
  getReminderStatus
} from '../types/proposalReminder';

/**
 * Haupt-Hook für Proposal Reminders
 * 
 * @param {string} workspaceId - UUID des Workspace
 * @param {Object} [options] - Optionen
 * @param {number} [options.daysThreshold=3] - Tage bis Reminder
 * @param {boolean} [options.autoLoad=true] - Automatisch laden
 * @returns {Object} Proposal Reminder State und Funktionen
 * 
 * @example
 * const { 
 *   contacts, 
 *   stats, 
 *   processReminders,
 *   markComplete 
 * } = useProposalReminders(workspaceId);
 */
export function useProposalReminders(workspaceId, options = {}) {
  const { 
    daysThreshold = DEFAULT_REMINDER_CONFIG.daysThreshold,
    autoLoad = true 
  } = options;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Alle Pending Reminders laden
   */
  const loadReminders = useCallback(async () => {
    if (!workspaceId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [pendingData, statsData] = await Promise.all([
        getPendingProposalReminders(workspaceId),
        getReminderStats(workspaceId)
      ]);
      
      setContacts(pendingData || []);
      setStats(statsData || {});
      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ Load Reminders Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  /**
   * Reminder-Check durchführen
   */
  const checkReminders = useCallback(async () => {
    if (!workspaceId) return null;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkProposalReminders(workspaceId, daysThreshold);
      setCheckResult(result);
      return result;
    } catch (err) {
      console.error('❌ Check Reminders Error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, daysThreshold]);

  /**
   * Alle Reminders verarbeiten und Tasks erstellen
   */
  const processReminders = useCallback(async (autoCreate = true) => {
    if (!workspaceId) return null;
    
    setIsProcessing(true);
    setError(null);

    try {
      const result = await processProposalReminders(workspaceId, daysThreshold, autoCreate);
      
      // Nach Verarbeitung neu laden
      await loadReminders();
      
      return result;
    } catch (err) {
      console.error('❌ Process Reminders Error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [workspaceId, daysThreshold, loadReminders]);

  /**
   * Einzelnen Reminder-Task erstellen
   */
  const createReminder = useCallback(async (contactId, priorityScore = null) => {
    if (!workspaceId || !contactId) return null;
    
    try {
      const taskId = await createReminderTask(contactId, workspaceId, priorityScore);
      
      // Lokalen State aktualisieren
      setContacts(prev => prev.map(c => 
        c.contact_id === contactId 
          ? { ...c, open_reminder_count: (c.open_reminder_count || 0) + 1 }
          : c
      ));
      
      // Stats aktualisieren
      const newStats = await getReminderStats(workspaceId);
      setStats(newStats);
      
      return taskId;
    } catch (err) {
      console.error('❌ Create Reminder Error:', err);
      setError(err.message);
      return null;
    }
  }, [workspaceId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Task als erledigt markieren
   */
  const markComplete = useCallback(async (taskId, contactId) => {
    try {
      await completeReminderTask(taskId);
      
      // Lokalen State aktualisieren
      setContacts(prev => prev.map(c => 
        c.contact_id === contactId 
          ? { ...c, open_reminder_count: Math.max((c.open_reminder_count || 0) - 1, 0) }
          : c
      ));
      
      // Stats neu laden
      const newStats = await getReminderStats(workspaceId);
      setStats(newStats);
      
      return true;
    } catch (err) {
      console.error('❌ Mark Complete Error:', err);
      setError(err.message);
      return false;
    }
  }, [workspaceId]);

  /**
   * Task verschieben (snooze)
   */
  const snoozeTask = useCallback(async (taskId, days = 1) => {
    try {
      await snoozeReminderTask(taskId, days);
      return true;
    } catch (err) {
      console.error('❌ Snooze Task Error:', err);
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Task stornieren
   */
  const cancelTask = useCallback(async (taskId, contactId) => {
    try {
      await cancelReminderTask(taskId);
      
      // Lokalen State aktualisieren
      setContacts(prev => prev.map(c => 
        c.contact_id === contactId 
          ? { ...c, open_reminder_count: Math.max((c.open_reminder_count || 0) - 1, 0) }
          : c
      ));
      
      return true;
    } catch (err) {
      console.error('❌ Cancel Task Error:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // Initial Load
  useEffect(() => {
    if (autoLoad) {
      loadReminders();
    }
  }, [loadReminders, autoLoad]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Kontakte nach Status gruppiert
   */
  const contactsByStatus = useMemo(() => {
    return {
      overdue: contacts.filter(c => c.reminder_status === 'overdue'),
      dueSoon: contacts.filter(c => c.reminder_status === 'due_soon'),
      scheduled: contacts.filter(c => c.reminder_status === 'scheduled'),
    };
  }, [contacts]);

  /**
   * Kontakte die Reminder brauchen (keine offenen Reminders)
   */
  const contactsNeedingReminder = useMemo(() => {
    return contacts.filter(c => c.open_reminder_count === 0);
  }, [contacts]);

  /**
   * Kontakte mit hoher Priorität (überfällig oder urgent)
   */
  const urgentContacts = useMemo(() => {
    return contacts.filter(c => 
      c.reminder_status === 'overdue' || 
      c.suggested_priority >= PRIORITY_CONFIG.urgent.minScore
    );
  }, [contacts]);

  /**
   * Sortierte Kontakte nach Priorität
   */
  const prioritizedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      // Erst nach Status (overdue zuerst)
      const statusOrder = { overdue: 0, due_soon: 1, scheduled: 2 };
      const statusDiff = (statusOrder[a.reminder_status] || 2) - (statusOrder[b.reminder_status] || 2);
      if (statusDiff !== 0) return statusDiff;
      
      // Dann nach Priority Score
      return (b.suggested_priority || 0) - (a.suggested_priority || 0);
    });
  }, [contacts]);

  /**
   * Zusammenfassung für Dashboard
   */
  const summary = useMemo(() => {
    return {
      total: contacts.length,
      overdue: contactsByStatus.overdue.length,
      dueSoon: contactsByStatus.dueSoon.length,
      needingAction: contactsNeedingReminder.length,
      hasUrgent: urgentContacts.length > 0
    };
  }, [contacts, contactsByStatus, contactsNeedingReminder, urgentContacts]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Data
    contacts,
    stats,
    checkResult,
    
    // Computed
    contactsByStatus,
    contactsNeedingReminder,
    urgentContacts,
    prioritizedContacts,
    summary,
    
    // Status
    isLoading,
    isProcessing,
    error,
    lastUpdated,
    hasContacts: contacts.length > 0,
    hasUrgent: urgentContacts.length > 0,
    
    // Actions
    refresh: loadReminders,
    checkReminders,
    processReminders,
    createReminder,
    
    // Task Actions
    markComplete,
    snoozeTask,
    cancelTask,
    
    // Helpers
    formatDaysSinceProposal,
    getUrgencyLevel,
    getPriorityCategory,
    getReminderStatus,
    
    // Constants
    REMINDER_STATUS,
    PRIORITY_CONFIG,
    DEFAULT_REMINDER_CONFIG
  };
}

/**
 * Hook für einzelnen Kontakt-Reminder Status
 */
export function useContactReminderStatus(contactId, workspaceId) {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async () => {
    if (!contactId || !workspaceId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Hier könnte eine spezifische RPC für einzelnen Kontakt aufgerufen werden
      // Für jetzt nutzen wir die View
      const reminders = await getPendingProposalReminders(workspaceId);
      const contactReminder = reminders.find(r => r.contact_id === contactId);
      setStatus(contactReminder || null);
    } catch (err) {
      console.error('❌ Check Contact Status Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [contactId, workspaceId]);

  const createReminder = useCallback(async (priorityScore = null) => {
    if (!contactId || !workspaceId) return null;
    
    try {
      const taskId = await createReminderTask(contactId, workspaceId, priorityScore);
      await checkStatus(); // Status neu laden
      return taskId;
    } catch (err) {
      console.error('❌ Create Reminder Error:', err);
      setError(err.message);
      return null;
    }
  }, [contactId, workspaceId, checkStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isLoading,
    error,
    refresh: checkStatus,
    createReminder,
    hasOpenReminder: status?.open_reminder_count > 0,
    daysSinceProposal: status?.days_since_proposal || 0,
    reminderStatus: status?.reminder_status || null,
    suggestedPriority: status?.suggested_priority || 85
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useProposalReminders;

