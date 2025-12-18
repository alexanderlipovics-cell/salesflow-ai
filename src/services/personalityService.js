/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - PERSONALITY SERVICE                                       ║
 * ║  Service für DISG-Profile und Contact Plans                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';
import {
  validatePersonalityProfile,
  validateContactPlan,
  validateLeadFullContext,
  validateDiscAnalysisOutput,
  validateFollowUpOutput,
  getDominantStyle
} from '../types/personality';
import {
  DISC_ANALYZER_SYSTEM_PROMPT,
  buildDiscAnalyzerPrompt,
  quickDiscEstimate
} from '../prompts/disc-analyzer';
import {
  FOLLOWUP_GENERATOR_SYSTEM_PROMPT,
  buildFollowUpPrompt,
  getQuickFollowUpTemplate,
  suggestNextContactTiming
} from '../prompts/followup-generator';

// ═══════════════════════════════════════════════════════════════════════════
// PERSONALITY PROFILE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt das Persönlichkeitsprofil eines Leads
 * @param {string} leadId
 * @returns {Promise<import('../types/personality').LeadPersonalityProfile|null>}
 */
export async function getPersonalityProfile(leadId) {
  const { data, error } = await supabase
    .from('lead_personality_profiles')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return validatePersonalityProfile(data);
}

/**
 * Holt mehrere Persönlichkeitsprofile
 * @param {string[]} leadIds
 * @returns {Promise<Map<string, import('../types/personality').LeadPersonalityProfile>>}
 */
