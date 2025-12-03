/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DAILY FLOW SERVICE                                                        ║
 * ║  Unified Actions API Client                                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Dieser Service kombiniert:
 * - Pending Actions (Zahlungsprüfungen, Follow-ups)
 * - Daily Flow Actions (aus Tagesplan)
 * - Automatisch priorisiert
 */

import { supabase } from './supabase';
import { API_CONFIG } from './apiConfig';

// =============================================================================
// HELPER
// =============================================================================

const getApiUrl = () => API_CONFIG.baseUrl;

const getAuthHeaders = async () => {
  const session = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.data.session?.access_token}`,
  };
};

export class DailyFlowError extends Error {
  constructor(message, code = 'UNKNOWN', details = null) {
    super(message);
    this.name = 'DailyFlowError';
    this.code = code;
    this.details = details;
  }
}

// =============================================================================
// CONFIG MANAGEMENT
// =============================================================================

/**
 * Holt die Daily Flow Konfiguration
 */
export async function getDailyFlowConfig() {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/config`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      // Return default config
      return {
        target_deals_per_period: 10,
        period: 'month',
        work_days: [1, 2, 3, 4, 5],
        work_hours: { start: 9, end: 18 },
      };
    }
    
    return response.json();
  } catch (err) {
    console.log('getDailyFlowConfig: Using defaults');
    return {
      target_deals_per_period: 10,
      period: 'month',
      work_days: [1, 2, 3, 4, 5],
      work_hours: { start: 9, end: 18 },
    };
  }
}

/**
 * Speichert die Daily Flow Konfiguration
 */
export async function saveDailyFlowConfig(config) {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/config`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(config),
      }
    );
    
    if (!response.ok) {
      throw new DailyFlowError('Config konnte nicht gespeichert werden');
    }
    
    return response.json();
  } catch (err) {
    console.log('saveDailyFlowConfig error:', err);
    return config; // Return the config as fallback
  }
}

/**
 * Holt den Tagesplan
 */
export async function getDailyPlan(date = null) {
  try {
    const params = date ? `?date=${date}` : '';
    const response = await fetch(
      `${getApiUrl()}/daily-flow/plan${params}`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  } catch (err) {
    console.log('getDailyPlan: No plan available');
    return null;
  }
}

/**
 * Generiert einen neuen Tagesplan
 */
export async function generateDailyPlan(date = null) {
  try {
    const params = date ? `?date=${date}` : '';
    const response = await fetch(
      `${getApiUrl()}/daily-flow/plan/generate${params}`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
      }
    );
    
    if (!response.ok) {
      // Return demo plan
      return {
        id: 'demo-plan',
        date: date || new Date().toISOString().split('T')[0],
        state: 'ACTIVE',
        actions: [],
      };
    }
    
    return response.json();
  } catch (err) {
    console.log('generateDailyPlan: Using demo plan');
    return {
      id: 'demo-plan',
      date: date || new Date().toISOString().split('T')[0],
      state: 'ACTIVE',
      actions: [],
    };
  }
}

/**
 * Überspringt eine Action
 */
export async function skipAction(actionId, reason = '') {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/actions/${actionId}/skip`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );
    
    if (!response.ok) {
      throw new DailyFlowError('Action konnte nicht übersprungen werden');
    }
    
    return response.json();
  } catch (err) {
    console.log('skipAction error:', err);
    return { success: true };
  }
}

/**
 * Startet eine Action
 */
export async function startAction(actionId) {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/actions/${actionId}/start`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
      }
    );
    
    if (!response.ok) {
      throw new DailyFlowError('Action konnte nicht gestartet werden');
    }
    
    return response.json();
  } catch (err) {
    console.log('startAction error:', err);
    return { success: true };
  }
}

/**
 * Holt die Tagesstatistiken
 */
export async function getDailyStats(date = null) {
  try {
    const params = date ? `?date=${date}` : '';
    const response = await fetch(
      `${getApiUrl()}/daily-flow/stats${params}`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      return {
        total_actions: 0,
        completed_actions: 0,
        skipped_actions: 0,
        completion_rate: 0,
      };
    }
    
    return response.json();
  } catch (err) {
    console.log('getDailyStats: Using defaults');
    return {
      total_actions: 0,
      completed_actions: 0,
      skipped_actions: 0,
      completion_rate: 0,
    };
  }
}

/**
 * Holt Conversion Rates
 */
export async function getConversionRates(days = 30) {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/conversion-rates?days=${days}`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      return {
        contact_to_lead: 0.3,
        lead_to_deal: 0.15,
        overall: 0.045,
      };
    }
    
    return response.json();
  } catch (err) {
    console.log('getConversionRates: Using defaults');
    return {
      contact_to_lead: 0.3,
      lead_to_deal: 0.15,
      overall: 0.045,
    };
  }
}

