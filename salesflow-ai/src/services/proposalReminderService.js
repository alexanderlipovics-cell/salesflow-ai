/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - PROPOSAL REMINDER SERVICE                                 ║
 * ║  API Service für automatische Proposal Reminders                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';
import { 
  DEFAULT_REMINDER_CONFIG, 
  getPriorityCategory, 
  getReminderStatus 
} from '../types/proposalReminder';

// ═══════════════════════════════════════════════════════════════════════════
// CORE RPC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft welche Kontakte einen Proposal-Reminder brauchen
 * 
 * @param {string} workspaceId - UUID des Workspace
 * @param {number} [daysThreshold=3] - Tage bis Reminder fällig
 * @returns {Promise<import('../types/proposalReminder').CheckRemindersResult>}
 * 
 * @example
 * const result = await checkProposalReminders('workspace-uuid');
 * console.log(result.contacts_needing_reminder); // 5
 */
export async function checkProposalReminders(workspaceId, daysThreshold = DEFAULT_REMINDER_CONFIG.daysThreshold) {
  const { data, error } = await supabase.rpc('check_proposal_reminders', {
    p_workspace_id: workspaceId,
    p_days_threshold: daysThreshold
  });

  if (error) {
    console.error('❌ Check Proposal Reminders Error:', error);
    throw error;
  }

  return data || { success: false, contacts: [] };
}

/**
 * Verarbeitet alle Proposal-Reminders und erstellt Tasks
 * 
 * @param {string} workspaceId - UUID des Workspace
 * @param {number} [daysThreshold=3] - Tage bis Reminder fällig
 * @param {boolean} [autoCreate=true] - Automatisch Tasks erstellen
 * @returns {Promise<import('../types/proposalReminder').ProcessRemindersResult>}
 * 
 * @example
 * const result = await processProposalReminders('workspace-uuid', 3, true);
 * console.log(result.tasks_created); // 3
 */
export async function processProposalReminders(
  workspaceId, 
  daysThreshold = DEFAULT_REMINDER_CONFIG.daysThreshold, 
  autoCreate = DEFAULT_REMINDER_CONFIG.autoCreate
) {
  const { data, error } = await supabase.rpc('process_proposal_reminders', {
    p_workspace_id: workspaceId,
    p_days_threshold: daysThreshold,
    p_auto_create: autoCreate
  });

  if (error) {
    console.error('❌ Process Proposal Reminders Error:', error);
    throw error;
  }

  return data || { success: false, tasks_created: 0 };
}

/**
 * Erstellt einen einzelnen Reminder-Task für einen Kontakt
 * 
 * @param {string} contactId - UUID des Kontakts
 * @param {string} workspaceId - UUID des Workspace
 * @param {number} [priorityScore] - Optionaler Priority Score (85-95)
 * @returns {Promise<string|null>} Task-UUID oder null bei Fehler
 * 
 * @example
 * const taskId = await createReminderTask('contact-uuid', 'workspace-uuid', 90);
 */