export async function getPersonalityProfiles(leadIds) {
  if (leadIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('lead_personality_profiles')
    .select('*')
    .in('lead_id', leadIds);

  if (error) throw error;

  const map = new Map();
  for (const profile of data || []) {
    map.set(profile.lead_id, validatePersonalityProfile(profile));
  }
  return map;
}

/**
 * Erstellt oder aktualisiert ein Persönlichkeitsprofil
 * @param {string} leadId
 * @param {string} workspaceId
 * @param {Object} profile
 * @param {number} profile.disc_d
 * @param {number} profile.disc_i
 * @param {number} profile.disc_s
 * @param {number} profile.disc_g
 * @param {number} profile.confidence
 * @param {number} [profile.messages_analyzed]
 * @param {string} [profile.analysis_notes]
 * @returns {Promise<string>} Profile ID
 */
export async function upsertPersonalityProfile(leadId, workspaceId, profile) {
  const { data, error } = await supabase.rpc('upsert_personality_profile', {
    p_lead_id: leadId,
    p_workspace_id: workspaceId,
    p_disc_d: profile.disc_d,
    p_disc_i: profile.disc_i,
    p_disc_s: profile.disc_s,
    p_disc_g: profile.disc_g,
    p_confidence: profile.confidence,
    p_messages_analyzed: profile.messages_analyzed || 0,
    p_analysis_notes: profile.analysis_notes || null
  });

  if (error) throw error;
  return data;
}

/**
 * Analysiert Chat-Nachrichten und speichert DISG-Profil
 * @param {string} leadId
 * @param {string} workspaceId
 * @param {Array<{from: 'user'|'lead', text: string, timestamp: string}>} messages
 * @param {Object} [options]
 * @param {boolean} [options.useAI=true] Ob AI verwendet werden soll
 * @param {string} [options.leadName]
 * @returns {Promise<import('../types/personality').LeadPersonalityProfile>}
 */
export async function analyzeAndSavePersonality(leadId, workspaceId, messages, options = {}) {
  const { useAI = true, leadName = 'Lead' } = options;

  let analysis;

  if (useAI) {
    try {
      analysis = await analyzeDiscProfileWithAI(messages, leadName);
    } catch (e) {
      console.warn('AI analysis failed, falling back to quick estimate:', e);
      analysis = quickDiscEstimate(messages);
      analysis.reasoning = 'Regelbasierte Schnellanalyse (AI nicht verfügbar)';
    }
  } else {
    analysis = quickDiscEstimate(messages);
    analysis.reasoning = 'Regelbasierte Schnellanalyse';
  }

  // Speichere Profil
  await upsertPersonalityProfile(leadId, workspaceId, {
    disc_d: analysis.disc_d,
    disc_i: analysis.disc_i,
    disc_s: analysis.disc_s,
    disc_g: analysis.disc_g,
    confidence: analysis.confidence,
    messages_analyzed: messages.filter(m => m.from === 'lead').length,
    analysis_notes: analysis.reasoning
  });

  // Hole aktualisiertes Profil
  return getPersonalityProfile(leadId);
}

/**
 * Interne Funktion: AI-basierte DISG-Analyse
 */
async function analyzeDiscProfileWithAI(messages, leadName) {
  const prompt = buildDiscAnalyzerPrompt({
    messages,
    leadName,
    context: undefined
  });

  // API Call - muss an das jeweilige AI-Backend angepasst werden
  const response = await fetch('/api/v1/ai/analyze-disc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_prompt: DISC_ANALYZER_SYSTEM_PROMPT,
      user_prompt: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return validateDiscAnalysisOutput(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT PLAN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt den aktiven Kontaktplan eines Leads
 * @param {string} leadId
 * @returns {Promise<import('../types/personality').ContactPlan|null>}
 */
export async function getContactPlan(leadId) {
  const { data, error } = await supabase
    .from('contact_plans')
    .select('*')
    .eq('lead_id', leadId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return validateContactPlan(data);
}

/**
 * Erstellt oder aktualisiert einen Kontaktplan
 * @param {string} leadId
 * @param {string} workspaceId
 * @param {string} userId
 * @param {Object} plan
 * @param {string} plan.nextContactAt - ISO 8601 Datetime
 * @param {'whatsapp'|'phone'|'email'|'social'|'meeting'} [plan.nextChannel]
 * @param {'manual_choice'|'ai_suggested'|'ai_autopilot'} [plan.planType]
 * @param {string} [plan.reasoning]
 * @param {string} [plan.suggestedMessage]
 * @param {string} [plan.suggestedMessageTone]
 * @returns {Promise<string>} Plan ID
 */
export async function upsertContactPlan(leadId, workspaceId, userId, plan) {
  const { data, error } = await supabase.rpc('upsert_contact_plan', {
    p_lead_id: leadId,
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_next_contact_at: plan.nextContactAt,
    p_next_channel: plan.nextChannel || 'whatsapp',
    p_plan_type: plan.planType || 'ai_suggested',
    p_reasoning: plan.reasoning || null,
    p_suggested_message: plan.suggestedMessage || null,
    p_suggested_message_tone: plan.suggestedMessageTone || null
  });

  if (error) throw error;
  return data;
}

/**
 * Markiert Kontaktplan als ausgeführt
 * @param {string} leadId
 * @returns {Promise<boolean>}
 */
export async function markContactPlanExecuted(leadId) {
  const { data, error } = await supabase.rpc('mark_contact_plan_executed', {
    p_lead_id: leadId
  });

  if (error) throw error;
  return data;
}

/**
 * Erstellt Kontaktplan mit AI-generierter Nachricht
 * @param {string} leadId
 * @param {string} workspaceId
 * @param {string} userId
 * @param {Object} context
 * @param {string} context.leadName
 * @param {string} context.leadStatus
 * @param {string} context.decisionState
 * @param {string} [context.lastContactAt]
 * @param {'whatsapp'|'phone'|'email'|'social'|'meeting'} [context.channel]
 * @param {Object} [context.discProfile]
 * @param {string} context.lastConversationSummary
 * @param {Object} context.companyContext
 * @returns {Promise<import('../types/personality').ContactPlan>}
 */
export async function createAIContactPlan(leadId, workspaceId, userId, context) {
  const {
    leadName,
    leadStatus,
    decisionState,
    lastContactAt,
    channel = 'whatsapp',
    discProfile,
    lastConversationSummary,
    companyContext
  } = context;

  let followUp;
  let useAI = true;

  try {
    followUp = await generateFollowUpWithAI({
      language: 'de',
      companyContext,
      lead: {
        id: leadId,
        name: leadName,
        status: leadStatus,
        decision_state: decisionState,
        last_contact_at: lastContactAt || new Date().toISOString(),
        last_channel: channel
      },
      discProfile,
      lastConversationSummary
    });
  } catch (e) {
    console.warn('AI follow-up generation failed, using template:', e);
    useAI = false;

    // Fallback zu Template
    const template = getQuickFollowUpTemplate({
      leadName,
      discStyle: discProfile?.dominant_style || 'S',
      decisionState,
      daysSinceContact: lastContactAt 
        ? Math.floor((Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
        : 3
    });

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + template.suggested_days);

    followUp = {
      message_text: template.message_text,
      suggested_next_contact_at: nextDate.toISOString(),
      tone_hint: template.tone_hint,
      explanation_short: 'Template-basierter Vorschlag'
    };
  }

  // Speichere Plan
  await upsertContactPlan(leadId, workspaceId, userId, {
    nextContactAt: followUp.suggested_next_contact_at,
    nextChannel: channel,
    planType: useAI ? 'ai_suggested' : 'manual_choice',
    reasoning: followUp.explanation_short,
    suggestedMessage: followUp.message_text,
    suggestedMessageTone: followUp.tone_hint
  });

  return getContactPlan(leadId);
}

/**
 * Interne Funktion: AI-basierte Follow-up Generierung
 */
async function generateFollowUpWithAI(input) {
  const prompt = buildFollowUpPrompt({
    language: input.language,
    companyName: input.companyContext.company_name,
    productName: input.companyContext.product_name,
    productBenefit: input.companyContext.product_short_benefit,
    complianceNotes: input.companyContext.compliance_notes,
    leadName: input.lead.name,
    leadStatus: input.lead.status,
    decisionState: input.lead.decision_state,
    lastContactAt: input.lead.last_contact_at,
    lastChannel: input.lead.last_channel,
    discProfile: input.discProfile,
    lastConversationSummary: input.lastConversationSummary,
    lastLeadMessage: input.lastLeadMessage,
    userNotes: input.userNotes,
    desiredNextDays: input.desiredNextWindowDays
  });

  const response = await fetch('/api/v1/ai/generate-followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_prompt: FOLLOWUP_GENERATOR_SYSTEM_PROMPT,
      user_prompt: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return validateFollowUpOutput(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt einen Lead mit vollständigem Kontext (DISG + Plan)
 * @param {string} leadId
 * @returns {Promise<import('../types/personality').LeadFullContext|null>}
 */
export async function getLeadWithFullContext(leadId) {
  const { data, error } = await supabase
    .from('view_leads_full_context')
    .select('*')
    .eq('id', leadId)
    .single();

  if (error) throw error;
  if (!data) return null;

  return validateLeadFullContext(data);
}

/**
 * Holt alle Leads mit Kontext für einen Workspace
 * @param {string} workspaceId
 * @param {Object} [options]
 * @param {string} [options.status]
 * @param {string} [options.planUrgency]
 * @param {number} [options.limit]
 * @returns {Promise<import('../types/personality').LeadFullContext[]>}
 */
export async function getLeadsWithFullContext(workspaceId, options = {}) {
  let query = supabase
    .from('view_leads_full_context')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.planUrgency) {
    query = query.eq('plan_urgency', options.planUrgency);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  query = query.order('next_contact_at', { ascending: true, nullsFirst: false });

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(lead => validateLeadFullContext(lead));
}

// ═══════════════════════════════════════════════════════════════════════════
// NO-LEAD-LEFT-BEHIND FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Findet Leads ohne Kontaktplan
 * @param {string} workspaceId
 * @param {number} [limit]
 * @returns {Promise<Array<{lead_id: string, lead_name: string, days_since_contact: number}>>}
 */
export async function getLeadsWithoutPlan(workspaceId, limit = 50) {
  const { data, error } = await supabase.rpc('get_leads_without_plan', {
    p_workspace_id: workspaceId,
    p_limit: limit
  });

  if (error) throw error;
  return data || [];
}

/**
 * Findet Leads zur Reaktivierung
 * @param {string} workspaceId
 * @param {number} [daysInactive]
 * @param {number} [limit]
 * @returns {Promise<import('../types/personality').ReactivationCandidate[]>}
 */
export async function getReactivationCandidates(workspaceId, daysInactive = 30, limit = 100) {
  const { data, error } = await supabase.rpc('get_reactivation_candidates', {
    p_workspace_id: workspaceId,
    p_days_inactive: daysInactive,
    p_limit: limit
  });

  if (error) throw error;
  return data || [];
}

/**
 * Holt heutige Kontaktpläne für Daily Flow
 * @param {string} userId
 * @param {string} workspaceId
 * @returns {Promise<import('../types/personality').TodayContactPlan[]>}
 */
export async function getTodaysContactPlans(userId, workspaceId) {
  const { data, error } = await supabase.rpc('get_todays_contact_plans', {
    p_user_id: userId,
    p_workspace_id: workspaceId
  });

  if (error) throw error;
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// DECISION STATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aktualisiert den Entscheidungs-Status eines Leads
 * @param {string} leadId
 * @param {import('../types/personality').DecisionState} decisionState
 * @returns {Promise<void>}
 */
export async function updateDecisionState(leadId, decisionState) {
  const { error } = await supabase
    .from('contacts')
    .update({ decision_state: decisionState })
    .eq('id', leadId);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt Kontaktplan-Statistiken für einen Workspace
 * @param {string} workspaceId
 * @returns {Promise<{active_plans: number, overdue_plans: number, today_plans: number, week_plans: number, executed_last_week: number}>}
 */
export async function getContactPlanStats(workspaceId) {
  const { data, error } = await supabase
    .from('view_contact_plan_stats')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return data || {
    active_plans: 0,
    overdue_plans: 0,
    today_plans: 0,
    week_plans: 0,
    executed_last_week: 0
  };
}

/**
 * Holt DISG-Verteilung für einen Workspace
 * @param {string} workspaceId
 * @returns {Promise<{D: number, I: number, S: number, G: number, unknown: number}>}
 */
export async function getDiscDistribution(workspaceId) {
  const { data, error } = await supabase
    .from('lead_personality_profiles')
    .select('dominant_style')
    .eq('workspace_id', workspaceId);

  if (error) throw error;

  const distribution = { D: 0, I: 0, S: 0, G: 0, unknown: 0 };

  for (const profile of data || []) {
    if (profile.dominant_style && distribution[profile.dominant_style] !== undefined) {
      distribution[profile.dominant_style]++;
    } else {
      distribution.unknown++;
    }
  }

  return distribution;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Personality Profile
  getPersonalityProfile,
  getPersonalityProfiles,
  upsertPersonalityProfile,
  analyzeAndSavePersonality,

  // Contact Plan
  getContactPlan,
  upsertContactPlan,
  markContactPlanExecuted,
  createAIContactPlan,

  // Full Context
  getLeadWithFullContext,
  getLeadsWithFullContext,

  // No-Lead-Left-Behind
  getLeadsWithoutPlan,
  getReactivationCandidates,
  getTodaysContactPlans,

  // Decision State
  updateDecisionState,

  // Statistics
  getContactPlanStats,
  getDiscDistribution
};

