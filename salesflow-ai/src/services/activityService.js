/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - ACTIVITY SERVICE                                         ║
 * ║  Service für Activity Tracking und Daily Flow Status                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';
import { getTodayDateString } from '../types/activity';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ActivityError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'ActivityError';
    this.code = code;
    this.details = details;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOG ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Loggt eine neue Aktivität
 * @param {Object} input - Activity Input
 * @param {string} input.company_id - Company ID (default: 'default')
 * @param {string} input.activity_type - Art der Aktivität
 * @param {string} [input.channel] - Kommunikationskanal
 * @param {string} [input.lead_id] - Lead ID
 * @param {string} [input.title] - Titel
 * @param {string} [input.notes] - Notizen
 * @param {number} [input.duration_minutes] - Dauer in Minuten
 * @param {string} [input.outcome] - Ergebnis
 * @param {string} [input.occurred_at] - Zeitpunkt
 * @returns {Promise<string>} - Activity ID
 */
export async function logActivity(input) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActivityError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('log_activity', {
    p_user_id: user.id,
    p_company_id: input.company_id ?? 'default',
    p_activity_type: input.activity_type,
    p_channel: input.channel ?? null,
    p_lead_id: input.lead_id ?? null,
    p_title: input.title ?? null,
    p_notes: input.notes ?? null,
    p_duration_minutes: input.duration_minutes ?? null,
    p_outcome: input.outcome ?? null,
    p_occurred_at: input.occurred_at ?? new Date().toISOString(),
  });

  if (error) {
    throw new ActivityError('Failed to log activity', 'LOG_ERROR', error);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET DAILY FLOW STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt den Daily Flow Status für einen User
 * @param {string} [companyId='default'] - Company ID
 * @param {string} [date] - Datum (YYYY-MM-DD)
 * @returns {Promise<Object|null>}
 */
export async function getDailyFlowStatus(companyId = 'default', date = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActivityError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('get_daily_flow_status', {
    p_user_id: user.id,
    p_company_id: companyId,
    p_date: date ?? getTodayDateString(),
  });

  if (error) {
    throw new ActivityError('Failed to get daily flow status', 'FETCH_ERROR', error);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET RECENT ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt die letzten Aktivitäten
 * @param {string} [companyId] - Company ID (optional)
 * @param {number} [limit=20] - Anzahl der Einträge
 * @param {number} [offset=0] - Offset für Pagination
 * @returns {Promise<Array>}
 */
export async function getRecentActivities(companyId = null, limit = 20, offset = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActivityError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('get_recent_activities', {
    p_user_id: user.id,
    p_company_id: companyId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new ActivityError('Failed to get recent activities', 'FETCH_ERROR', error);
  }

  return data ?? [];
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE DAILY FLOW TARGETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert die Daily Flow Targets
 * @param {Object} targets - Neue Ziele
 * @param {string} [companyId='default'] - Company ID
 * @returns {Promise<Object>}
 */
export async function updateDailyFlowTargets(targets, companyId = 'default') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActivityError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('update_daily_flow_targets', {
    p_user_id: user.id,
    p_company_id: companyId,
    p_daily_new_contacts: targets.daily_new_contacts ?? null,
    p_daily_followups: targets.daily_followups ?? null,
    p_daily_reactivations: targets.daily_reactivations ?? null,
    p_weekly_new_contacts: targets.weekly_new_contacts ?? null,
    p_weekly_followups: targets.weekly_followups ?? null,
    p_weekly_reactivations: targets.weekly_reactivations ?? null,
  });

  if (error) {
    throw new ActivityError('Failed to update targets', 'UPDATE_ERROR', error);
  }

  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET DAILY ACTIVITY COUNTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt die Tages-Aktivitätszähler
 * @param {string} [companyId='default'] - Company ID
 * @param {string} [date] - Datum (YYYY-MM-DD)
 * @returns {Promise<Object>}
 */
export async function getDailyActivityCounts(companyId = 'default', date = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActivityError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('get_daily_activity_counts', {
    p_user_id: user.id,
    p_company_id: companyId,
    p_date: date ?? getTodayDateString(),
  });

  if (error) {
    throw new ActivityError('Failed to get daily counts', 'FETCH_ERROR', error);
  }

  // In Object umwandeln
  const counts = {
    new_contact: 0,
    followup: 0,
    reactivation: 0,
    call: 0,
    message: 0,
    meeting: 0,
    presentation: 0,
    close_won: 0,
    close_lost: 0,
    referral: 0,
  };

  (data ?? []).forEach(row => {
    counts[row.activity_type] = Number(row.count) || 0;
  });

  return counts;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET WEEKLY ACTIVITY COUNTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt die Wochen-Aktivitätszähler
 * @param {string} [companyId='default'] - Company ID
 * @param {string} [weekStart] - Wochenstart (YYYY-MM-DD)
 * @returns {Promise<Object>}
 */
export async function getWeeklyActivityCounts(companyId = 'default', weekStart = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActivityError('Not authenticated', 'AUTH_ERROR');

  const { data, error } = await supabase.rpc('get_weekly_activity_counts', {
    p_user_id: user.id,
    p_company_id: companyId,
    p_week_start: weekStart,
  });

  if (error) {
    throw new ActivityError('Failed to get weekly counts', 'FETCH_ERROR', error);
  }

  // In Object umwandeln
  const counts = {
    new_contact: 0,
    followup: 0,
    reactivation: 0,
    call: 0,
    message: 0,
    meeting: 0,
    presentation: 0,
    close_won: 0,
    close_lost: 0,
    referral: 0,
  };

  (data ?? []).forEach(row => {
    counts[row.activity_type] = Number(row.count) || 0;
  });

  return counts;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK LOG HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Loggt einen neuen Kontakt
 * @param {string} [companyId='default'] 
 * @param {string} [leadId] 
 * @param {string} [channel] 
 * @param {string} [notes] 
 * @returns {Promise<string>}
 */
export async function logNewContact(companyId = 'default', leadId = null, channel = null, notes = null) {
  return logActivity({
    company_id: companyId,
    activity_type: 'new_contact',
    lead_id: leadId,
    channel: channel,
    notes: notes,
    title: 'Neuer Kontakt',
  });
}

/**
 * Loggt ein Follow-up
 * @param {string} [companyId='default'] 
 * @param {string} [leadId] 
 * @param {string} [channel] 
 * @param {string} [notes] 
 * @returns {Promise<string>}
 */
export async function logFollowup(companyId = 'default', leadId = null, channel = null, notes = null) {
  return logActivity({
    company_id: companyId,
    activity_type: 'followup',
    lead_id: leadId,
    channel: channel,
    notes: notes,
    title: 'Follow-up',
  });
}

/**
 * Loggt eine Reaktivierung
 * @param {string} [companyId='default'] 
 * @param {string} [leadId] 
 * @param {string} [channel] 
 * @param {string} [notes] 
 * @returns {Promise<string>}
 */
export async function logReactivation(companyId = 'default', leadId = null, channel = null, notes = null) {
  return logActivity({
    company_id: companyId,
    activity_type: 'reactivation',
    lead_id: leadId,
    channel: channel,
    notes: notes,
    title: 'Reaktivierung',
  });
}

/**
 * Loggt einen Anruf
 * @param {string} [companyId='default'] 
 * @param {string} [leadId] 
 * @param {number} [durationMinutes] 
 * @param {string} [outcome] 
 * @param {string} [notes] 
 * @returns {Promise<string>}
 */
export async function logCall(companyId = 'default', leadId = null, durationMinutes = null, outcome = null, notes = null) {
  return logActivity({
    company_id: companyId,
    activity_type: 'call',
    lead_id: leadId,
    channel: 'phone',
    duration_minutes: durationMinutes,
    outcome: outcome,
    notes: notes,
    title: 'Anruf',
  });
}

/**
 * Loggt ein Meeting
 * @param {string} [companyId='default'] 
 * @param {string} [leadId] 
 * @param {number} [durationMinutes] 
 * @param {string} [outcome] 
 * @param {string} [notes] 
 * @returns {Promise<string>}
 */
export async function logMeeting(companyId = 'default', leadId = null, durationMinutes = null, outcome = null, notes = null) {
  return logActivity({
    company_id: companyId,
    activity_type: 'meeting',
    lead_id: leadId,
    duration_minutes: durationMinutes,
    outcome: outcome,
    notes: notes,
    title: 'Meeting',
  });
}

/**
 * Loggt einen Deal-Gewinn
 * @param {string} [companyId='default'] 
 * @param {string} [leadId] 
 * @param {string} [notes] 
 * @returns {Promise<string>}
 */
export async function logCloseWon(companyId = 'default', leadId = null, notes = null) {
  return logActivity({
    company_id: companyId,
    activity_type: 'close_won',
    lead_id: leadId,
    outcome: 'positive',
    notes: notes,
    title: 'Deal gewonnen',
  });
}

/**
 * Loggt einen Deal-Verlust
 * @param {string} [companyId='default'] 
 * @param {string} [leadId] 
 * @param {string} [notes] 
 * @returns {Promise<string>}
 */
export async function logCloseLost(companyId = 'default', leadId = null, notes = null) {
  return logActivity({
    company_id: companyId,
    activity_type: 'close_lost',
    lead_id: leadId,
    outcome: 'negative',
    notes: notes,
    title: 'Deal verloren',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Core Functions
  logActivity,
  getDailyFlowStatus,
  getRecentActivities,
  updateDailyFlowTargets,
  getDailyActivityCounts,
  getWeeklyActivityCounts,
  
  // Quick Log Helpers
  logNewContact,
  logFollowup,
  logReactivation,
  logCall,
  logMeeting,
  logCloseWon,
  logCloseLost,
  
  // Error Class
  ActivityError,
};

