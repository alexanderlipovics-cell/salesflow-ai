/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL SERVICE                                         ║
 * ║  Service für Multi-Vertical Support                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class VerticalError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'VerticalError';
    this.code = code;
    this.details = details;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET USER VERTICAL SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt die Vertical-Einstellungen des Users
 * @returns {Promise<Object|null>}
 */
export async function getUserVerticalSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new VerticalError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('get_user_vertical_settings', {
    p_user_id: user.id,
  });

  if (error) {
    throw new VerticalError('Failed to get vertical settings', 'FETCH_ERROR', error);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// SET USER VERTICAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setzt das Vertical für den User
 * @param {string} verticalId - Vertical ID
 * @param {Object} options - Optionale Einstellungen
 * @returns {Promise<Object>}
 */
export async function setUserVertical(verticalId, options = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new VerticalError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('set_user_vertical', {
    p_user_id: user.id,
    p_vertical_id: verticalId,
    p_company_id: options.companyId ?? null,
    p_custom_label: options.customLabel ?? null,
    p_custom_icon: options.customIcon ?? null,
    p_custom_color: options.customColor ?? null,
  });

  if (error) {
    throw new VerticalError('Failed to set vertical', 'UPDATE_ERROR', error);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE DAILY FLOW SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert die Daily Flow Einstellungen
 * @param {Object} settings - Daily Flow Settings
 * @returns {Promise<Object>}
 */
export async function updateVerticalDailyFlow(settings) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new VerticalError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('update_vertical_daily_flow', {
    p_user_id: user.id,
    p_daily_contacts: settings.dailyContacts ?? null,
    p_daily_followups: settings.dailyFollowups ?? null,
    p_daily_reactivations: settings.dailyReactivations ?? null,
  });

  if (error) {
    throw new VerticalError('Failed to update daily flow', 'UPDATE_ERROR', error);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert die Feature-Flags
 * @param {Object} features - Feature Flags
 * @returns {Promise<Object>}
 */
export async function updateVerticalFeatures(features) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new VerticalError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('update_vertical_features', {
    p_user_id: user.id,
    p_enable_lead_scoring: features.leadScoring ?? null,
    p_enable_proposal_reminders: features.proposalReminders ?? null,
    p_enable_team_dashboard: features.teamDashboard ?? null,
    p_enable_finance_tracking: features.financeTracking ?? null,
  });

  if (error) {
    throw new VerticalError('Failed to update features', 'UPDATE_ERROR', error);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Markiert das Vertical-Onboarding als abgeschlossen
 * @returns {Promise<boolean>}
 */
export async function completeVerticalOnboarding() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new VerticalError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('complete_vertical_onboarding', {
    p_user_id: user.id,
  });

  if (error) {
    throw new VerticalError('Failed to complete onboarding', 'UPDATE_ERROR', error);
  }

  return data === true;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK ONBOARDING STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft ob der User das Vertical-Onboarding abgeschlossen hat
 * @returns {Promise<boolean>}
 */
export async function hasCompletedVerticalOnboarding() {
  const settings = await getUserVerticalSettings();
  return settings?.onboarding_completed === true;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  getUserVerticalSettings,
  setUserVertical,
  updateVerticalDailyFlow,
  updateVerticalFeatures,
  completeVerticalOnboarding,
  hasCompletedVerticalOnboarding,
  VerticalError,
};

