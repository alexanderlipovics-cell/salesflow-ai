/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TEACH API CLIENT                                                          ║
 * ║  Kommunikation mit Backend für Learning System                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * API Client für das Teach-UI System.
 * Integriert mit Living OS und Sales Brain.
 */

import type { 
  CreateRulePayload, 
  TeachResponse, 
  OverrideEvent,
  TeachStats,
  PendingPattern,
  DeepAnalysisResult,
  OverrideContext,
} from '../types/teach';

// =============================================================================
// API CONFIG
// =============================================================================

const API_BASE_URL = '/api/v1';

interface ApiOptions {
  baseUrl?: string;
}

function getBaseUrl(options?: ApiOptions): string {
  return options?.baseUrl || API_BASE_URL;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  apiOptions?: ApiOptions
): Promise<T> {
  const baseUrl = getBaseUrl(apiOptions);
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }
  
  return response.json();
}

// =============================================================================
// TEACH ACTIONS
// =============================================================================

/**
 * Submit teach action (create rule or signal)
 */
export async function submitTeach(
  payload: CreateRulePayload,
  options?: ApiOptions
): Promise<TeachResponse> {
  // Transform to API format
  const apiPayload = {
    scope: payload.scope,
    override: {
      original_text: payload.override.originalText,
      final_text: payload.override.finalText,
      similarity_score: payload.override.similarityScore,
      detected_changes: payload.override.detectedChanges,
      context: transformContextToApi(payload.override.context),
    },
    note: payload.note,
    tags: payload.tags,
    rule_config: payload.ruleConfig ? {
      priority: payload.ruleConfig.priority,
      apply_to: payload.ruleConfig.applyTo,
      trigger_conditions: payload.ruleConfig.triggerConditions,
    } : undefined,
  };
  
  const response = await apiRequest<{
    success: boolean;
    created: Record<string, string | null>;
    xp_earned?: number;
    message: string;
    pattern_detected?: {
      pattern_type: string;
      signal_count: number;
      success_rate: number;
      will_become_rule: boolean;
    };
  }>('/living-os/teach', {
    method: 'POST',
    body: JSON.stringify(apiPayload),
  }, options);
  
  return {
    success: response.success,
    created: {
      signalId: response.created.signal_id || undefined,
      ruleId: response.created.rule_id || undefined,
      templateId: response.created.template_id || undefined,
      patternId: response.created.pattern_id || undefined,
      broadcastId: response.created.broadcast_id || undefined,
    },
    xpEarned: response.xp_earned,
    message: response.message,
    patternDetected: response.pattern_detected ? {
      patternType: response.pattern_detected.pattern_type,
      signalCount: response.pattern_detected.signal_count,
      successRate: response.pattern_detected.success_rate,
      willBecomeRule: response.pattern_detected.will_become_rule,
    } : undefined,
  };
}

/**
 * Log ignore action (for analytics)
 */
export async function logIgnore(
  event: OverrideEvent,
  options?: ApiOptions
): Promise<void> {
  await apiRequest<{ success: boolean }>('/living-os/teach/ignore', {
    method: 'POST',
    body: JSON.stringify({
      original_text: event.originalText,
      final_text: event.finalText,
      similarity_score: event.similarityScore,
      context: transformContextToApi(event.context),
    }),
  }, options);
}

/**
 * Create template from teach
 */
