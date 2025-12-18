/**
 * Auto-Reminder Service für Sales Flow AI
 * 
 * Erstellt automatisch Follow-up Tasks basierend auf Lead-Status-Änderungen
 * Hauptfunktion: Wenn ein Lead auf "proposal_sent" gesetzt wird,
 * wird automatisch ein Follow-up Reminder erstellt.
 */

import { API_CONFIG } from './apiConfig';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// Konfiguration für Auto-Reminder Trigger
export const AUTO_REMINDER_CONFIG = {
  proposal_sent: {
    enabled: true,
    daysUntilFollowUp: 3,  // 3 Tage nach Angebot nachfassen
    priority: 'high',
    action: 'follow_up',
    descriptionTemplate: (leadName) => 
      `Nachfassen: Angebot an ${leadName} - Entscheidung erfragen`,
    reminderMessage: '📋 Auto-Reminder erstellt: Follow-up in 3 Tagen'
  }
};

/**
 * Berechnet das Fälligkeitsdatum für den Follow-up
 * @param {number} daysFromNow - Anzahl Tage ab heute
 * @returns {string} Datum im Format YYYY-MM-DD
 */
const calculateDueDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

/**
 * Erstellt automatisch einen Follow-up Task
 * @param {Object} params - Parameter für den Follow-up
 * @param {string} params.leadId - ID des Leads
 * @param {string} params.leadName - Name des Leads
 * @param {string} params.userId - ID des Benutzers
 * @param {string} params.newStatus - Neuer Status des Leads
 * @returns {Promise<Object|null>} Erstellter Follow-up oder null
 */
export const createAutoReminder = async ({ leadId, leadName, userId, newStatus }) => {
  const config = AUTO_REMINDER_CONFIG[newStatus];
  
  if (!config || !config.enabled) {
    return null;
  }

  const followUpData = {
    lead_id: leadId,
    lead_name: leadName,
    user_id: userId,
    action: config.action,
    description: config.descriptionTemplate(leadName),
    due_date: calculateDueDate(config.daysUntilFollowUp),
    priority: config.priority,
    completed: false,
    auto_generated: true,
    trigger_status: newStatus
  };

  try {
    const response = await fetch(`${getApiUrl()}/api/follow-ups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followUpData)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Auto-Reminder erstellt:', data);
      return {
        success: true,
        followUp: data,
        message: config.reminderMessage
      };
    } else {
      // Fallback: Lokales Erstellen des Follow-ups
      console.log('⚠️ API nicht erreichbar, lokaler Auto-Reminder');
      return {
        success: true,
        followUp: {
          id: `auto_${Date.now()}`,
          ...followUpData
        },
        message: config.reminderMessage,
        isLocal: true
      };
    }
  } catch (error) {
    console.error('❌ Auto-Reminder Fehler:', error);
    // Auch bei Fehler lokalen Reminder zurückgeben
    return {
      success: true,
      followUp: {
        id: `auto_${Date.now()}`,
        ...followUpData
      },
      message: config.reminderMessage,
      isLocal: true
    };
  }
};

/**
 * Prüft ob für einen Status ein Auto-Reminder konfiguriert ist
 * @param {string} status - Status zum Prüfen
 * @returns {boolean} True wenn Auto-Reminder aktiv
 */
export const hasAutoReminder = (status) => {
  const config = AUTO_REMINDER_CONFIG[status];
  return config && config.enabled;
};

/**
 * Gibt die Reminder-Konfiguration für einen Status zurück
 * @param {string} status - Status zum Abfragen
 * @returns {Object|null} Konfiguration oder null
 */
export const getAutoReminderConfig = (status) => {
  return AUTO_REMINDER_CONFIG[status] || null;
};

export default {
  createAutoReminder,
  hasAutoReminder,
  getAutoReminderConfig,
  AUTO_REMINDER_CONFIG
};

