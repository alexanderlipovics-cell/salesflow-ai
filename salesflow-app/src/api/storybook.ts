/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  STORYBOOK API                                                             ║
 * ║  API Functions für Brand Storybook & Compliance                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';

const API_BASE_URL = API_CONFIG.baseUrl;

// =============================================================================
// TYPES
// =============================================================================

export type StoryType = 'why' | 'origin' | 'product' | 'customer' | 'team' | 'vision';
export type Audience = 'consumer' | 'partner' | 'both';
export type GuardrailSeverity = 'block' | 'warn' | 'suggest';

export interface Story {
  id: string;
  title: string;
  story_type: StoryType;
  audience: Audience;
  content_30s: string | null;
  content_1min: string | null;
  content_2min: string | null;
  content_full: string | null;
  use_case: string | null;
  tags: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  tagline: string | null;
  description_short: string | null;
  description_full: string | null;
  key_benefits: string[];
  price_hint: string | null;
}

export interface Guardrail {
  id: string;
  rule_name: string;
  rule_description: string;
  severity: GuardrailSeverity;
  trigger_patterns: string[];
  example_bad: string | null;
  example_good: string | null;
  applies_to: string[];
  legal_reference: string | null;
}

export interface ComplianceViolation {
  rule_name: string;
  severity: GuardrailSeverity;
  description: string;
  matched_pattern: string;
  example_good: string | null;
}

export interface ComplianceResult {
  compliant: boolean;
  violations: ComplianceViolation[];
  violation_count: number;
  has_blockers: boolean;
}

export interface CompanyContext {
  company_id: string;
  company_name: string;
  stories: Story[];
  products: Product[];
  guardrails: Guardrail[];
  context_text: string;
}

export interface ImportResult {
  success: boolean;
  imported: {
    stories: number;
    products: number;
    guardrails: number;
  } | null;
  error: string | null;
}

export interface ImportStatus {
  imported: boolean;
  imported_at: string | null;
  counts: {
    stories: number;
    products: number;
    guardrails: number;
  };
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
// STORIES
// =============================================================================

/**
 * Holt Stories für eine Company.
 */
export async function getStories(
  companyId: string,
  options: {
    storyType?: StoryType;
    audience?: Audience;
  } = {}
): Promise<Story[]> {
  const params = new URLSearchParams();
  if (options.storyType) params.append('story_type', options.storyType);
  if (options.audience) params.append('audience', options.audience);
  
  const queryString = params.toString();
  return apiRequest<Story[]>(`/storybook/stories/${companyId}${queryString ? `?${queryString}` : ''}`);
}

/**
 * Findet die beste Story für einen Kontext.
 */
export async function getStoryForContext(
  companyId: string,
  contextType: string,
  audience?: Audience
): Promise<Story> {
  const params = new URLSearchParams();
  params.append('context_type', contextType);
  if (audience) params.append('audience', audience);
  
  return apiRequest<Story>(`/storybook/stories/${companyId}/for-context?${params.toString()}`);
}

// =============================================================================
// PRODUCTS
// =============================================================================

/**
 * Holt Produkte für eine Company.
 */
export async function getProducts(
  companyId: string,
  category?: string
): Promise<Product[]> {
  const params = category ? `?category=${category}` : '';
  return apiRequest<Product[]>(`/storybook/products/${companyId}${params}`);
}

/**
 * Holt ein Produkt by Slug.
 */
export async function getProductBySlug(
  companyId: string,
  productSlug: string
): Promise<Product> {
  return apiRequest<Product>(`/storybook/products/${companyId}/${productSlug}`);
}

// =============================================================================
// GUARDRAILS
// =============================================================================

/**
 * Holt Guardrails für eine Company.
 */
export async function getGuardrails(companyId: string): Promise<Guardrail[]> {
  return apiRequest<Guardrail[]>(`/storybook/guardrails/${companyId}`);
}

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * Holt kompletten Company-Kontext für CHIEF.
 */
export async function getCompanyContext(companyId: string): Promise<CompanyContext> {
  return apiRequest<CompanyContext>(`/storybook/context/${companyId}`);
}

// =============================================================================
// COMPLIANCE
// =============================================================================

/**
 * Prüft Text auf Compliance-Verstöße.
 */
export async function checkCompliance(
  text: string,
  options: {
    companyId?: string;
    vertical?: string;
  } = {}
): Promise<ComplianceResult> {
  return apiRequest<ComplianceResult>('/storybook/compliance/check', {
    method: 'POST',
    body: JSON.stringify({
      text,
      company_id: options.companyId,
      vertical: options.vertical,
    }),
  });
}

/**
 * Prüft Text und schlägt compliance-konforme Alternative vor.
 */
export async function suggestCompliantVersion(
  text: string,
  options: {
    companyId?: string;
    vertical?: string;
  } = {}
): Promise<{
  compliant: boolean;
  original_text: string;
  suggested_text?: string;
  violations?: ComplianceViolation[];
  suggestions?: Array<{
    rule: string;
    severity: GuardrailSeverity;
    suggestion: string;
  }>;
  changes?: string[];
  message?: string;
}> {
  return apiRequest('/storybook/compliance/suggest', {
    method: 'POST',
    body: JSON.stringify({
      text,
      company_id: options.companyId,
      vertical: options.vertical,
    }),
  });
}

// =============================================================================
// IMPORT
// =============================================================================

/**
 * Importiert Seed-Daten (zinzino, herbalife, etc.).
 */
export async function importSeedData(
  companyId: string,
  seedType: string
): Promise<ImportResult> {
  return apiRequest<ImportResult>(`/storybook/import/${companyId}/seed`, {
    method: 'POST',
    body: JSON.stringify({ seed_type: seedType }),
  });
}

/**
 * Holt verfügbare Seeds.
 */
export async function getAvailableSeeds(): Promise<{
  seeds: string[];
  description: Record<string, string>;
}> {
  return apiRequest('/storybook/seeds/available');
}

/**
 * Holt Import-Status für eine Company.
 */
export async function getImportStatus(companyId: string): Promise<ImportStatus> {
  return apiRequest<ImportStatus>(`/storybook/imports/${companyId}/status`);
}

/**
 * Holt Import-Historie für eine Company.
 */
export async function getImportHistory(companyId: string): Promise<Array<{
  id: string;
  file_name: string;
  status: string;
  created_at: string;
}>> {
  return apiRequest(`/storybook/imports/${companyId}`);
}

// =============================================================================
// NAMED EXPORT
// =============================================================================

export const storybookApi = {
  // Stories
  getStories,
  getStoryForContext,
  
  // Products
  getProducts,
  getProductBySlug,
  
  // Guardrails
  getGuardrails,
  
  // Context
  getCompanyContext,
  
  // Compliance
  checkCompliance,
  suggestCompliantVersion,
  
  // Import
  importSeedData,
  getAvailableSeeds,
  getImportStatus,
  getImportHistory,
};

export default storybookApi;

