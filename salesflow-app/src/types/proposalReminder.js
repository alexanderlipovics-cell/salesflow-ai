/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - PROPOSAL REMINDER TYPES                                   ║
 * ║  TypeScript-ähnliche JSDoc Types für Proposal Reminders                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * @typedef {Object} ProposalContact
 * @property {string} contact_id - UUID des Kontakts
 * @property {string} name - Name des Kontakts
 * @property {string|null} email - E-Mail Adresse
 * @property {string|null} phone - Telefonnummer
 * @property {string|null} company - Firmenname
 * @property {number} days_since_proposal - Tage seit Angebotssendung
 * @property {string} proposal_sent_at - ISO Timestamp der Angebotssendung
 * @property {Array<ExistingReminder>} existing_reminders - Offene Reminders
 * @property {boolean} has_open_reminder - Ob bereits ein Reminder existiert
 * @property {number} priority_score - Berechneter Priority Score (85-95)
 */

/**
 * @typedef {Object} ExistingReminder
 * @property {string} task_id - UUID des Tasks
 * @property {string} title - Task-Titel
 * @property {string} status - Status (pending, completed, cancelled)
 * @property {string} due_at - Fälligkeitsdatum
 */

/**
 * @typedef {Object} CheckRemindersResult
 * @property {boolean} success - Ob die Abfrage erfolgreich war
 * @property {string} workspace_id - UUID des Workspace
 * @property {number} days_threshold - Konfigurierte Tage bis Reminder
 * @property {string} checked_at - Zeitpunkt der Prüfung
 * @property {number} total_contacts - Anzahl Kontakte mit proposal_sent
 * @property {number} contacts_needing_reminder - Anzahl die Reminder brauchen
 * @property {Array<ProposalContact>} contacts - Liste der Kontakte
 */

/**
 * @typedef {Object} ProcessRemindersResult
 * @property {boolean} success - Ob die Verarbeitung erfolgreich war
 * @property {string} workspace_id - UUID des Workspace
 * @property {number} days_threshold - Konfigurierte Tage bis Reminder
 * @property {boolean} auto_create - Ob automatische Erstellung aktiv war
 * @property {number} tasks_created - Anzahl erstellter Tasks
 * @property {Array<string>} created_task_ids - UUIDs der erstellten Tasks
 * @property {Array<ProposalContact>} contacts - Liste der Kontakte
 */

/**
 * @typedef {Object} ReminderTask
 * @property {string} id - UUID des Tasks
 * @property {string} workspace_id - UUID des Workspace
 * @property {string} contact_id - UUID des Kontakts
 * @property {string} task_type - Task-Typ ('reminder')
 * @property {string} title - Task-Titel
 * @property {string} description - Beschreibung
 * @property {number} priority_score - Priorität (85-95)
 * @property {string} due_at - Fälligkeitsdatum
 * @property {string} status - Status (pending, completed, cancelled)
 * @property {string} created_at - Erstellungszeitpunkt
 * @property {string} updated_at - Aktualisierungszeitpunkt
 */

/**
 * @typedef {Object} PendingProposalReminder
 * @property {string} contact_id - UUID des Kontakts
 * @property {string} workspace_id - UUID des Workspace
 * @property {string} name - Kontaktname
 * @property {string|null} email - E-Mail
 * @property {string|null} phone - Telefon
 * @property {string|null} company - Firma
 * @property {string} status - Kontaktstatus
 * @property {string} proposal_sent_at - Zeitpunkt der Angebotssendung
 * @property {number} days_since_proposal - Tage seit Angebot
 * @property {string} reminder_scheduled_for - Geplanter Reminder-Zeitpunkt
 * @property {'overdue'|'due_soon'|'scheduled'} reminder_status - Status des Reminders
 * @property {number} suggested_priority - Empfohlene Priorität
 * @property {number} open_reminder_count - Anzahl offener Reminders
 */

/**
 * Reminder Status Konfiguration
 */
export const REMINDER_STATUS = {
  overdue: {
    label: '🚨 Überfällig',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    description: 'Kontakt wartet auf Nachfassen'
  },
  due_soon: {
    label: '⚠️ Bald fällig',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'In den nächsten 24 Stunden'
  },
  scheduled: {
    label: '📅 Geplant',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    description: 'Reminder ist eingeplant'
  },
  completed: {
    label: '✅ Erledigt',
    color: '#10B981',
    bgColor: '#D1FAE5',
    description: 'Nachfassen erledigt'
  }
};

/**
 * Priority Score Konfiguration
 */
export const PRIORITY_CONFIG = {
  urgent: {
    minScore: 93,
    label: '🔥 Dringend',
    color: '#EF4444',
    bgColor: '#FEE2E2'
  },
  high: {
    minScore: 88,
    label: '⚡ Hoch',
    color: '#F59E0B',
    bgColor: '#FEF3C7'
  },
  normal: {
    minScore: 0,
    label: '📋 Normal',
    color: '#8B5CF6',
    bgColor: '#EDE9FE'
  }
};

/**
 * Default Reminder Konfiguration
 */
export const DEFAULT_REMINDER_CONFIG = {
  daysThreshold: 3,
  autoCreate: true,
  priorityBase: 85,
  priorityMax: 95,
  priorityIncreasePerDay: 2
};

/**
 * Helper: Priority-Kategorie aus Score bestimmen
 * @param {number} score - Priority Score
 * @returns {Object} Priority Konfiguration
 */
export function getPriorityCategory(score) {
  if (score >= PRIORITY_CONFIG.urgent.minScore) return PRIORITY_CONFIG.urgent;
  if (score >= PRIORITY_CONFIG.high.minScore) return PRIORITY_CONFIG.high;
  return PRIORITY_CONFIG.normal;
}

/**
 * Helper: Reminder Status Label
 * @param {string} status - Status Key
 * @returns {Object} Status Konfiguration
 */
export function getReminderStatus(status) {
  return REMINDER_STATUS[status] || REMINDER_STATUS.scheduled;
}

export default {
  REMINDER_STATUS,
  PRIORITY_CONFIG,
  DEFAULT_REMINDER_CONFIG,
  getPriorityCategory,
  getReminderStatus
};

