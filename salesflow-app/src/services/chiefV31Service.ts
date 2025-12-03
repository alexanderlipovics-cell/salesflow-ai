/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - CHIEF V3.1 SERVICE                                       ║
 * ║  Frontend Service für alle v3.1 Features                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 * - Signal Detector (Einwand vs Vorwand)
 * - Closer Library (Killer Phrases)
 * - Personality Matching (DISG)
 * - Deal Medic (Health Check & Post-Mortem)
 * - Revenue Engineer (Daily Targets)
 * - Compliance Check
 */

import { API_CONFIG } from './apiConfig';
import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ObjectionType = 'real' | 'pretense' | 'buying_signal';

export type ClosingSituation = 
  | 'hesitation' 
  | 'price' 
  | 'time' 
  | 'ghost_risk' 
  | 'ready';

export type DISGType = 'dominant' | 'initiativ' | 'stetig' | 'gewissenhaft';

export interface ObjectionAnalysis {
  objection_text: string;
  objection_type: ObjectionType;
  confidence: number;
  real_problem: string | null;
  recommended_response: string;
  alternative_response: string;
  type_emoji: string;
  type_label: string;
}

export interface KillerPhrase {
  name: string;
  phrase: string;
  followup: string | null;
  why: string;
}

export interface CloserResult {
  recommended: KillerPhrase;
  alternatives: KillerPhrase[];
  situation: string;
}

export interface PersonalityProfile {
  primary_type: DISGType;
  type_emoji: string;
  type_name: string;
  type_label: string;
  confidence: number;
  signals: string[];
  dos: string[];
  donts: string[];
  message_length: string;
  emoji_policy: string;
  tone: string;
}

export interface DealHealth {
  at_risk: boolean;
  warnings: string[];
  intervention_message: string | null;
  risk_level: 'healthy' | 'warning' | 'critical';
}

export interface DealPostMortem {
  lead_name: string;
  death_cause: string;
  critical_errors: Array<{
    name: string;
    day: number;
    what_you_said: string;
    problem: string;
    better: string;
  }>;
  patterns: string[];
  learnings: string[];
}

export interface DailyTargets {
  revenue_gap: number;
  deals_needed: number;
  daily_outreach_required: number;
  expected_replies: number;
  expected_meetings: number;
  expected_deals: number;
  on_track: boolean;
  goal_analysis: string;
}

