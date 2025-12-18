/**
 * Lead API Service für Sales Flow AI
 * 
 * Kommunikation mit:
 * - /api/leads (CRUD)
 * - /api/analytics/p-scores/* (P-Score)
 * - /api/analytics/nba (Next Best Action)
 * - /api/crm/zero-input/summarize (Zero-Input CRM)
 */

import api from "@/lib/api";
import {
  Lead,
  LeadListItem,
  LeadsResponse,
  LeadFormData,
  LeadQueryParams,
  PScoreResponse,
  PScoreRecalcRequest,
  PScoreRecalcResponse,
  HotLeadsResponse,
  NBARequest,
  NBAResponse,
  NBABatchResponse,
  ZeroInputRequest,
  ZeroInputResponse,
  CRMNote,
} from "@/types/lead";

// ============================================================================
// LEAD CRUD
// ============================================================================

/**
 * Lädt alle Leads mit optionalen Filtern
 */
export async function fetchLeads(params: LeadQueryParams = {}): Promise<LeadsResponse> {
  return api.get<LeadsResponse>("/leads", { query: params as any });
}

/**
 * Lädt einen einzelnen Lead
 */
export async function fetchLead(leadId: string): Promise<Lead> {
  const response = await api.get<{ lead?: Lead; leads?: Lead[] }>(`/leads/${leadId}`);
  // Backend kann verschiedene Formate zurückgeben
  return response.lead || (response.leads && response.leads[0]) || (response as any);
}

/**
 * Erstellt einen neuen Lead
 */
export async function createLead(data: LeadFormData): Promise<Lead> {
  const response = await api.post<{ lead?: Lead; success?: boolean }>("/leads", data);
  if (!response.lead) {
    throw new Error("Lead konnte nicht erstellt werden");
  }
  return response.lead;
}

/**
 * Aktualisiert einen Lead
 */
export async function updateLead(
  leadId: string,
  data: Partial<LeadFormData>
): Promise<Lead> {
  const response = await api.patch<{ lead?: Lead; success?: boolean }>(
    `/leads/${leadId}`,
    data
  );
  if (!response.lead) {
    throw new Error("Lead konnte nicht aktualisiert werden");
  }
  return response.lead;
}

/**
 * Löscht einen Lead
 */
export async function deleteLead(leadId: string): Promise<void> {
  await api.delete(`/leads/${leadId}`);
}

/**
 * Archiviert einen Lead (soft delete)
 */
export async function archiveLead(leadId: string): Promise<void> {
  await api.post(`/leads/${leadId}/archive`);
}

/**
 * Holt pending Leads (Follow-ups für heute oder überfällig)
 */
export async function fetchPendingLeads(): Promise<LeadsResponse> {
  return api.get<LeadsResponse>("/leads/pending");
}

// ============================================================================
// P-SCORE SYSTEM
// ============================================================================

/**
 * Berechnet P-Score für einen einzelnen Lead neu
 */
export async function calculatePScore(leadId: string): Promise<PScoreResponse> {
  return api.post<PScoreResponse>("/analytics/p-scores/calculate", { lead_id: leadId });
}

/**
 * Berechnet P-Scores für alle/viele Leads neu
 */
export async function recalculatePScores(
  params: PScoreRecalcRequest = {}
): Promise<PScoreRecalcResponse> {
  return api.post<PScoreRecalcResponse>("/analytics/p-scores/recalc", params);
}

/**
 * Holt die heißesten Leads basierend auf P-Score
 */
export async function fetchHotLeads(
  minScore: number = 75,
  limit: number = 20
): Promise<HotLeadsResponse> {
  return api.get<HotLeadsResponse>("/analytics/hot-leads", {
    query: { min_score: minScore, limit },
  });
}

// ============================================================================
// NEXT BEST ACTION (NBA)
// ============================================================================

/**
 * Berechnet die Next Best Action für einen Lead
 */
export async function fetchNextBestAction(request: NBARequest): Promise<NBAResponse> {
  return api.post<NBAResponse>("/analytics/nba", request);
}

/**
 * Holt NBA Empfehlungen für mehrere Top-Leads
 */
export async function fetchNBABatch(limit: number = 10): Promise<NBABatchResponse> {
  return api.get<NBABatchResponse>("/analytics/nba/batch", { query: { limit } });
}

// ============================================================================
// ZERO-INPUT CRM
// ============================================================================

/**
 * Erstellt automatische Zusammenfassung und optional einen Task
 */
export async function summarizeConversation(
  request: ZeroInputRequest
): Promise<ZeroInputResponse> {
  return api.post<ZeroInputResponse>("/crm/zero-input/summarize", request);
}

/**
 * Lädt CRM Notes für einen Lead
 */
export async function fetchLeadNotes(leadId: string): Promise<CRMNote[]> {
  const response = await api.get<{ notes?: CRMNote[]; success?: boolean }>(
    "/crm/notes",
    { query: { lead_id: leadId } }
  );
  return response.notes || [];
}

// ============================================================================
// BULK OPERATIONS (Optional - falls Backend vorhanden)
// ============================================================================

export interface BulkOperation {
  operation: "tag" | "assign" | "status" | "delete" | "archive";
  lead_ids: string[];
  value?: any;
}

/**
 * Führt eine Bulk-Operation auf mehreren Leads aus
 */
export async function bulkOperationLeads(
  operation: BulkOperation
): Promise<{ success: boolean; affected: number }> {
  return api.post<{ success: boolean; affected: number }>("/leads/bulk", operation);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Prüft ob ein Lead mit dieser Telefonnummer bereits existiert
 */
export async function checkDuplicateLead(phone: string): Promise<boolean> {
  try {
    const response = await api.get<{ exists: boolean }>("/leads/check-duplicate", {
      query: { phone },
    });
    return response.exists;
  } catch {
    return false;
  }
}