// =============================================================================
// UNIFIED ACTIONS
// =============================================================================

/**
 * Holt alle vereinheitlichten Actions
 * 
 * @param {Object} options
 * @param {string} options.forDate - Datum im ISO-Format
 * @param {boolean} options.includeCompleted - Auch abgeschlossene?
 * @param {number} options.limit - Max. Anzahl
 * @returns {Promise<Array>} Unified Actions
 */
export async function getUnifiedActions({
  forDate = null,
  includeCompleted = false,
  limit = 50,
} = {}) {
  try {
    const params = new URLSearchParams();
    if (forDate) params.append('for_date', forDate);
    params.append('include_completed', includeCompleted);
    params.append('limit', limit);
    
    const response = await fetch(
      `${getApiUrl()}/daily-flow/unified-actions?${params}`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      throw new DailyFlowError(
        'Actions konnten nicht geladen werden',
        response.status,
        await response.json()
      );
    }
    
    return response.json();
  } catch (err) {
    console.error('getUnifiedActions error:', err);
    throw err instanceof DailyFlowError ? err : new DailyFlowError(err.message);
  }
}

/**
 * Holt die Tages-Zusammenfassung
 * 
 * @param {string} forDate - Optional: Datum im ISO-Format
 * @returns {Promise<Object>} Daily Summary
 */
export async function getDailySummary(forDate = null) {
  try {
    const params = new URLSearchParams();
    if (forDate) params.append('for_date', forDate);
    
    const response = await fetch(
      `${getApiUrl()}/daily-flow/summary?${params}`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      throw new DailyFlowError(
        'Summary konnte nicht geladen werden',
        response.status
      );
    }
    
    return response.json();
  } catch (err) {
    console.error('getDailySummary error:', err);
    throw err instanceof DailyFlowError ? err : new DailyFlowError(err.message);
  }
}

/**
 * Holt nur dringende Actions
 * 
 * @param {number} limit - Max. Anzahl
 * @returns {Promise<Array>} Urgent Actions
 */
export async function getUrgentActions(limit = 10) {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/urgent-actions?limit=${limit}`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      throw new DailyFlowError('Urgent Actions konnten nicht geladen werden');
    }
    
    return response.json();
  } catch (err) {
    console.error('getUrgentActions error:', err);
    throw err instanceof DailyFlowError ? err : new DailyFlowError(err.message);
  }
}

/**
 * Holt alle Zahlungsprüfungen
 * 
 * @returns {Promise<Array>} Payment Check Actions
 */
export async function getPaymentChecks() {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/payment-checks`,
      { headers: await getAuthHeaders() }
    );
    
    if (!response.ok) {
      throw new DailyFlowError('Payment Checks konnten nicht geladen werden');
    }
    
    return response.json();
  } catch (err) {
    console.error('getPaymentChecks error:', err);
    throw err instanceof DailyFlowError ? err : new DailyFlowError(err.message);
  }
}

// =============================================================================
// ACTION MANAGEMENT
// =============================================================================

/**
 * Markiert eine Action als abgeschlossen
 * 
 * @param {string} actionId - ID der Action
 * @param {string} source - 'pending_action' oder 'daily_flow'
 * @param {Object} options
 * @param {string} options.notes - Optionale Notizen
 * @param {string} options.outcome - Optionales Ergebnis
 * @returns {Promise<Object>}
 */
