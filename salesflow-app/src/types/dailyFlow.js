/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - DAILY FLOW TYPES & CONSTANTS                             ║
 * ║  Type-Definitionen und Konstanten für Daily Flow Agent                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS / CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mögliche Status eines Tagesplans
 */
export const DAILY_FLOW_STATES = {
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  BLOCKED: 'BLOCKED',
};

/**
 * Labels für Plan-Status
 */
export const DAILY_FLOW_STATE_LABELS = {
  NOT_CONFIGURED: '⚙️ Nicht konfiguriert',
  PLANNED: '📋 Geplant',
  IN_PROGRESS: '🚀 In Bearbeitung',
  COMPLETED: '✅ Abgeschlossen',
  BLOCKED: '🚫 Blockiert',
};

/**
 * Farben für Plan-Status
 */
export const DAILY_FLOW_STATE_COLORS = {
  NOT_CONFIGURED: '#94a3b8',
  PLANNED: '#06b6d4',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  BLOCKED: '#ef4444',
};

/**
 * Mögliche Status einer Action
 */
export const ACTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  SKIPPED: 'skipped',
  SNOOZED: 'snoozed',
};

/**
 * Labels für Action-Status
 */
export const ACTION_STATUS_LABELS = {
  pending: '⏳ Offen',
  in_progress: '🔄 In Bearbeitung',
  done: '✅ Erledigt',
  skipped: '⏭️ Übersprungen',
  snoozed: '⏰ Verschoben',
};

/**
 * Typen von Actions
 */
export const ACTION_TYPES = {
  NEW_CONTACT: 'new_contact',
  FOLLOWUP: 'followup',
  REACTIVATION: 'reactivation',
  PIPELINE_CLEANUP: 'pipeline_cleanup',
  ADMIN: 'admin',
};

/**
 * Konfiguration für Action-Typen
 */
export const ACTION_TYPE_CONFIG = {
  new_contact: {
    label: 'Neuer Kontakt',
    icon: '👋',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Erstkontakt mit neuem Lead',
  },
  followup: {
    label: 'Follow-up',
    icon: '🔄',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    description: 'Nachfassen bei bestehendem Kontakt',
  },
  reactivation: {
    label: 'Reaktivierung',
    icon: '🔥',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    description: 'Inaktiven Lead reaktivieren',
  },
  pipeline_cleanup: {
    label: 'Pipeline',
    icon: '🧹',
    color: '#64748b',
    bgColor: '#f1f5f9',
    description: 'Pipeline aufräumen',
  },
  admin: {
    label: 'Admin',
    icon: '📋',
    color: '#64748b',
    bgColor: '#f1f5f9',
    description: 'Administrative Aufgabe',
  },
};

/**
 * Kommunikationskanäle
 */
export const CHANNELS = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  PHONE: 'phone',
  SOCIAL: 'social',
  IN_PERSON: 'in_person',
  OTHER: 'other',
};

/**
 * Konfiguration für Kanäle
 */
export const CHANNEL_CONFIG = {
  whatsapp: {
    label: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
  },
  email: {
    label: 'E-Mail',
    icon: '📧',
    color: '#3b82f6',
  },
  phone: {
    label: 'Telefon',
    icon: '📞',
    color: '#f59e0b',
  },
  social: {
    label: 'Social Media',
    icon: '📱',
    color: '#8b5cf6',
  },
  in_person: {
    label: 'Persönlich',
    icon: '🤝',
    color: '#10b981',
  },
  other: {
    label: 'Sonstige',
    icon: '📋',
    color: '#64748b',
  },
};

/**
 * Quellen für Actions
 */
export const ACTION_SOURCES = {
  GOAL_ENGINE: 'goal_engine',
  FOLLOWUP_SYSTEM: 'followup_system',
  NEXT_BEST_ACTIONS: 'next_best_actions',
  MANUAL: 'manual',
};

/**
 * Labels für Action-Quellen
 */
export const ACTION_SOURCE_LABELS = {
  goal_engine: '🎯 Ziel-Engine',
  followup_system: '📋 Follow-up System',
  next_best_actions: '💡 Next Best Actions',
  manual: '✏️ Manuell',
};

/**
 * Ziel-Perioden
 */
export const TARGET_PERIODS = {
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
};

/**
 * Labels für Ziel-Perioden
 */
export const TARGET_PERIOD_LABELS = {
  week: 'Woche',
  month: 'Monat',
  quarter: 'Quartal',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt die Konfiguration für einen Action-Typ zurück
 * @param {string} actionType 
 * @returns {Object}
 */
export function getActionTypeConfig(actionType) {
  return ACTION_TYPE_CONFIG[actionType] || ACTION_TYPE_CONFIG.admin;
}

/**
 * Gibt die Konfiguration für einen Kanal zurück
 * @param {string} channel 
 * @returns {Object}
 */
export function getChannelConfig(channel) {
  return CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.other;
}

/**
 * Gibt die Farbe für einen Plan-Status zurück
 * @param {string} state 
 * @returns {string}
 */
export function getStateColor(state) {
  return DAILY_FLOW_STATE_COLORS[state] || '#64748b';
}

/**
 * Gibt das Label für einen Plan-Status zurück
 * @param {string} state 
 * @returns {string}
 */
export function getStateLabel(state) {
  return DAILY_FLOW_STATE_LABELS[state] || state;
}

/**
 * Berechnet den Fortschritt in Prozent
 * @param {Object} plan 
 * @returns {number}
 */
export function calculateProgress(plan) {
  if (!plan || plan.planned_actions_total === 0) return 0;
  return Math.round((plan.actions_done / plan.planned_actions_total) * 100);
}

/**
 * Prüft ob ein Plan als abgeschlossen gilt (>= 80%)
 * @param {Object} plan 
 * @returns {boolean}
 */
export function isPlanCompleted(plan) {
  return calculateProgress(plan) >= 80;
}

/**
 * Formatiert eine Zeit für die Anzeige
 * @param {string} dateString 
 * @returns {string}
 */
export function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formatiert ein Datum für die Anzeige
 * @param {string} dateString 
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
}

/**
 * Gibt das heutige Datum als YYYY-MM-DD zurück
 * @returns {string}
 */
export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  DAILY_FLOW_STATES,
  DAILY_FLOW_STATE_LABELS,
  DAILY_FLOW_STATE_COLORS,
  ACTION_STATUS,
  ACTION_STATUS_LABELS,
  ACTION_TYPES,
  ACTION_TYPE_CONFIG,
  CHANNELS,
  CHANNEL_CONFIG,
  ACTION_SOURCES,
  ACTION_SOURCE_LABELS,
  TARGET_PERIODS,
  TARGET_PERIOD_LABELS,
  getActionTypeConfig,
  getChannelConfig,
  getStateColor,
  getStateLabel,
  calculateProgress,
  isPlanCompleted,
  formatTime,
  formatDate,
  getTodayString,
};