export async function createReminderTask(contactId, workspaceId, priorityScore = null) {
  const { data, error } = await supabase.rpc('create_reminder_task', {
    p_contact_id: contactId,
    p_workspace_id: workspaceId,
    p_priority_score: priorityScore
  });

  if (error) {
    console.error('❌ Create Reminder Task Error:', error);
    throw error;
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// VIEW FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt alle pending Proposal Reminders aus der View
 * 
 * @param {string} workspaceId - UUID des Workspace
 * @returns {Promise<Array<import('../types/proposalReminder').PendingProposalReminder>>}
 */
export async function getPendingProposalReminders(workspaceId) {
  const { data, error } = await supabase
    .from('v_pending_proposal_reminders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('days_since_proposal', { ascending: false });

  if (error) {
    console.error('❌ Get Pending Reminders Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Holt Reminder-Tasks für einen Kontakt
 * 
 * @param {string} contactId - UUID des Kontakts
 * @returns {Promise<Array<import('../types/proposalReminder').ReminderTask>>}
 */
export async function getReminderTasksForContact(contactId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('contact_id', contactId)
    .eq('task_type', 'reminder')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Get Reminder Tasks Error:', error);
    throw error;
  }

  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Markiert einen Reminder-Task als erledigt
 * 
 * @param {string} taskId - UUID des Tasks
 * @returns {Promise<boolean>} Erfolg
 */
export async function completeReminderTask(taskId) {
  const { error } = await supabase
    .from('tasks')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', taskId);

  if (error) {
    console.error('❌ Complete Reminder Task Error:', error);
    throw error;
  }

  return true;
}

/**
 * Verschiebt einen Reminder-Task (snooze)
 * 
 * @param {string} taskId - UUID des Tasks
 * @param {number} days - Tage zum Verschieben
 * @returns {Promise<boolean>} Erfolg
 */
export async function snoozeReminderTask(taskId, days = 1) {
  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + days);

  const { error } = await supabase
    .from('tasks')
    .update({ 
      due_at: newDueDate.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId);

  if (error) {
    console.error('❌ Snooze Reminder Task Error:', error);
    throw error;
  }

  return true;
}

/**
 * Löscht/storniert einen Reminder-Task
 * 
 * @param {string} taskId - UUID des Tasks
 * @returns {Promise<boolean>} Erfolg
 */
export async function cancelReminderTask(taskId) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'cancelled' })
    .eq('id', taskId);

  if (error) {
    console.error('❌ Cancel Reminder Task Error:', error);
    throw error;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt Reminder-Statistiken für einen Workspace
 * 
 * @param {string} workspaceId - UUID des Workspace
 * @returns {Promise<Object>} Statistiken
 */
export async function getReminderStats(workspaceId) {
  try {
    // Alle pending reminders holen
    const reminders = await getPendingProposalReminders(workspaceId);
    
    // Statistiken berechnen
    const stats = {
      total: reminders.length,
      overdue: reminders.filter(r => r.reminder_status === 'overdue').length,
      dueSoon: reminders.filter(r => r.reminder_status === 'due_soon').length,
      scheduled: reminders.filter(r => r.reminder_status === 'scheduled').length,
      withOpenReminder: reminders.filter(r => r.open_reminder_count > 0).length,
      needingReminder: reminders.filter(r => r.open_reminder_count === 0).length,
      avgDaysSinceProposal: reminders.length > 0 
        ? Math.round(reminders.reduce((sum, r) => sum + r.days_since_proposal, 0) / reminders.length)
        : 0,
      highestPriority: reminders.length > 0
        ? Math.max(...reminders.map(r => r.suggested_priority))
        : 0
    };

    return stats;
  } catch (error) {
    console.error('❌ Get Reminder Stats Error:', error);
    return {
      total: 0,
      overdue: 0,
      dueSoon: 0,
      scheduled: 0,
      withOpenReminder: 0,
      needingReminder: 0,
      avgDaysSinceProposal: 0,
      highestPriority: 0
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet Priority Score basierend auf Tagen seit Proposal
 * 
 * @param {number} daysSinceProposal - Tage seit Angebotssendung
 * @returns {number} Priority Score (85-95)
 */
export function calculatePriorityScore(daysSinceProposal) {
  const { priorityBase, priorityMax, priorityIncreasePerDay } = DEFAULT_REMINDER_CONFIG;
  return Math.min(priorityBase + (daysSinceProposal * priorityIncreasePerDay), priorityMax);
}

/**
 * Formatiert Tage seit Proposal für Anzeige
 * 
 * @param {number} days - Anzahl Tage
 * @returns {string} Formatierter Text
 */
export function formatDaysSinceProposal(days) {
  if (days === 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 7) return `Vor ${days} Tagen`;
  if (days < 14) return 'Vor 1 Woche';
  if (days < 30) return `Vor ${Math.floor(days / 7)} Wochen`;
  return `Vor ${Math.floor(days / 30)} Monat(en)`;
}

/**
 * Bestimmt Urgency-Level für UI-Darstellung
 * 
 * @param {number} daysSinceProposal - Tage seit Angebotssendung
 * @param {boolean} hasOpenReminder - Ob bereits Reminder existiert
 * @returns {'critical'|'urgent'|'normal'|'handled'} Urgency Level
 */
export function getUrgencyLevel(daysSinceProposal, hasOpenReminder) {
  if (hasOpenReminder) return 'handled';
  if (daysSinceProposal >= 7) return 'critical';
  if (daysSinceProposal >= 5) return 'urgent';
  return 'normal';
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Core RPC
  checkProposalReminders,
  processProposalReminders,
  createReminderTask,
  
  // View Functions
  getPendingProposalReminders,
  getReminderTasksForContact,
  
  // Task Management
  completeReminderTask,
  snoozeReminderTask,
  cancelReminderTask,
  
  // Statistics
  getReminderStats,
  
  // Helpers
  calculatePriorityScore,
  formatDaysSinceProposal,
  getUrgencyLevel,
  getPriorityCategory,
  getReminderStatus
};

