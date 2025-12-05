/**
 * Custom Hook für Lead Management
 * 
 * Bietet:
 * - CRUD Operationen
 * - P-Score Management
 * - NBA (Next Best Action)
 * - Zero-Input CRM
 */

import { useState, useEffect, useCallback } from "react";
import {
  Lead,
  LeadListItem,
  LeadFormData,
  LeadQueryParams,
  NBAResponse,
  PScoreResponse,
  ZeroInputResponse,
} from "@/types/lead";
import * as leadsApi from "@/api/leads";

// ============================================================================
// LEADS LIST HOOK
// ============================================================================

export function useLeads(params: LeadQueryParams = {}) {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leadsApi.fetchLeads(params);
      setLeads(response.leads || []);
      setTotal(response.total || response.count || 0);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der Leads");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    total,
    refetch: fetchLeads,
  };
}

// ============================================================================
// SINGLE LEAD HOOK
// ============================================================================

export function useLead(leadId: string | null) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!leadId) {
      setLead(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.fetchLead(leadId);
      setLead(data);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden des Leads");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return {
    lead,
    loading,
    error,
    refetch: fetchLead,
  };
}

// ============================================================================
// LEAD MUTATIONS HOOK
// ============================================================================

export function useLeadMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLead = async (data: LeadFormData): Promise<Lead | null> => {
    setLoading(true);
    setError(null);
    try {
      const lead = await leadsApi.createLead(data);
      return lead;
    } catch (err: any) {
      setError(err.message || "Fehler beim Erstellen des Leads");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (
    leadId: string,
    data: Partial<LeadFormData>
  ): Promise<Lead | null> => {
    setLoading(true);
    setError(null);
    try {
      const lead = await leadsApi.updateLead(leadId, data);
      return lead;
    } catch (err: any) {
      setError(err.message || "Fehler beim Aktualisieren des Leads");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (leadId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await leadsApi.deleteLead(leadId);
      return true;
    } catch (err: any) {
      setError(err.message || "Fehler beim Löschen des Leads");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const archiveLead = async (leadId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await leadsApi.archiveLead(leadId);
      return true;
    } catch (err: any) {
      setError(err.message || "Fehler beim Archivieren des Leads");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createLead,
    updateLead,
    deleteLead,
    archiveLead,
    loading,
    error,
  };
}

// ============================================================================
// P-SCORE HOOK
// ============================================================================

export function usePScore(leadId: string | null) {
  const [pScore, setPScore] = useState<PScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateScore = useCallback(async () => {
    if (!leadId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await leadsApi.calculatePScore(leadId);
      setPScore(result);
      return result;
    } catch (err: any) {
      setError(err.message || "Fehler bei P-Score Berechnung");
      return null;
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  return {
    pScore,
    calculateScore,
    loading,
    error,
  };
}

// ============================================================================
// NEXT BEST ACTION HOOK
// ============================================================================

export function useNextBestAction(leadId: string | null) {
  const [nba, setNba] = useState<NBAResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNBA = useCallback(async () => {
    if (!leadId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await leadsApi.fetchNextBestAction({ lead_id: leadId });
      setNba(result);
      return result;
    } catch (err: any) {
      setError(err.message || "Fehler bei NBA Berechnung");
      return null;
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) {
      fetchNBA();
    }
  }, [fetchNBA, leadId]);

  return {
    nba,
    fetchNBA,
    loading,
    error,
  };
}

// ============================================================================
// ZERO-INPUT CRM HOOK
// ============================================================================

export function useZeroInputCRM() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarize = async (
    leadId: string,
    createTask: boolean = false
  ): Promise<ZeroInputResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await leadsApi.summarizeConversation({
        lead_id: leadId,
        create_task: createTask,
      });
      return result;
    } catch (err: any) {
      setError(err.message || "Fehler bei Zusammenfassung");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    summarize,
    loading,
    error,
  };
}

// ============================================================================
// HOT LEADS HOOK
// ============================================================================

export function useHotLeads(minScore: number = 75, limit: number = 20) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHotLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leadsApi.fetchHotLeads(minScore, limit);
      setLeads(response.leads || []);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der Hot Leads");
    } finally {
      setLoading(false);
    }
  }, [minScore, limit]);

  useEffect(() => {
    fetchHotLeads();
  }, [fetchHotLeads]);

  return {
    leads,
    loading,
    error,
    refetch: fetchHotLeads,
  };
}

