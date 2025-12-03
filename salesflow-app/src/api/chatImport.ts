/**
 * Chat Import API Client
 * ======================
 * API-Funktionen für das Chat Import System
 */

import { API_CONFIG } from "../services/apiConfig";
import type {
  ChatImportRequest,
  ChatImportResult,
  SaveImportRequest,
  SaveImportResponse,
  ContactPlan,
  MessageTemplate,
  TemplateUseCase,
} from "./types/chatImport";

const API_BASE = `${API_CONFIG.baseUrl}/chat-import`;

// =============================================================================
// ANALYZE & SAVE
// =============================================================================

/**
 * Analysiert einen Chatverlauf mit Claude
 */
export async function analyzeChat(request: ChatImportRequest): Promise<ChatImportResult> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Analyse fehlgeschlagen" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Speichert das analysierte Ergebnis
 */
export async function saveImport(request: SaveImportRequest): Promise<SaveImportResponse> {
  const response = await fetch(`${API_BASE}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Speichern fehlgeschlagen" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Quick Import: Analysiert und speichert in einem Schritt
 */
export async function quickImport(request: ChatImportRequest): Promise<SaveImportResponse> {
  const response = await fetch(`${API_BASE}/quick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Import fehlgeschlagen" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// CONTACT PLANS
// =============================================================================

/**
 * Holt heutige Kontaktpläne
 */
export async function getTodaysContactPlans(): Promise<ContactPlan[]> {
  const response = await fetch(`${API_BASE}/contact-plans/today`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Holt überfällige Kontaktpläne
 */
export async function getOverdueContactPlans(): Promise<ContactPlan[]> {
  const response = await fetch(`${API_BASE}/contact-plans/overdue`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Holt kommende Kontaktpläne
 */
export async function getUpcomingContactPlans(days: number = 7): Promise<ContactPlan[]> {
  const response = await fetch(`${API_BASE}/contact-plans/upcoming?days=${days}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Markiert Kontaktplan als erledigt
 */
export async function completeContactPlan(planId: string, note?: string): Promise<void> {
  const url = note
    ? `${API_BASE}/contact-plans/${planId}/complete?note=${encodeURIComponent(note)}`
    : `${API_BASE}/contact-plans/${planId}/complete`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

/**
 * Überspringt Kontaktplan
 */
export async function skipContactPlan(planId: string, reason?: string): Promise<void> {
  const url = reason
    ? `${API_BASE}/contact-plans/${planId}/skip?reason=${encodeURIComponent(reason)}`
    : `${API_BASE}/contact-plans/${planId}/skip`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

/**
 * Verschiebt Kontaktplan auf neues Datum
 */
export async function rescheduleContactPlan(planId: string, newDate: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/contact-plans/${planId}/reschedule?new_date=${newDate}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * Holt extrahierte Templates
 */
export async function getTemplates(params?: {
  useCase?: string;
  channel?: string;
  limit?: number;
}): Promise<MessageTemplate[]> {
  const searchParams = new URLSearchParams();
  if (params?.useCase) searchParams.set("use_case", params.useCase);
  if (params?.channel) searchParams.set("channel", params.channel);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const url = `${API_BASE}/templates${searchParams.toString() ? `?${searchParams}` : ""}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Markiert Template als verwendet
 */
export async function useTemplate(templateId: string, success: boolean = true): Promise<void> {
  const response = await fetch(`${API_BASE}/templates/${templateId}/use?success=${success}`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

/**
 * Holt alle verfügbaren Use-Cases
 */
export async function getTemplateUseCases(): Promise<TemplateUseCase[]> {
  const response = await fetch(`${API_BASE}/templates/use-cases`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

