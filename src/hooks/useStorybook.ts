/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useStorybook Hook                                                         ║
 * ║  React Hook für Brand Storybook & Compliance                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback } from 'react';
import { 
  storybookApi, 
  Story,
  Product,
  Guardrail,
  ComplianceResult,
  CompanyContext,
  ImportStatus,
  StoryType,
  Audience,
} from '../api/storybook';

export interface UseStorybookReturn {
  // State
  stories: Story[];
  products: Product[];
  guardrails: Guardrail[];
  companyContext: CompanyContext | null;
  importStatus: ImportStatus | null;
  loading: boolean;
  error: string | null;
  
  // Story Actions
  loadStories: (companyId: string, options?: { storyType?: StoryType; audience?: Audience }) => Promise<void>;
  getStoryForContext: (companyId: string, contextType: string, audience?: Audience) => Promise<Story>;
  
  // Product Actions
  loadProducts: (companyId: string, category?: string) => Promise<void>;
  getProduct: (companyId: string, productSlug: string) => Promise<Product>;
  
  // Guardrail Actions
  loadGuardrails: (companyId: string) => Promise<void>;
  
  // Context
  loadCompanyContext: (companyId: string) => Promise<void>;
  
  // Compliance
  checkCompliance: (text: string, options?: { companyId?: string; vertical?: string }) => Promise<ComplianceResult>;
  suggestCompliantVersion: (text: string, options?: { companyId?: string; vertical?: string }) => Promise<{
    compliant: boolean;
    suggested_text?: string;
    suggestions?: Array<{ rule: string; suggestion: string }>;
  }>;
  
  // Import
  loadImportStatus: (companyId: string) => Promise<void>;
  importSeedData: (companyId: string, seedType: string) => Promise<{ success: boolean; imported?: { stories: number; products: number; guardrails: number } }>;
}

export function useStorybook(): UseStorybookReturn {
  const [stories, setStories] = useState<Story[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Stories
  const loadStories = useCallback(async (companyId: string, options?: { storyType?: StoryType; audience?: Audience }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await storybookApi.getStories(companyId, options);
      setStories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Story for Context
  const getStoryForContext = useCallback(async (companyId: string, contextType: string, audience?: Audience) => {
    return storybookApi.getStoryForContext(companyId, contextType, audience);
  }, []);

  // Load Products
  const loadProducts = useCallback(async (companyId: string, category?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await storybookApi.getProducts(companyId, category);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Product
  const getProduct = useCallback(async (companyId: string, productSlug: string) => {
    return storybookApi.getProductBySlug(companyId, productSlug);
  }, []);

  // Load Guardrails
  const loadGuardrails = useCallback(async (companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await storybookApi.getGuardrails(companyId);
      setGuardrails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Company Context
  const loadCompanyContext = useCallback(async (companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await storybookApi.getCompanyContext(companyId);
      setCompanyContext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check Compliance
  const checkCompliance = useCallback(async (text: string, options?: { companyId?: string; vertical?: string }) => {
    return storybookApi.checkCompliance(text, options);
  }, []);

  // Suggest Compliant Version
  const suggestCompliantVersion = useCallback(async (text: string, options?: { companyId?: string; vertical?: string }) => {
    return storybookApi.suggestCompliantVersion(text, options);
  }, []);

  // Load Import Status
  const loadImportStatus = useCallback(async (companyId: string) => {
    setLoading(true);
    try {
      const data = await storybookApi.getImportStatus(companyId);
      setImportStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Import Seed Data
  const importSeedData = useCallback(async (companyId: string, seedType: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await storybookApi.importSeedData(companyId, seedType);
      if (result.success) {
        // Reload import status
        await loadImportStatus(companyId);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Import');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [loadImportStatus]);

  return {
    stories,
    products,
    guardrails,
    companyContext,
    importStatus,
    loading,
    error,
    loadStories,
    getStoryForContext,
    loadProducts,
    getProduct,
    loadGuardrails,
    loadCompanyContext,
    checkCompliance,
    suggestCompliantVersion,
    loadImportStatus,
    importSeedData,
  };
}

export default useStorybook;

