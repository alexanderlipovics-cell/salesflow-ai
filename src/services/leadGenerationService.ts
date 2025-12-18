/**
 * SalesFlow AI - Non Plus Ultra Lead Generation Service
 * 
 * Frontend API Service für das Lead-Generierungssystem
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface VerificationResult {
  success: boolean;
  v_score: number;
  email_valid?: boolean;
  phone_valid?: boolean;
  is_duplicate: boolean;
  details: {
    email_score: number;
    phone_score: number;
    domain_score: number;
    social_score: number;
    behavioral_score: number;
  };
}

export interface EnrichmentResult {
  success: boolean;
  e_score: number;
  company: Record<string, any>;
  person: Record<string, any>;
  icp_match_score: number;
  tech_stack: Array<{ name: string; category: string }>;
}

export interface IntentResult {
  success: boolean;
  i_score: number;
  intent_stage: string;
  buying_role: string;
  direct_signals: Record<string, any>;
  activity: Record<string, any>;
}

export interface CombinedScores {
  lead_id: string;
  p_score: number;
  v_score: number;
  e_score: number;
  i_score: number;
  lead_temperature: string;
  priority: number;
  intent_stage: string;
}

export interface AssignmentResult {
  success: boolean;
  lead_id: string;
  assigned_to?: string;
  assignment_id?: string;
  method: string;
  score: number;
  sla_hours: number;
  reasons: string[];
  error?: string;
}

export interface OutreachResult {
  success: boolean;
  outreach_id?: string;
  scheduled_at?: string;
  error?: string;
}

// ============================================================================
// API BASE
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${API_BASE_URL}/api/lead-generation${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'API Error');
  }

  return response.json();
}

// ============================================================================
// VERIFICATION
// ============================================================================

export async function verifyLead(
  leadId: string,
  options?: {
    email?: string;
    phone?: string;
    companyDomain?: string;
    linkedinUrl?: string;
  }
): Promise<VerificationResult> {
  return apiCall('/verify', 'POST', {
    lead_id: leadId,
    email: options?.email,
    phone: options?.phone,
    company_domain: options?.companyDomain,
    linkedin_url: options?.linkedinUrl,
  });
}

export async function verifyLeadsBatch(leadIds: string[]): Promise<{ message: string }> {
  return apiCall('/verify/batch', 'POST', leadIds);
}

// ============================================================================
// ENRICHMENT
// ============================================================================

export async function enrichLead(
  leadId: string,
  options?: {
    email?: string;
    companyName?: string;
    companyDomain?: string;
    personName?: string;
    linkedinUrl?: string;
  }
): Promise<EnrichmentResult> {
  return apiCall('/enrich', 'POST', {
    lead_id: leadId,
    email: options?.email,
    company_name: options?.companyName,
    company_domain: options?.companyDomain,
    person_name: options?.personName,
    linkedin_url: options?.linkedinUrl,
  });
}

// ============================================================================
// INTENT
// ============================================================================

export async function analyzeIntent(
  leadId: string,
  messages?: Array<{ content: string; direction: string }>
): Promise<IntentResult> {
  return apiCall('/intent', 'POST', {
    lead_id: leadId,
    messages,
  });
}

export async function analyzeMessageIntent(message: string): Promise<{
  keywords_found: Array<{ keyword: string; category: string }>;
  intent_category: string;
  intent_strength: number;
  suggested_response_type: string;
}> {
  return apiCall(`/intent/message?message=${encodeURIComponent(message)}`, 'POST');
}

// ============================================================================
// LEAD ACQUISITION
// ============================================================================

export async function createLead(data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  company_domain?: string;
  title?: string;
  linkedin_url?: string;
  notes?: string;
  tags?: string[];
  source_type?: string;
  source_campaign?: string;
}): Promise<{
  success: boolean;
  lead_id?: string;
  is_duplicate: boolean;
  duplicate_lead_id?: string;
  errors: string[];
}> {
  return apiCall('/acquire', 'POST', data);
}

export async function handleWebForm(submission: {
  form_data: Record<string, any>;
  form_id?: string;
  page_url?: string;
  referrer?: string;
}): Promise<{
  success: boolean;
  lead_id?: string;
  is_duplicate: boolean;
  errors: string[];
}> {
  return apiCall('/acquire/web-form', 'POST', submission);
}

// ============================================================================
// ASSIGNMENT
// ============================================================================

export async function assignLead(request: {
  lead_id: string;
  force_user_id?: string;
  method?: string;
}): Promise<AssignmentResult> {
  return apiCall('/assign', 'POST', request);
}

export async function assignUnassignedLeads(limit: number = 50): Promise<{
  total: number;
  assigned: number;
  failed: number;
  errors: Array<{ lead_id: string; error: string }>;
}> {
  return apiCall(`/assign/batch?limit=${limit}`, 'POST');
}

export async function getSLABreaches(): Promise<{
  count: number;
  breaches: Array<{
    id: string;
    lead_id: string;
    assigned_to: string;
    hours_overdue: number;
    sla_breached: boolean;
  }>;
}> {
  return apiCall('/sla/breaches');
}

// ============================================================================
// OUTREACH
// ============================================================================

export async function createOutreach(request: {
  lead_id: string;
  channel: string;
  template_id?: string;
  send_immediately?: boolean;
  custom_message?: string;
}): Promise<OutreachResult> {
  return apiCall('/outreach', 'POST', request);
}

export async function processOutreachQueue(limit: number = 50): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: Array<{ outreach_id: string; error: string }>;
}> {
  return apiCall(`/outreach/process-queue?limit=${limit}`, 'POST');
}

// ============================================================================
// TRACKING
// ============================================================================

export async function trackWebEvent(event: {
  lead_id?: string;
  visitor_id: string;
  event_type: string;
  event_url: string;
  session_id?: string;
  time_on_page?: number;
  scroll_depth?: number;
  page_title?: string;
}): Promise<{ success: boolean }> {
  return apiCall('/track/web', 'POST', event);
}

export async function trackSocialEvent(event: {
  lead_id?: string;
  platform: string;
  engagement_type: string;
  user_id?: string;
  username?: string;
  post_id?: string;
  post_url?: string;
  comment_text?: string;
}): Promise<{ success: boolean }> {
  return apiCall('/track/social', 'POST', event);
}

// ============================================================================
// COMBINED OPERATIONS
// ============================================================================

export async function processLeadFull(
  leadId: string,
  options?: {
    verify?: boolean;
    enrich?: boolean;
    analyzeIntent?: boolean;
    assign?: boolean;
    createOutreach?: boolean;
  }
): Promise<{
  success: boolean;
  results: {
    lead_id: string;
    verification?: { v_score: number };
    enrichment?: { e_score: number };
    intent?: { i_score: number; stage: string };
    assignment?: { assigned_to?: string; score: number };
    outreach?: { outreach_id?: string; scheduled_at?: string };
    p_score?: number;
  };
}> {
  const params = new URLSearchParams();
  if (options?.verify !== undefined) params.append('verify', String(options.verify));
  if (options?.enrich !== undefined) params.append('enrich', String(options.enrich));
  if (options?.analyzeIntent !== undefined) params.append('analyze_intent', String(options.analyzeIntent));
  if (options?.assign !== undefined) params.append('assign', String(options.assign));
  if (options?.createOutreach !== undefined) params.append('create_outreach', String(options.createOutreach));

  return apiCall(`/process-lead/${leadId}?${params.toString()}`, 'POST');
}

export async function getLeadScores(leadId: string): Promise<CombinedScores> {
  return apiCall(`/score/${leadId}`);
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getAcquisitionStats(days: number = 30): Promise<{
  period_days: number;
  total_leads: number;
  by_source: Record<string, number>;
  by_campaign: Record<string, number>;
  top_sources: Array<[string, number]>;
  top_campaigns: Array<[string, number]>;
}> {
  return apiCall(`/stats/acquisition?days=${days}`);
}

export async function getPipelineStats(): Promise<{
  total: number;
  hot: number;
  warm: number;
  cool: number;
  cold: number;
  by_status: Record<string, number>;
}> {
  return apiCall('/stats/pipeline');
}

// ============================================================================
// HOT LEADS
// ============================================================================

export async function getHotLeads(limit: number = 20): Promise<Array<{
  id: string;
  name: string;
  email?: string;
  company?: string;
  p_score: number;
  v_score?: number;
  e_score?: number;
  i_score?: number;
  lead_temperature: string;
  priority: number;
  intent_stage?: string;
}>> {
  const { data, error } = await supabase
    .from('v_hot_leads')
    .select('*')
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getLeadsNeedingVerification(limit: number = 50): Promise<Array<{
  id: string;
  name: string;
  email?: string;
}>> {
  const { data, error } = await supabase
    .from('v_leads_need_verification')
    .select('id, name, email')
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Verification
  verifyLead,
  verifyLeadsBatch,
  
  // Enrichment
  enrichLead,
  
  // Intent
  analyzeIntent,
  analyzeMessageIntent,
  
  // Acquisition
  createLead,
  handleWebForm,
  
  // Assignment
  assignLead,
  assignUnassignedLeads,
  getSLABreaches,
  
  // Outreach
  createOutreach,
  processOutreachQueue,
  
  // Tracking
  trackWebEvent,
  trackSocialEvent,
  
  // Combined
  processLeadFull,
  getLeadScores,
  
  // Stats
  getAcquisitionStats,
  getPipelineStats,
  
  // Hot Leads
  getHotLeads,
  getLeadsNeedingVerification,
};

