/**
 * 🧠 Sales Brain API Client
 * Teach-UI & Rule Learning System
 */

import { API_CONFIG } from "../services/apiConfig";
import type {
  CreateRulePayload,
  CreateRuleResponse,
  SalesBrainRule,
  GetRulesResponse,
  RuleScope,
} from "./types/salesBrain";

const API_BASE = `${API_CONFIG.baseUrl}/sales-brain`;

// =============================================================================
// RULES
// =============================================================================

/**
 * Erstellt eine neue Sales Brain Regel
 */
export async function createSalesBrainRule(
  payload: CreateRulePayload
): Promise<CreateRuleResponse> {
  const response = await fetch(`${API_BASE}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      scope: payload.scope,
      override: {
        suggestion_id: payload.override.suggestionId,
        original_text: payload.override.originalText,
        final_text: payload.override.finalText,
        similarity_score: payload.override.similarityScore,
        override_type: payload.override.overrideType,
        context: {
          vertical_id: payload.override.context.verticalId,
          company_id: payload.override.context.companyId,
          channel: payload.override.context.channel,
          use_case: payload.override.context.useCase,
          language: payload.override.context.language,
          lead_status: payload.override.context.leadStatus,
          deal_state: payload.override.context.dealState,
          lead_sentiment: payload.override.context.leadSentiment,
        },
      },
      note: payload.note,
      auto_tag: payload.autoTag,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Holt alle Regeln für den aktuellen User/Team
 */
export async function getSalesBrainRules(params?: {
  scope?: RuleScope;
  channel?: string;
  useCase?: string;
  page?: number;
  pageSize?: number;
}): Promise<GetRulesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.scope) searchParams.set("scope", params.scope);
  if (params?.channel) searchParams.set("channel", params.channel);
  if (params?.useCase) searchParams.set("use_case", params.useCase);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.pageSize) searchParams.set("page_size", params.pageSize.toString());

  const url = `${API_BASE}/rules${searchParams.toString() ? `?${searchParams}` : ""}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Holt eine einzelne Regel
 */
export async function getSalesBrainRule(ruleId: string): Promise<SalesBrainRule> {
  const response = await fetch(`${API_BASE}/rules/${ruleId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Aktualisiert eine Regel
 */
export async function updateSalesBrainRule(
  ruleId: string,
  updates: Partial<{
    preferredText: string;
    note: string;
    status: "active" | "inactive";
    priority: "low" | "medium" | "high" | "critical";
  }>
): Promise<SalesBrainRule> {
  const response = await fetch(`${API_BASE}/rules/${ruleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      preferred_text: updates.preferredText,
      note: updates.note,
      status: updates.status,
      priority: updates.priority,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Löscht eine Regel
 */
export async function deleteSalesBrainRule(ruleId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rules/${ruleId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

// =============================================================================
// MATCHING
// =============================================================================

/**
 * Findet passende Regeln für einen Kontext
 */
export async function findMatchingRules(params: {
  channel?: string;
  useCase?: string;
  leadStatus?: string;
  dealState?: string;
  inputText?: string;
  limit?: number;
}): Promise<SalesBrainRule[]> {
  const response = await fetch(`${API_BASE}/rules/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      channel: params.channel,
      use_case: params.useCase,
      lead_status: params.leadStatus,
      deal_state: params.dealState,
      input_text: params.inputText,
      limit: params.limit || 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Holt Sales Brain Statistiken
 */
export async function getSalesBrainStats(): Promise<{
  totalRules: number;
  userRules: number;
  teamRules: number;
  appliedThisWeek: number;
  topUseCases: { useCase: string; count: number }[];
}> {
  const response = await fetch(`${API_BASE}/stats`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// FEEDBACK
// =============================================================================

/**
 * Gibt Feedback zu einer angewendeten Regel
 */
export async function submitRuleFeedback(
  ruleId: string,
  feedback: {
    accepted: boolean;
    modified?: boolean;
    finalText?: string;
  }
): Promise<void> {
  const response = await fetch(`${API_BASE}/rules/${ruleId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      accepted: feedback.accepted,
      modified: feedback.modified,
      final_text: feedback.finalText,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