export async function createTemplate(
  data: {
    text: string;
    context: OverrideContext;
    source: string;
  },
  options?: ApiOptions
): Promise<{ templateId: string }> {
  const response = await apiRequest<{ template_id: string }>(
    '/brain/templates/from-teach',
    {
      method: 'POST',
      body: JSON.stringify({
        text: data.text,
        context: transformContextToApi(data.context),
        source: data.source,
      }),
    },
    options
  );
  
  return { templateId: response.template_id };
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Get teach stats for current user
 */
export async function getTeachStats(
  options?: ApiOptions
): Promise<TeachStats> {
  const response = await apiRequest<{
    total_teach_actions: number;
    rules_created: number;
    templates_created: number;
    patterns_discovered: number;
    current_streak: number;
    longest_streak: number;
    total_xp_from_teaching: number;
    rules_adopted_by_team: number;
    template_usage_count: number;
    pending_patterns: number;
  }>('/living-os/teach/stats', {
    method: 'GET',
  }, options);
  
  return {
    totalTeachActions: response.total_teach_actions,
    rulesCreated: response.rules_created,
    templatesCreated: response.templates_created,
    patternsDiscovered: response.patterns_discovered,
    currentStreak: response.current_streak,
    longestStreak: response.longest_streak,
    totalXpFromTeaching: response.total_xp_from_teaching,
    rulesAdoptedByTeam: response.rules_adopted_by_team,
    templateUsageCount: response.template_usage_count,
    pendingPatterns: response.pending_patterns,
  };
}

// =============================================================================
// PATTERNS
// =============================================================================

/**
 * Get pending patterns (detected but not yet activated)
 */
export async function getPendingPatterns(
  options?: ApiOptions
): Promise<PendingPattern[]> {
  const response = await apiRequest<Array<{
    id: string;
    pattern_type: string;
    signal_count: number;
    success_rate: number;
    last_signal_at: string;
  }>>('/living-os/patterns/pending', {
    method: 'GET',
  }, options);
  
  return response.map(p => ({
    id: p.id,
    patternType: p.pattern_type,
    signalCount: p.signal_count,
    successRate: p.success_rate,
    lastSignalAt: p.last_signal_at,
  }));
}

/**
 * Activate a pattern (turn into rule)
 */
export async function activatePattern(
  patternId: string,
  options?: ApiOptions
): Promise<{ ruleId: string; xpEarned: number }> {
  const response = await apiRequest<{ rule_id: string; xp_earned: number }>(
    `/living-os/patterns/${patternId}/activate`,
    { method: 'POST' },
    options
  );
  
  return {
    ruleId: response.rule_id,
    xpEarned: response.xp_earned,
  };
}

/**
 * Dismiss a pattern (mark as rejected)
 */
export async function dismissPattern(
  patternId: string,
  options?: ApiOptions
): Promise<void> {
  await apiRequest<{ success: boolean }>(
    `/living-os/patterns/${patternId}/dismiss`,
    { method: 'POST' },
    options
  );
}

// =============================================================================
// DEEP ANALYSIS (uses Claude)
// =============================================================================

/**
 * Request deep analysis for an override
 * Used for complex changes that quick detection can't classify
 */
export async function requestDeepAnalysis(
  originalText: string,
  finalText: string,
  options?: ApiOptions
): Promise<DeepAnalysisResult> {
  const response = await apiRequest<{
    changes: string[];
    pattern: string | null;
    insights: string;
    suggested_rule_name: string;
  }>('/living-os/teach/analyze', {
    method: 'POST',
    body: JSON.stringify({
      original_text: originalText,
      final_text: finalText,
    }),
  }, options);
  
  return {
    changes: response.changes,
    pattern: response.pattern,
    insights: response.insights,
    suggestedRuleName: response.suggested_rule_name,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function transformContextToApi(context: OverrideContext): Record<string, unknown> {
  return {
    vertical_id: context.verticalId,
    company_id: context.companyId,
    channel: context.channel,
    lead_id: context.leadId,
    lead_status: context.leadStatus,
    message_type: context.messageType,
    objection_type: context.objectionType,
    template_id: context.templateId,
    disg_type: context.disgType,
    language: context.language,
    day_of_week: context.dayOfWeek,
    time_of_day: context.timeOfDay,
  };
}

// =============================================================================
// LEGACY COMPATIBILITY (für bestehende Brain API)
// =============================================================================

/**
 * Detect correction via Brain API (Legacy)
 * Nutzt den bestehenden /brain/corrections/detect Endpoint
 */
export async function detectCorrectionLegacy(
  original: string,
  final: string,
  context?: Partial<OverrideContext>,
  options?: ApiOptions
): Promise<{
  shouldShowModal: boolean;
  correctionId?: string;
  similarityScore: number;
  changeSignificance: string;
  suggestedRule?: {
    title: string;
    instruction: string;
    ruleType: string;
    confidence?: number;
  };
  changeSummary: string[];
}> {
  const response = await apiRequest<{
    should_show_modal: boolean;
    correction_id?: string;
    similarity_score: number;
    change_significance: string;
    suggested_rule?: {
      title: string;
      instruction: string;
      rule_type: string;
      confidence?: number;
    };
    change_summary: string[];
  }>('/brain/corrections/detect', {
    method: 'POST',
    body: JSON.stringify({
      original_suggestion: original,
      user_final_text: final,
      channel: context?.channel,
      lead_status: context?.leadStatus,
      message_type: context?.messageType,
      lead_id: context?.leadId,
      disg_type: context?.disgType,
    }),
  }, options);
  
  return {
    shouldShowModal: response.should_show_modal,
    correctionId: response.correction_id,
    similarityScore: response.similarity_score,
    changeSignificance: response.change_significance,
    suggestedRule: response.suggested_rule ? {
      title: response.suggested_rule.title,
      instruction: response.suggested_rule.instruction,
      ruleType: response.suggested_rule.rule_type,
      confidence: response.suggested_rule.confidence,
    } : undefined,
    changeSummary: response.change_summary,
  };
}

/**
 * Submit feedback via Brain API (Legacy)
 */
export async function submitFeedbackLegacy(
  correctionId: string,
  feedback: 'personal' | 'team' | 'ignore',
  options?: ApiOptions
): Promise<{
  success: boolean;
  ruleCreated: boolean;
  ruleId?: string;
  ruleTitle?: string;
}> {
  const response = await apiRequest<{
    success: boolean;
    rule_created: boolean;
    rule_id?: string;
    rule_title?: string;
  }>('/brain/corrections/feedback', {
    method: 'POST',
    body: JSON.stringify({
      correction_id: correctionId,
      feedback,
    }),
  }, options);
  
  return {
    success: response.success,
    ruleCreated: response.rule_created,
    ruleId: response.rule_id,
    ruleTitle: response.rule_title,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  submitTeach,
  logIgnore,
  createTemplate,
  getTeachStats,
  getPendingPatterns,
  activatePattern,
  dismissPattern,
  requestDeepAnalysis,
  detectCorrectionLegacy,
  submitFeedbackLegacy,
};

