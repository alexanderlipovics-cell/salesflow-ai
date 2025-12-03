/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  KNOWLEDGE API                                                             ║
 * ║  API Functions für Evidence Hub & Company Knowledge                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type KnowledgeDomain = 'evidence' | 'product' | 'company' | 'competitor' | 'objection' | 'success_story';
export type KnowledgeType = 'fact' | 'study' | 'testimonial' | 'faq' | 'objection_response' | 'script' | 'guideline';

export interface KnowledgeItem {
  id: string;
  company_id: string | null;
  domain: KnowledgeDomain;
  type: KnowledgeType;
  title: string;
  content: string;
  summary: string | null;
  topics: string[];
  keywords: string[];
  source: string | null;
  source_url: string | null;
  evidence_level: 'high' | 'medium' | 'low' | null;
  is_verified: boolean;
  requires_disclaimer: boolean;
  disclaimer: string | null;
  vertical_id: string | null;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSearchResult {
  items: KnowledgeItem[];
  total: number;
  query: string;
  search_type: 'semantic' | 'keyword' | 'hybrid';
}

export interface KnowledgeContextItem {
  id: string;
  domain: KnowledgeDomain;
  type: KnowledgeType;
  title: string;
  content: string;
  relevance_score: number;
  requires_disclaimer: boolean;
  disclaimer: string | null;
}

export interface KnowledgeContext {
  items: KnowledgeContextItem[];
  total_tokens_estimate: number;
  has_evidence: boolean;
  has_company_knowledge: boolean;
  compliance_warnings: string[];
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  vertical_id: string;
  logo_url: string | null;
  storybook_imported: boolean;
  storybook_imported_at: string | null;
  is_active: boolean;
}

export interface KnowledgeHealth {
  total_items: number;
  items_by_domain: Record<string, number>;
  items_by_type: Record<string, number>;
  items_with_embeddings: number;
  items_verified: number;
  last_import_at: string | null;
  embedding_coverage: number;
}

// =============================================================================
// HELPER
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Nicht authentifiziert');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unbekannter Fehler' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// CRUD
// =============================================================================

/**
 * Erstellt ein Knowledge Item.
 */
export async function createItem(item: {
  domain: KnowledgeDomain;
  type: KnowledgeType;
  title: string;
  content: string;
  summary?: string;
  topics?: string[];
  keywords?: string[];
  source?: string;
  source_url?: string;
  evidence_level?: 'high' | 'medium' | 'low';
  requires_disclaimer?: boolean;
  disclaimer?: string;
  vertical_id?: string;
}): Promise<KnowledgeItem> {
  return apiRequest<KnowledgeItem>('/knowledge/items', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

/**
 * Holt ein Knowledge Item.
 */
export async function getItem(itemId: string): Promise<KnowledgeItem> {
  return apiRequest<KnowledgeItem>(`/knowledge/items/${itemId}`);
}

/**
 * Updated ein Knowledge Item.
 */
export async function updateItem(
  itemId: string,
  update: Partial<Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<KnowledgeItem> {
  return apiRequest<KnowledgeItem>(`/knowledge/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}

/**
 * Löscht ein Knowledge Item (soft-delete).
 */
export async function deleteItem(itemId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/knowledge/items/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Listet Knowledge Items.
 */
export async function listItems(options: {
  companyId?: string;
  domain?: string;
  type?: string;
  topic?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<KnowledgeItem[]> {
  const params = new URLSearchParams();
  if (options.companyId) params.append('company_id', options.companyId);
  if (options.domain) params.append('domain', options.domain);
  if (options.type) params.append('type', options.type);
  if (options.topic) params.append('topic', options.topic);
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());
  
  const queryString = params.toString();
  return apiRequest<KnowledgeItem[]>(`/knowledge/items${queryString ? `?${queryString}` : ''}`);
}

// =============================================================================
// SEARCH
// =============================================================================

/**
 * Sucht in der Knowledge Base (Hybrid-Suche).
 */
export async function search(query: {
  query: string;
  company_slug?: string;
  vertical_id?: string;
  domains?: KnowledgeDomain[];
  types?: KnowledgeType[];
  limit?: number;
}): Promise<KnowledgeSearchResult> {
  return apiRequest<KnowledgeSearchResult>('/knowledge/search', {
    method: 'POST',
    body: JSON.stringify(query),
  });
}

/**
 * Quick Search (GET).
 */
export async function quickSearch(
  q: string,
  options: {
    companySlug?: string;
    verticalId?: string;
    domains?: string;
    types?: string;
    limit?: number;
  } = {}
): Promise<KnowledgeSearchResult> {
  const params = new URLSearchParams();
  params.append('q', q);
  if (options.companySlug) params.append('company_slug', options.companySlug);
  if (options.verticalId) params.append('vertical_id', options.verticalId);
  if (options.domains) params.append('domains', options.domains);
  if (options.types) params.append('types', options.types);
  if (options.limit) params.append('limit', options.limit.toString());
  
  return apiRequest<KnowledgeSearchResult>(`/knowledge/search?${params.toString()}`);
}

// =============================================================================
// CHIEF CONTEXT
// =============================================================================

/**
 * Holt Knowledge-Context für CHIEF.
 */
export async function getCompanyContext(
  companySlug: string,
  query: string,
  options: {
    maxItems?: number;
    maxTokens?: number;
  } = {}
): Promise<KnowledgeContext> {
  const params = new URLSearchParams();
  params.append('query', query);
  if (options.maxItems) params.append('max_items', options.maxItems.toString());
  if (options.maxTokens) params.append('max_tokens', options.maxTokens.toString());
  
  return apiRequest<KnowledgeContext>(`/knowledge/companies/${companySlug}/context?${params.toString()}`);
}

/**
 * Holt Knowledge-Context (POST-Version).
 */
export async function getContextForChief(request: {
  query: string;
  company_slug?: string;
  vertical_id?: string;
  max_items?: number;
  max_tokens?: number;
}): Promise<KnowledgeContext> {
  return apiRequest<KnowledgeContext>('/knowledge/context', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// =============================================================================
// COMPANIES
// =============================================================================

/**
 * Listet alle Companies.
 */
export async function listCompanies(verticalId?: string): Promise<Company[]> {
  const params = verticalId ? `?vertical_id=${verticalId}` : '';
  return apiRequest<Company[]>(`/knowledge/companies${params}`);
}

/**
 * Holt eine Company by Slug.
 */
export async function getCompany(slug: string): Promise<Company> {
  return apiRequest<Company>(`/knowledge/companies/${slug}`);
}

// =============================================================================
// HEALTH & ADMIN
// =============================================================================

/**
 * Health Check für das Knowledge System.
 */
export async function getHealth(): Promise<KnowledgeHealth> {
  return apiRequest<KnowledgeHealth>('/knowledge/health');
}

/**
 * Regeneriert Embeddings.
 */
export async function regenerateEmbeddings(options: {
  companySlug?: string;
  force?: boolean;
} = {}): Promise<{ success: boolean; message: string }> {
  const params = new URLSearchParams();
  if (options.companySlug) params.append('company_slug', options.companySlug);
  if (options.force) params.append('force', 'true');
  
  const queryString = params.toString();
  return apiRequest(`/knowledge/embeddings/regenerate${queryString ? `?${queryString}` : ''}`, {
    method: 'POST',
  });
}

/**
 * Importiert Evidence Hub.
 */
export async function importEvidenceHub(options: {
  dryRun?: boolean;
  companySlug?: string;
  generateEmbeddings?: boolean;
} = {}): Promise<{
  success: boolean;
  imported_count: number;
  skipped_count: number;
  errors: string[];
  embedding_status?: string;
}> {
  const params = new URLSearchParams();
  if (options.dryRun) params.append('dry_run', 'true');
  if (options.companySlug) params.append('company_slug', options.companySlug);
  if (options.generateEmbeddings) params.append('generate_embeddings', 'true');
  
  const queryString = params.toString();
  return apiRequest(`/knowledge/import/evidence-hub${queryString ? `?${queryString}` : ''}`, {
    method: 'POST',
  });
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const knowledgeApi = {
  // CRUD
  createItem,
  getItem,
  updateItem,
  deleteItem,
  listItems,
  
  // Search
  search,
  quickSearch,
  
  // CHIEF Context
  getCompanyContext,
  getContextForChief,
  
  // Companies
  listCompanies,
  getCompany,
  
  // Health & Admin
  getHealth,
  regenerateEmbeddings,
  importEvidenceHub,
};

export default knowledgeApi;

