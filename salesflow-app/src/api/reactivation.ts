/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  REACTIVATION AGENT API                                                    ║
 * ║  API Functions für Lead-Reaktivierung mit LangGraph Agent                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type ReactivationSignalType = 
  | 'job_change' 
  | 'funding' 
  | 'news' 
  | 'website_change' 
  | 'intent';

export type ReactivationChannel = 'linkedin' | 'email';
export type ReactivationStrategy = 
  | 'signal_reference' 
  | 'value_reminder' 
  | 'relationship_rebuild' 
  | 'soft_check_in';
export type ReactivationRunStatus = 'started' | 'completed' | 'failed' | 'skipped';
export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'edited' | 'expired';
export type ReviewAction = 'approved' | 'rejected' | 'edited';

export interface ReactivationSignal {
  type: ReactivationSignalType;
  source: string;
  title: string;
  summary: string;
  url?: string;
  relevance_score: number;
  detected_at: string;
}

export interface DormantLead {
  id: string;
  user_id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: string;
  last_contact_at?: string;
  days_dormant?: number;
  last_reactivation_attempt?: string;
}

export interface ReactivationRun {
  id: string;
  user_id: string;
  lead_id: string;
  status: ReactivationRunStatus;
  signals_found?: number;
  primary_signal?: ReactivationSignal;
  confidence_score?: number;
  action_taken?: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  execution_time_ms?: number;
}

export interface ReactivationDraft {
  id: string;
  lead_id: string;
  run_id: string;
  draft_message: string;
  suggested_channel: ReactivationChannel;
  signals: ReactivationSignal[];
  lead_context: {
    name: string;
    company?: string;
    days_dormant: number;
    persona_type?: string;
    preferred_formality?: 'Sie' | 'Du';
  };
  confidence_score: number;
  status: DraftStatus;
  created_at: string;
  expires_at: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  edited_message?: string;
  leads?: {
    name: string;
    company?: string;
    email?: string;
    linkedin_url?: string;
  };
}

export interface ReviewDraftRequest {
  action: ReviewAction;
  edited_message?: string;
  notes?: string;
  send_now?: boolean;
}

export interface ReviewDraftResponse {
  success: boolean;
  message: string;
  draft_id: string;
}

export interface BatchReactivationResponse {
  batch_id: string;
  message: string;
  count: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

export const reactivationApi = {
  /**
   * Listet alle dormanten Leads auf (>90 Tage kein Kontakt)
   */
  async getDormantLeads(minDays: number = 90, limit: number = 50): Promise<DormantLead[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${API_BASE_URL}/reactivation/dormant-leads?min_days=${minDays}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch dormant leads');
    }

    return response.json();
  },

  /**
   * Startet den Reactivation Agent für einen Lead
   */
  async startReactivation(leadId: string): Promise<ReactivationRun> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/reactivation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ lead_id: leadId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start reactivation');
    }

    return response.json();
  },

  /**
   * Listet alle Reactivation Runs
   */
  async getRuns(
    leadId?: string,
    status?: ReactivationRunStatus,
    limit: number = 20
  ): Promise<ReactivationRun[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const params = new URLSearchParams({ limit: limit.toString() });
    if (leadId) params.append('lead_id', leadId);
    if (status) params.append('status', status);

    const response = await fetch(
      `${API_BASE_URL}/reactivation/runs?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch runs');
    }

    return response.json();
  },

  /**
   * Holt Details zu einem spezifischen Run
   */
  async getRunDetails(runId: string): Promise<ReactivationRun> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/reactivation/runs/${runId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch run details');
    }

    return response.json();
  },

  /**
   * Startet Batch-Reactivation für mehrere Leads
   */
  async startBatchReactivation(
    minDays: number = 90,
    maxLeads: number = 10
  ): Promise<BatchReactivationResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${API_BASE_URL}/reactivation/batch?min_days=${minDays}&max_leads=${maxLeads}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start batch reactivation');
    }

    return response.json();
  },

  /**
   * Listet alle Drafts in der Review Queue
   */
  async getDrafts(status: DraftStatus = 'pending', limit: number = 20): Promise<ReactivationDraft[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${API_BASE_URL}/review-queue/drafts?status=${status}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch drafts');
    }

    return response.json();
  },

  /**
   * Holt einen spezifischen Draft mit Details
   */
  async getDraftDetails(draftId: string): Promise<ReactivationDraft> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/review-queue/drafts/${draftId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch draft');
    }

    return response.json();
  },

  /**
   * Reviewed einen Draft (approve, reject, edit)
   */
  async reviewDraft(
    draftId: string,
    request: ReviewDraftRequest
  ): Promise<ReviewDraftResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/review-queue/drafts/${draftId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to review draft');
    }

    return response.json();
  },

  /**
   * Holt Statistiken zur Review Queue
   */
  async getQueueStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    edit_rate: number;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/review-queue/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch queue stats');
    }

    return response.json();
  },
};

