/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  USE SALES BRAIN HOOK                                                      ║
 * ║  React Hook für das Self-Learning Rules System                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 *   - Korrektur-Logging
 *   - Regel-Abfrage
 *   - Feedback-Verarbeitung
 *   - Push-Schedule Management
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type RuleType = 
  | 'tone' 
  | 'structure' 
  | 'vocabulary' 
  | 'timing' 
  | 'channel' 
  | 'objection' 
  | 'persona' 
  | 'product' 
  | 'compliance' 
  | 'custom';

export type RuleScope = 'personal' | 'team' | 'global';

export type RulePriority = 'override' | 'high' | 'normal' | 'suggestion';

export type FeedbackType = 'personal' | 'team' | 'ignore';

export interface Rule {
  id: string;
  rule_type: RuleType;
  scope: RuleScope;
  priority: RulePriority;
  context?: Record<string, any>;
  title: string;
  description?: string;
  instruction: string;
  example_bad?: string;
  example_good?: string;
  times_applied: number;
  effectiveness_score?: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface CorrectionData {
  original_suggestion: string;
  user_final_text: string;
  lead_id?: string;
  channel?: string;
  lead_status?: string;
  message_type?: 'first_contact' | 'followup' | 'reactivation';
}

export interface CorrectionAnalysis {
  correction_id: string;
  similarity_score: number;
  detected_changes: Record<string, any>;
  suggested_rule?: Rule;
  should_create_rule: boolean;
}

export interface PushSchedule {
  morning_enabled: boolean;
  morning_time: string;
  morning_days: number[];
  evening_enabled: boolean;
  evening_time: string;
  evening_days: number[];
  timezone: string;
  include_stats: boolean;
  include_tips: boolean;
  include_motivation: boolean;
  push_token_registered: boolean;
}

export interface MorningBriefing {
  greeting: string;
  date: string;
  daily_targets: Record<string, number>;
  top_leads: Array<{
    id?: string;
    name: string;
    status: string;
    channel?: string;
    priority: string;
  }>;
  streak_days: number;
  motivational_message: string;
  quick_actions: string[];
}

export interface EveningRecap {
  greeting: string;
  completed: Record<string, number>;
  targets: Record<string, number>;
  completion_rate: number;
  wins: string[];
  lessons: string[];
  new_rules_learned: number;
  templates_improved: number;
  tomorrow_preview: string;
}

// ============================================================================
// CONFIG
// ============================================================================

const API_BASE = '/api/v1/brain';

// ============================================================================
// HOOK
// ============================================================================

interface UseSalesBrainOptions {
  apiBaseUrl?: string;
  autoFetchRules?: boolean;
}

export function useSalesBrain(options: UseSalesBrainOptions = {}) {
  const { apiBaseUrl = API_BASE, autoFetchRules = false } = options;
  
  // State
  const [rules, setRules] = useState<Rule[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<any[]>([]);
  const [pushSchedule, setPushSchedule] = useState<PushSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // -------------------------------------------------------------------------
  // API HELPERS
  // -------------------------------------------------------------------------
  
  const fetchJson = useCallback(async (
    endpoint: string, 
    options: RequestInit = {}
  ) => {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }, [apiBaseUrl]);
  
  // -------------------------------------------------------------------------
  // RULES
  // -------------------------------------------------------------------------
  
  const fetchRules = useCallback(async (context?: {
    channel?: string;
    lead_status?: string;
    message_type?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (context?.channel) params.set('channel', context.channel);
      if (context?.lead_status) params.set('lead_status', context.lead_status);
      if (context?.message_type) params.set('message_type', context.message_type);
      
      const queryString = params.toString();
      const endpoint = `/rules${queryString ? `?${queryString}` : ''}`;
      
      const data = await fetchJson(endpoint);
      setRules(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden der Regeln';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchJson]);
  
  const getRulesForChief = useCallback(async (context?: {
    channel?: string;
    lead_status?: string;
    message_type?: string;
    max_rules?: number;
  }) => {
    const params = new URLSearchParams();
    if (context?.channel) params.set('channel', context.channel);
    if (context?.lead_status) params.set('lead_status', context.lead_status);
    if (context?.message_type) params.set('message_type', context.message_type);
    if (context?.max_rules) params.set('max_rules', context.max_rules.toString());
    
    const queryString = params.toString();
    return fetchJson(`/rules/for-chief${queryString ? `?${queryString}` : ''}`);
  }, [fetchJson]);
  
  const createRule = useCallback(async (rule: {
    rule_type: RuleType;
    scope?: RuleScope;
    priority?: RulePriority;
    context?: Record<string, any>;
    title: string;
    description?: string;
    instruction: string;
    example_bad?: string;
    example_good?: string;
  }) => {
    const data = await fetchJson('/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
    
    // Update local state
    setRules(prev => [data, ...prev]);
    return data;
  }, [fetchJson]);
  
  const deleteRule = useCallback(async (ruleId: string) => {
    await fetchJson(`/rules/${ruleId}`, { method: 'DELETE' });
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }, [fetchJson]);
  
  // -------------------------------------------------------------------------
  // CORRECTIONS
  // -------------------------------------------------------------------------
  
  const logCorrection = useCallback(async (correction: CorrectionData) => {
    const data = await fetchJson('/corrections', {
      method: 'POST',
      body: JSON.stringify(correction),
    });
    return data.correction_id;
  }, [fetchJson]);
  
  const analyzeCorrection = useCallback(async (correctionId: string): Promise<CorrectionAnalysis> => {
    return fetchJson(`/corrections/${correctionId}/analyze`, { method: 'POST' });
  }, [fetchJson]);
  
  const submitFeedback = useCallback(async (
    correctionId: string, 
    feedback: FeedbackType
  ): Promise<Rule | null> => {
    return fetchJson('/corrections/feedback', {
      method: 'POST',
      body: JSON.stringify({ correction_id: correctionId, feedback }),
    });
  }, [fetchJson]);
  
  const fetchPendingCorrections = useCallback(async (limit: number = 10) => {
    const data = await fetchJson(`/corrections/pending?limit=${limit}`);
    setPendingCorrections(data);
    return data;
  }, [fetchJson]);
  
  // Convenience: Log correction and return analysis
  const logAndAnalyzeCorrection = useCallback(async (
    correction: CorrectionData
  ): Promise<{ correctionId: string; analysis: CorrectionAnalysis }> => {
    const correctionId = await logCorrection(correction);
    const analysis = await analyzeCorrection(correctionId);
    return { correctionId, analysis };
  }, [logCorrection, analyzeCorrection]);
  
  // -------------------------------------------------------------------------
  // PUSH NOTIFICATIONS
  // -------------------------------------------------------------------------
  
  const fetchPushSchedule = useCallback(async () => {
    const data = await fetchJson('/push/schedule');
    setPushSchedule(data);
    return data;
  }, [fetchJson]);
  
  const updatePushSchedule = useCallback(async (update: Partial<PushSchedule>) => {
    const data = await fetchJson('/push/schedule', {
      method: 'PUT',
      body: JSON.stringify(update),
    });
    setPushSchedule(data);
    return data;
  }, [fetchJson]);
  
  const registerPushToken = useCallback(async (
    token: string, 
    platform: 'ios' | 'android' | 'web'
  ) => {
    return fetchJson('/push/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }, [fetchJson]);
  
  const getMorningBriefing = useCallback(async (): Promise<MorningBriefing> => {
    return fetchJson('/push/morning-briefing');
  }, [fetchJson]);
  
  const getEveningRecap = useCallback(async (): Promise<EveningRecap> => {
    return fetchJson('/push/evening-recap');
  }, [fetchJson]);
  
  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------
  
  useEffect(() => {
    if (autoFetchRules) {
      fetchRules();
    }
  }, [autoFetchRules, fetchRules]);
  
  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------
  
  return {
    // State
    rules,
    pendingCorrections,
    pushSchedule,
    isLoading,
    error,
    
    // Rules
    fetchRules,
    getRulesForChief,
    createRule,
    deleteRule,
    
    // Corrections
    logCorrection,
    analyzeCorrection,
    submitFeedback,
    fetchPendingCorrections,
    logAndAnalyzeCorrection,
    
    // Push
    fetchPushSchedule,
    updatePushSchedule,
    registerPushToken,
    getMorningBriefing,
    getEveningRecap,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useSalesBrain;

