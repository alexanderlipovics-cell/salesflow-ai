/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CHAT IMPORT SERVICE                                                        ║
 * ║  API-Service für Chat-Import und Contact Plans                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG, apiFetch, apiGet, apiPost } from './apiConfig';

// =============================================================================
// CHAT IMPORT API
// =============================================================================

/**
 * Chat-Import analysieren
 */
export async function analyzeChat(rawText, options = {}, accessToken = null) {
  const response = await apiFetch(
    '/chat-import/analyze',
    {
      method: 'POST',
      body: JSON.stringify({
        raw_text: rawText,
        channel: options.channel || null,
        vertical_id: options.verticalId || null,
        company_id: options.companyId || null,
        extract_templates: options.extractTemplates ?? true,
        extract_objections: options.extractObjections ?? true,
        create_contact_plan: options.createContactPlan ?? true,
        save_as_learning_case: options.saveAsLearningCase ?? false,
        language: options.language || 'de',
      }),
    },
    accessToken
  );

  if (!response.ok) {
    throw new Error(`Analyse fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Importiertes Ergebnis speichern
 */
export async function saveImport(importResult, rawText, options = {}, accessToken = null) {
  const response = await apiFetch(
    '/chat-import/save',
    {
      method: 'POST',
      body: JSON.stringify({
        import_result: importResult,
        raw_text: rawText,
        lead_name_override: options.nameOverride || null,
        lead_status_override: options.statusOverride || null,
        deal_state_override: options.dealStateOverride || null,
        create_lead: options.createLead ?? true,
        create_contact_plan: options.createContactPlan ?? true,
        save_templates: options.saveTemplates ?? true,
        save_objections: options.saveObjections ?? true,
        save_as_learning_case: options.saveAsLearningCase ?? false,
        learning_case_goal: options.learningCaseGoal || null,
        learning_case_outcome: options.learningCaseOutcome || null,
      }),
    },
    accessToken
  );

  if (!response.ok) {
    throw new Error(`Speichern fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Schnell-Import (Analyse + Speichern in einem Schritt)
 */
export async function quickImport(rawText, options = {}, accessToken = null) {
  const response = await apiFetch(
    '/chat-import/quick',
    {
      method: 'POST',
      body: JSON.stringify({
        raw_text: rawText,
        channel: options.channel || null,
        vertical_id: options.verticalId || null,
        company_id: options.companyId || null,
        extract_templates: options.extractTemplates ?? true,
        extract_objections: options.extractObjections ?? true,
        create_contact_plan: options.createContactPlan ?? true,
        save_as_learning_case: options.saveAsLearningCase ?? false,
        language: options.language || 'de',
      }),
    },
    accessToken
  );

  if (!response.ok) {
    throw new Error(`Import fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// CONTACT PLANS API
// =============================================================================

/**
 * Heutige Contact Plans abrufen
 */
export async function getTodaysContactPlans(accessToken = null) {
  try {
    const response = await apiFetch('/chat-import/contact-plans/today', { method: 'GET' }, accessToken);
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.log('Contact Plans nicht verfügbar:', error);
    return [];
  }
}

/**
 * Überfällige Contact Plans abrufen
 */
export async function getOverdueContactPlans(accessToken = null) {
  try {
    const response = await apiFetch('/chat-import/contact-plans/overdue', { method: 'GET' }, accessToken);
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.log('Overdue Contact Plans nicht verfügbar:', error);
    return [];
  }
}

/**
 * Kommende Contact Plans abrufen
 */
export async function getUpcomingContactPlans(days = 7, accessToken = null) {
  try {
    const response = await apiFetch(`/chat-import/contact-plans/upcoming?days=${days}`, { method: 'GET' }, accessToken);
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.log('Upcoming Contact Plans nicht verfügbar:', error);
    return [];
  }
}

/**
 * Contact Plan abschließen
 */
export async function completeContactPlan(planId, note = null, accessToken = null) {
  const response = await apiFetch(
    `/chat-import/contact-plans/${planId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    },
    accessToken
  );

  if (!response.ok) {
    throw new Error(`Abschließen fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Contact Plan überspringen
 */
export async function skipContactPlan(planId, reason = null, accessToken = null) {
  const response = await apiFetch(
    `/chat-import/contact-plans/${planId}/skip`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
    accessToken
  );

  if (!response.ok) {
    throw new Error(`Überspringen fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Contact Plan verschieben
 */
export async function rescheduleContactPlan(planId, newDate, accessToken = null) {
  const response = await apiFetch(
    `/chat-import/contact-plans/${planId}/reschedule`,
    {
      method: 'POST',
      body: JSON.stringify({ new_date: newDate }),
    },
    accessToken
  );

  if (!response.ok) {
    throw new Error(`Verschieben fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// TEMPLATES API
// =============================================================================

/**
 * Extrahierte Templates abrufen
 */
export async function getTemplates(options = {}, accessToken = null) {
  try {
    const params = new URLSearchParams();
    if (options.useCase) params.set('use_case', options.useCase);
    if (options.channel) params.set('channel', options.channel);
    params.set('limit', String(options.limit || 50));

    const response = await apiFetch(`/chat-import/templates?${params}`, { method: 'GET' }, accessToken);
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.log('Templates nicht verfügbar:', error);
    return [];
  }
}

/**
 * Template-Nutzung protokollieren
 */
export async function useTemplate(templateId, success = true, accessToken = null) {
  const response = await apiFetch(
    `/chat-import/templates/${templateId}/use?success=${success}`,
    { method: 'POST' },
    accessToken
  );

  if (!response.ok) {
    throw new Error(`Template-Nutzung protokollieren fehlgeschlagen: ${response.status}`);
  }

  return response.json();
}

/**
 * Template Use-Cases abrufen
 */
export async function getTemplateUseCases(accessToken = null) {
  try {
    const response = await apiFetch('/chat-import/templates/use-cases', { method: 'GET' }, accessToken);
    if (!response.ok) return [];
    return response.json();
  } catch (error) {
    console.log('Use-Cases nicht verfügbar:', error);
    return [];
  }
}

// =============================================================================
// ACTION TYPE HELPERS
// =============================================================================

/**
 * Action-Type Konfiguration
 */
export const ACTION_TYPE_CONFIG = {
  no_action: { label: 'Keine Aktion', icon: '⚪', color: '#9CA3AF' },
  follow_up_message: { label: 'Follow-up senden', icon: '💬', color: '#3B82F6' },
  call: { label: 'Anrufen', icon: '📞', color: '#10B981' },
  check_payment: { label: 'Zahlung prüfen', icon: '💳', color: '#F59E0B' },
  reactivation_follow_up: { label: 'Reaktivieren', icon: '🔄', color: '#8B5CF6' },
  send_info: { label: 'Infos senden', icon: '📄', color: '#06B6D4' },
  schedule_meeting: { label: 'Termin vereinbaren', icon: '📅', color: '#EC4899' },
  wait_for_lead: { label: 'Auf Lead warten', icon: '⏳', color: '#6B7280' },
  custom: { label: 'Benutzerdefiniert', icon: '✨', color: '#1F2937' },
};

/**
 * Action-Type Label abrufen
 */
export function getActionTypeLabel(type) {
  return ACTION_TYPE_CONFIG[type]?.label || type;
}

/**
 * Action-Type Icon abrufen
 */
export function getActionTypeIcon(type) {
  return ACTION_TYPE_CONFIG[type]?.icon || '❓';
}

/**
 * Action-Type Farbe abrufen
 */
export function getActionTypeColor(type) {
  return ACTION_TYPE_CONFIG[type]?.color || '#9CA3AF';
}

// =============================================================================
// DEAL STATE HELPERS
// =============================================================================

/**
 * Deal-State Konfiguration
 */
export const DEAL_STATE_CONFIG = {
  none: { label: 'Kein Deal', icon: '⚪', color: '#9CA3AF' },
  considering: { label: 'Überlegt', icon: '🤔', color: '#F59E0B' },
  pending_payment: { label: 'Zahlung ausstehend', icon: '💳', color: '#EF4444', urgent: true },
  paid: { label: 'Bezahlt', icon: '✅', color: '#10B981' },
  on_hold: { label: 'Pausiert', icon: '⏸️', color: '#8B5CF6' },
  lost: { label: 'Verloren', icon: '❌', color: '#EF4444' },
};

/**
 * Deal-State Label abrufen
 */
export function getDealStateLabel(state) {
  return DEAL_STATE_CONFIG[state]?.label || state;
}

/**
 * Deal-State Icon abrufen
 */
export function getDealStateIcon(state) {
  return DEAL_STATE_CONFIG[state]?.icon || '❓';
}

/**
 * Deal-State Farbe abrufen
 */
export function getDealStateColor(state) {
  return DEAL_STATE_CONFIG[state]?.color || '#9CA3AF';
}

/**
 * Prüft ob Deal-State dringend ist
 */
export function isDealStateUrgent(state) {
  return DEAL_STATE_CONFIG[state]?.urgent || false;
}

// =============================================================================
// EXPORT
// =============================================================================

export const ChatImportService = {
  // Chat Import
  analyzeChat,
  saveImport,
  quickImport,
  
  // Contact Plans
  getTodaysContactPlans,
  getOverdueContactPlans,
  getUpcomingContactPlans,
  completeContactPlan,
  skipContactPlan,
  rescheduleContactPlan,
  
  // Templates
  getTemplates,
  useTemplate,
  getTemplateUseCases,
  
  // Helpers
  ACTION_TYPE_CONFIG,
  getActionTypeLabel,
  getActionTypeIcon,
  getActionTypeColor,
  DEAL_STATE_CONFIG,
  getDealStateLabel,
  getDealStateIcon,
  getDealStateColor,
  isDealStateUrgent,
};

export default ChatImportService;

