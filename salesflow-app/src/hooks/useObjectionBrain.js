/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USE OBJECTION BRAIN HOOK                                  ║
 * ║  React Hook für Einwand-Suche und DISG-Antworten                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  searchObjections,
  getObjectionsByCategory,
  getDISGResponse,
  getObjectionCategories,
  getTopObjections,
  getCategoryLabel,
  getDISGInfo,
  recommendResponseStrategy,
  CATEGORY_LABELS,
  DISG_LABELS
} from '../services/objectionBrainService';

/**
 * Haupt-Hook für Objection Brain
 * 
 * @param {Object} options - Optionen
 * @returns {Object} Objection Brain State und Funktionen
 * 
 * @example
 * const { 
 *   searchResults, 
 *   categories,
 *   search, 
 *   isLoading 
 * } = useObjectionBrain();
 */
export function useObjectionBrain(options = {}) {
  const { autoLoadCategories = true, autoLoadTop = true } = options;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [searchResults, setSearchResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topObjections, setTopObjections] = useState([]);
  const [selectedObjection, setSelectedObjection] = useState(null);
  const [disgResponse, setDisgResponse] = useState(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingDisg, setIsLoadingDisg] = useState(false);
  const [error, setError] = useState(null);
  
  const [lastSearchTerm, setLastSearchTerm] = useState('');

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Nach Einwänden suchen
   */
  const search = useCallback(async (searchText, options = {}) => {
    if (!searchText?.trim()) {
      setSearchResults([]);
      return [];
    }

    setIsSearching(true);
    setError(null);
    setLastSearchTerm(searchText);

    try {
      const results = await searchObjections(searchText, options);
      setSearchResults(results);
      return results;
    } catch (err) {
      console.error('❌ Search Error:', err);
      setError(err.message);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Kategorien laden
   */
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const cats = await getObjectionCategories();
      setCategories(cats || []);
      return cats;
    } catch (err) {
      console.error('❌ Load Categories Error:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  /**
   * Top-Einwände laden
   */
  const loadTopObjections = useCallback(async (limit = 10) => {
    try {
      const top = await getTopObjections(limit);
      setTopObjections(top || []);
      return top;
    } catch (err) {
      console.error('❌ Load Top Error:', err);
      return [];
    }
  }, []);

  /**
   * DISG-Antwort laden
   */
  const loadDISGResponse = useCallback(async (objectionId, disgType) => {
    if (!objectionId || !disgType) return null;

    setIsLoadingDisg(true);
    try {
      const response = await getDISGResponse(objectionId, disgType);
      setDisgResponse(response);
      return response;
    } catch (err) {
      console.error('❌ DISG Response Error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoadingDisg(false);
    }
  }, []);

  /**
   * Einwand auswählen
   */
  const selectObjection = useCallback((objection) => {
    setSelectedObjection(objection);
    setDisgResponse(null);
  }, []);

  // Initial Load
  useEffect(() => {
    if (autoLoadCategories) {
      loadCategories();
    }
    if (autoLoadTop) {
      loadTopObjections();
    }
  }, [autoLoadCategories, autoLoadTop, loadCategories, loadTopObjections]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gruppierte Suchergebnisse nach Kategorie
   */
  const groupedResults = useMemo(() => {
    return searchResults.reduce((groups, objection) => {
      const cat = objection.category || 'other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(objection);
      return groups;
    }, {});
  }, [searchResults]);

  /**
   * Beste Übereinstimmung
   */
  const bestMatch = useMemo(() => {
    if (searchResults.length === 0) return null;
    return searchResults[0];
  }, [searchResults]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Data
    searchResults,
    categories,
    topObjections,
    selectedObjection,
    disgResponse,
    
    // Computed
    groupedResults,
    bestMatch,
    lastSearchTerm,
    
    // Status
    isSearching,
    isLoadingCategories,
    isLoadingDisg,
    isLoading: isSearching || isLoadingCategories,
    error,
    hasResults: searchResults.length > 0,
    
    // Actions
    search,
    loadCategories,
    loadTopObjections,
    loadDISGResponse,
    selectObjection,
    clearSearch: () => {
      setSearchResults([]);
      setLastSearchTerm('');
    },
    
    // Helpers
    getCategoryLabel,
    getDISGInfo,
    recommendResponseStrategy,
    
    // Constants
    CATEGORY_LABELS,
    DISG_LABELS
  };
}

/**
 * Hook für Einwände einer bestimmten Kategorie
 */
export function useObjectionCategory(category, vertical = null) {
  const [objections, setObjections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!category) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getObjectionsByCategory(category, vertical);
      setObjections(data || []);
    } catch (err) {
      console.error('❌ Load Category Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [category, vertical]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    objections,
    isLoading,
    error,
    refresh: load,
    count: objections.length
  };
}

/**
 * Hook für schnelle Einwand-Suche (mit Debounce)
 */
export function useQuickSearch(debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { searchResults, isSearching, search } = useObjectionBrain({ 
    autoLoadCategories: false, 
    autoLoadTop: false 
  });

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      search(debouncedQuery);
    }
  }, [debouncedQuery, search]);

  return {
    query,
    setQuery,
    results: searchResults,
    isSearching,
    hasResults: searchResults.length > 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useObjectionBrain;

