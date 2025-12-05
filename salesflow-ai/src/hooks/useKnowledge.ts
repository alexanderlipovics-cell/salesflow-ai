/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useKnowledge Hook                                                         ║
 * ║  React Hook für Knowledge Base & Evidence Hub                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback } from 'react';
import { 
  knowledgeApi, 
  KnowledgeItem,
  KnowledgeSearchResult,
  KnowledgeContext,
  Company,
  KnowledgeHealth,
  KnowledgeDomain,
  KnowledgeType,
} from '../api/knowledge';

export interface UseKnowledgeReturn {
  // State
  items: KnowledgeItem[];
  searchResults: KnowledgeSearchResult | null;
  context: KnowledgeContext | null;
  companies: Company[];
  health: KnowledgeHealth | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadItems: (options?: { companyId?: string; domain?: string; type?: string }) => Promise<void>;
  search: (query: string, options?: { companySlug?: string; domains?: string; limit?: number }) => Promise<void>;
  getContextForChief: (query: string, companySlug?: string, maxItems?: number) => Promise<KnowledgeContext>;
  loadCompanies: (verticalId?: string) => Promise<void>;
  getCompany: (slug: string) => Promise<Company>;
  loadHealth: () => Promise<void>;
  
  // CRUD
  createItem: (item: {
    domain: KnowledgeDomain;
    type: KnowledgeType;
    title: string;
    content: string;
    topics?: string[];
  }) => Promise<KnowledgeItem>;
  updateItem: (itemId: string, update: Partial<KnowledgeItem>) => Promise<KnowledgeItem>;
  deleteItem: (itemId: string) => Promise<void>;
}

export function useKnowledge(): UseKnowledgeReturn {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult | null>(null);
  const [context, setContext] = useState<KnowledgeContext | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [health, setHealth] = useState<KnowledgeHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Items
  const loadItems = useCallback(async (options?: { companyId?: string; domain?: string; type?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.listItems(options);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search
  const search = useCallback(async (query: string, options?: { companySlug?: string; domains?: string; limit?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.quickSearch(query, options);
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Suche');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Context for CHIEF
  const getContextForChief = useCallback(async (query: string, companySlug?: string, maxItems: number = 5) => {
    try {
      const data = await knowledgeApi.getContextForChief({
        query,
        company_slug: companySlug,
        max_items: maxItems,
      });
      setContext(data);
      return data;
    } catch (err) {
      console.error('Failed to get context:', err);
      throw err;
    }
  }, []);

  // Load Companies
  const loadCompanies = useCallback(async (verticalId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.listCompanies(verticalId);
      setCompanies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Company
  const getCompany = useCallback(async (slug: string) => {
    return knowledgeApi.getCompany(slug);
  }, []);

  // Load Health
  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await knowledgeApi.getHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create Item
  const createItem = useCallback(async (item: {
    domain: KnowledgeDomain;
    type: KnowledgeType;
    title: string;
    content: string;
    topics?: string[];
  }) => {
    const created = await knowledgeApi.createItem(item);
    setItems(prev => [created, ...prev]);
    return created;
  }, []);

  // Update Item
  const updateItem = useCallback(async (itemId: string, update: Partial<KnowledgeItem>) => {
    const updated = await knowledgeApi.updateItem(itemId, update);
    setItems(prev => prev.map(i => i.id === itemId ? updated : i));
    return updated;
  }, []);

  // Delete Item
  const deleteItem = useCallback(async (itemId: string) => {
    await knowledgeApi.deleteItem(itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  return {
    items,
    searchResults,
    context,
    companies,
    health,
    loading,
    error,
    loadItems,
    search,
    getContextForChief,
    loadCompanies,
    getCompany,
    loadHealth,
    createItem,
    updateItem,
    deleteItem,
  };
}

export default useKnowledge;