export interface ComplianceResult {
  is_compliant: boolean;
  violations: Array<{
    type: string;
    word?: string;
    message: string;
  }>;
  requires_disclaimer: string | null;
  suggested_fix: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function apiCall<T>(endpoint: string, body: any): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Nicht eingeloggt');
  }

  const response = await fetch(`${API_CONFIG.baseUrl}/v31${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Nicht eingeloggt');
  }

  const response = await fetch(`${API_CONFIG.baseUrl}/v31${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL DETECTOR - Einwand vs Vorwand
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analysiert einen Einwand und erkennt ob er echt oder ein Vorwand ist.
 * 
 * @example
 * const result = await analyzeObjection("Das ist mir zu teuer");
 * // result.objection_type = "pretense" (75% confidence)
 * // result.real_problem = "Vermutlich VERTRAUEN"
 * // result.recommended_response = "Angenommen der Preis wäre kein Thema..."
 */
export async function analyzeObjection(
  objectionText: string,
  leadId?: string,
  context?: Record<string, any>
): Promise<ObjectionAnalysis> {
  return apiCall('/analyze-objection', {
    objection_text: objectionText,
    lead_id: leadId,
    context: context || {},
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CLOSER LIBRARY - Killer Phrases
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gibt die beste Killer Phrase für eine Situation zurück.
 * 
 * @example
 * const result = await getCloser('price');
 * // result.recommended.phrase = "Wenn Geld keine Rolle spielen würde..."
 */
export async function getCloser(
  situation: ClosingSituation,
  context?: Record<string, any>
): Promise<CloserResult> {
  return apiCall('/get-closer', {
    situation,
    context: context || {},
  });
}

/**
 * Gibt alle Killer Phrases für eine Situation zurück.
 */
export async function getKillerPhrases(
  situation: ClosingSituation
): Promise<{ situation: string; count: number; phrases: KillerPhrase[] }> {
  return apiGet(`/killer-phrases/${situation}`);
}

/**
 * Gibt alle verfügbaren Closing-Situationen zurück.
 */
export async function getClosingSituations(): Promise<{
  situations: Record<string, { name: string; emoji: string; description: string }>;
}> {
  return apiGet('/closing-situations');
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONALITY MATCHING - DISG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analysiert Nachrichten und erkennt DISG-Typ.
 * 
 * @example
 * const profile = await analyzePersonality(["Was kostet das?", "Kurz bitte"]);
 * // profile.primary_type = "dominant"
 * // profile.dos = ["Kurz und direkt", "Fakten"]
 */
export async function analyzePersonality(
  messages: string[],
  leadId?: string
): Promise<PersonalityProfile> {
  return apiCall('/analyze-personality', {
    messages,
    lead_id: leadId,
  });
}

/**
 * Gibt alle DISG-Profile mit Tipps zurück.
 */
export async function getDISGProfiles(): Promise<{
  profiles: Record<DISGType, Omit<PersonalityProfile, 'confidence' | 'signals'>>;
}> {
  return apiGet('/disg-profiles');
}

/**
 * Quick DISG Type Detection (lokal, ohne API)
 */
export function quickDetectDISG(messages: string[]): {
  type: DISGType;
  confidence: number;
  emoji: string;
} {
  const combined = messages.join(' ').toLowerCase();
  const avgLength = messages.reduce((a, m) => a + m.length, 0) / messages.length;
  const emojiCount = (combined.match(/[😊🔥💪❤️👍✨🎉😍🙌]/g) || []).length;
  
  // Simple scoring
  if (avgLength < 50 && emojiCount === 0) {
    return { type: 'dominant', confidence: 0.7, emoji: '🔴' };
  }
  if (emojiCount > 2 || /super|cool|wow|mega|krass/.test(combined)) {
    return { type: 'initiativ', confidence: 0.7, emoji: '🟡' };
  }
  if (/genau|detail|prozent|studie|zahlen/.test(combined)) {
    return { type: 'gewissenhaft', confidence: 0.6, emoji: '🔵' };
  }
  
  return { type: 'stetig', confidence: 0.5, emoji: '🟢' };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL MEDIC - Health Check & Post-Mortem
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft ob ein Deal in Gefahr ist.
 * 
 * @example
 * const health = await checkDealHealth('lead-123');
 * if (health.at_risk) {
 *   showWarning(health.intervention_message);
 * }
 */
export async function checkDealHealth(leadId: string): Promise<DealHealth> {
  return apiCall('/check-deal-health', { lead_id: leadId });
}

/**
 * Erstellt Post-Mortem Analyse für verlorenen Deal.
 */
export async function getDealPostMortem(
  leadId: string,
  leadName: string
): Promise<DealPostMortem> {
  return apiCall('/deal-post-mortem', {
    lead_id: leadId,
    lead_name: leadName,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// REVENUE ENGINEER - Daily Targets
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet tägliche Targets basierend auf Monatsziel.
 * 
 * @example
 * const targets = await calculateDailyTargets({
 *   monthlyTarget: 3000,
 *   currentRevenue: 1800,
 *   avgDealSize: 95,
 * });
 * // targets.daily_outreach_required = 35
 * // targets.on_track = false
 */
export async function calculateDailyTargets(params: {
  monthlyTarget: number;
  currentRevenue?: number;
  avgDealSize?: number;
  daysRemaining?: number;
  conversionRates?: {
    outreach_to_reply?: number;
    reply_to_meeting?: number;
    meeting_to_close?: number;
  };
}): Promise<DailyTargets> {
  return apiCall('/daily-targets', {
    monthly_target: params.monthlyTarget,
    current_revenue: params.currentRevenue || 0,
    avg_deal_size: params.avgDealSize || 100,
    days_remaining: params.daysRemaining,
    conversion_rates: params.conversionRates,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE CHECK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prüft Nachricht gegen Compliance-Regeln.
 * 
 * @example
 * const result = await checkCompliance("Das heilt garantiert!");
 * // result.is_compliant = false
 * // result.violations = [{type: "forbidden_word", word: "garantiert"}]
 */
export async function checkCompliance(
  message: string,
  forbiddenWords?: string[],
  requiredDisclaimers?: Record<string, string>
): Promise<ComplianceResult> {
  return apiCall('/check-compliance', {
    message,
    forbidden_words: forbiddenWords || [],
    required_disclaimers: requiredDisclaimers || {},
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Signal Detector
  analyzeObjection,
  
  // Closer Library
  getCloser,
  getKillerPhrases,
  getClosingSituations,
  
  // Personality Matching
  analyzePersonality,
  getDISGProfiles,
  quickDetectDISG,
  
  // Deal Medic
  checkDealHealth,
  getDealPostMortem,
  
  // Revenue Engineer
  calculateDailyTargets,
  
  // Compliance
  checkCompliance,
};