export async function completeAction(actionId, source, { notes = null, outcome = null } = {}) {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/actions/${actionId}/complete?source=${source}`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ notes, outcome }),
      }
    );
    
    if (!response.ok) {
      throw new DailyFlowError('Action konnte nicht abgeschlossen werden');
    }
    
    return response.json();
  } catch (err) {
    console.error('completeAction error:', err);
    throw err instanceof DailyFlowError ? err : new DailyFlowError(err.message);
  }
}

/**
 * Verschiebt eine Action auf später
 * 
 * @param {string} actionId - ID der Action
 * @param {string} source - 'pending_action' oder 'daily_flow'
 * @param {string} snoozeUntil - Datum im ISO-Format
 * @returns {Promise<Object>}
 */
export async function snoozeAction(actionId, source, snoozeUntil) {
  try {
    const response = await fetch(
      `${getApiUrl()}/daily-flow/actions/${actionId}/snooze?source=${source}`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ snooze_until: snoozeUntil }),
      }
    );
    
    if (!response.ok) {
      throw new DailyFlowError('Action konnte nicht verschoben werden');
    }
    
    return response.json();
  } catch (err) {
    console.error('snoozeAction error:', err);
    throw err instanceof DailyFlowError ? err : new DailyFlowError(err.message);
  }
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

/**
 * Schnell-Verschieben auf morgen
 */
export async function snoozeUntilTomorrow(actionId, source) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return snoozeAction(actionId, source, tomorrow.toISOString().split('T')[0]);
}

/**
 * Schnell-Verschieben auf nächste Woche
 */
export async function snoozeUntilNextWeek(actionId, source) {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return snoozeAction(actionId, source, nextWeek.toISOString().split('T')[0]);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formatiert Action-Type für Anzeige
 */
export function formatActionType(type) {
  const labels = {
    check_payment: '💰 Zahlung prüfen',
    follow_up: '📱 Follow-up',
    call: '📞 Anrufen',
    send_info: '📄 Infos senden',
    new_contact: '👋 Neuer Kontakt',
    reactivation: '🔄 Reaktivieren',
    close: '🎯 Abschluss',
    wait_for_lead: '⏳ Warten',
  };
  return labels[type] || type;
}

/**
 * Gibt die Prioritäts-Farbe zurück
 */
export function getPriorityColor(priority, isUrgent = false, isOverdue = false) {
  if (isOverdue) return '#EF4444'; // Rot
  if (isUrgent) return '#F59E0B'; // Orange
  
  const colors = {
    1: '#EF4444', // Rot - Höchste
    2: '#F59E0B', // Orange
    3: '#10B981', // Grün
    4: '#6B7280', // Grau
  };
  return colors[priority] || colors[3];
}

/**
 * Gruppiert Actions nach Typ
 */
export function groupActionsByType(actions) {
  return actions.reduce((groups, action) => {
    const type = action.action_type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(action);
    return groups;
  }, {});
}

/**
 * Gruppiert Actions nach Status
 * @param {Array} actions - Liste der Actions
 * @returns {Object} Gruppierte Actions { pending, in_progress, done, skipped, snoozed }
 */
export function groupActionsByStatus(actions) {
  const grouped = {
    pending: [],
    in_progress: [],
    done: [],
    skipped: [],
    snoozed: [],
  };
  
  if (!actions || !Array.isArray(actions)) return grouped;
  
  actions.forEach(action => {
    const status = action.status || 'pending';
    if (grouped[status]) {
      grouped[status].push(action);
    } else {
      grouped.pending.push(action);
    }
  });
  
  return grouped;
}

/**
 * Berechnet Fortschritt in Prozent
 * @param {Object} plan - Tagesplan
 * @returns {number} Fortschritt 0-100
 */
export function getProgressPercentage(plan) {
  if (!plan || !plan.actions || plan.actions.length === 0) return 0;
  
  const total = plan.actions.length;
  const done = plan.actions.filter(a => a.status === 'done').length;
  
  return Math.round((done / total) * 100);
}

/**
 * Berechnet geschätzte Zeit
 */
export function estimateTimeForActions(actions) {
  const estimates = {
    check_payment: 5,
    follow_up: 8,
    call: 15,
    send_info: 5,
    new_contact: 10,
    reactivation: 8,
    close: 20,
    wait_for_lead: 2,
  };
  
  return actions.reduce((total, action) => {
    return total + (estimates[action.action_type] || 5);
  }, 0);
}

// =============================================================================
// EXPORT
// =============================================================================

export default {
  // Config
  getDailyFlowConfig,
  saveDailyFlowConfig,
  // Plan
  getDailyPlan,
  generateDailyPlan,
  // Actions
  getUnifiedActions,
  getDailySummary,
  getUrgentActions,
  getPaymentChecks,
  completeAction,
  skipAction,
  snoozeAction,
  startAction,
  snoozeUntilTomorrow,
  snoozeUntilNextWeek,
  // Stats
  getDailyStats,
  getConversionRates,
  // Helpers
  formatActionType,
  getPriorityColor,
  groupActionsByType,
  groupActionsByStatus,
  getProgressPercentage,
  estimateTimeForActions,
  // Error
  DailyFlowError,
};
