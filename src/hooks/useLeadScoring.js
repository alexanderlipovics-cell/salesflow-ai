/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USE LEAD SCORING HOOK                                     ║
 * ║  React Hook für BANT-Score und Lead-Qualifizierung                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateLeadScore,
  updateBANTScore,
  getLeadsByScore,
  getLeadScoreStats,
  getScoreCategory,
  getBANTLabel,
  getRecommendedAction,
  calculateProgress,
  BANT_QUESTIONS,
  SCORE_CATEGORIES
} from '../services/leadScoringService';

/**
 * Haupt-Hook für Lead Scoring
 * 
 * @param {string} userId - UUID des Users
 * @returns {Object} Lead Scoring State und Funktionen
 * 
 * @example
 * const { 
 *   leads, 
 *   stats, 
 *   hotLeads,
 *   updateScore 
 * } = useLeadScoring(userId);
 */
export function useLeadScoring(userId) {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Alle Leads mit Score laden
   */
  const loadLeads = useCallback(async (options = {}) => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [leadsData, statsData] = await Promise.all([
        getLeadsByScore(userId, options),
        getLeadScoreStats(userId)
      ]);
      
      setLeads(leadsData || []);
      setStats(statsData || {});
    } catch (err) {
      console.error('❌ Load Leads Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * BANT-Score aktualisieren
   */
  const updateScore = useCallback(async (leadId, bantValues) => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await updateBANTScore(leadId, bantValues);
      
      // Lokalen State aktualisieren
      setLeads(prev => prev.map(lead => {
        if (lead.id === leadId) {
          return {
            ...lead,
            lead_score: result.total_score,
            score_category: result.category,
            bant: result.bant_scores
          };
        }
        return lead;
      }));
      
      // Stats neu laden
      if (userId) {
        const newStats = await getLeadScoreStats(userId);
        setStats(newStats);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Update Score Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [userId]);

  /**
   * Einzelnen Lead-Score berechnen
   */
  const recalculateScore = useCallback(async (leadId) => {
    try {
      const result = await calculateLeadScore(leadId);
      
      // Lokalen State aktualisieren
      setLeads(prev => prev.map(lead => {
        if (lead.id === leadId) {
          return {
            ...lead,
            lead_score: result.total_score,
            score_category: result.category
          };
        }
        return lead;
      }));
      
      return result;
    } catch (err) {
      console.error('❌ Recalculate Error:', err);
      throw err;
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Leads nach Kategorie gruppiert
   */
  const leadsByCategory = useMemo(() => {
    return {
      hot: leads.filter(l => l.score_category === 'hot'),
      warm: leads.filter(l => l.score_category === 'warm'),
      cool: leads.filter(l => l.score_category === 'cool'),
      cold: leads.filter(l => l.score_category === 'cold' || !l.score_category)
    };
  }, [leads]);

  /**
   * Hot Leads
   */
  const hotLeads = useMemo(() => leadsByCategory.hot, [leadsByCategory]);

  /**
   * Leads ohne Score
   */
  const unscoredLeads = useMemo(() => {
    return leads.filter(l => !l.lead_score || l.lead_score === 0);
  }, [leads]);

  /**
   * Durchschnittlicher Score
   */
  const avgScore = useMemo(() => {
    if (leads.length === 0) return 0;
    const total = leads.reduce((sum, l) => sum + (l.lead_score || 0), 0);
    return Math.round(total / leads.length);
  }, [leads]);

  /**
   * Empfohlene Prioritäts-Reihenfolge
   */
  const prioritizedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      // Hot Leads zuerst
      const categoryOrder = { hot: 0, warm: 1, cool: 2, cold: 3 };
      const catDiff = (categoryOrder[a.score_category] || 3) - (categoryOrder[b.score_category] || 3);
      if (catDiff !== 0) return catDiff;
      
      // Dann nach Score
      return (b.lead_score || 0) - (a.lead_score || 0);
    });
  }, [leads]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Data
    leads,
    stats,
    
    // Computed
    leadsByCategory,
    hotLeads,
    unscoredLeads,
    prioritizedLeads,
    avgScore,
    
    // Status
    isLoading,
    isUpdating,
    error,
    hasLeads: leads.length > 0,
    
    // Actions
    refresh: loadLeads,
    updateScore,
    recalculateScore,
    
    // Filter
    filterByCategory: (category) => loadLeads({ category }),
    filterByMinScore: (minScore) => loadLeads({ minScore }),
    
    // Helpers
    getScoreCategory,
    getBANTLabel,
    getRecommendedAction,
    calculateProgress,
    
    // Constants
    BANT_QUESTIONS,
    SCORE_CATEGORIES
  };
}

/**
 * Hook für einzelnen Lead-Score
 */
export function useSingleLeadScore(leadId) {
  const [score, setScore] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = useCallback(async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await calculateLeadScore(leadId);
      setScore(result);
      return result;
    } catch (err) {
      console.error('❌ Calculate Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  const update = useCallback(async (bantValues) => {
    if (!leadId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await updateBANTScore(leadId, bantValues);
      setScore(result);
      return result;
    } catch (err) {
      console.error('❌ Update Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) {
      calculate();
    }
  }, [leadId, calculate]);

  return {
    score,
    isLoading,
    error,
    calculate,
    update,
    category: score ? getScoreCategory(score.total_score) : null,
    recommendation: score?.bant_scores ? getRecommendedAction(score.bant_scores) : null
  };
}

/**
 * Hook für BANT-Formular
 */
export function useBANTForm(initialValues = {}) {
  const [values, setValues] = useState({
    budget: initialValues.budget || 0,
    authority: initialValues.authority || 0,
    need: initialValues.need || 0,
    timeline: initialValues.timeline || 0,
    disgType: initialValues.disgType || null
  });

  const setValue = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues({
      budget: 0,
      authority: 0,
      need: 0,
      timeline: 0,
      disgType: null
    });
  }, []);

  const totalScore = useMemo(() => {
    return values.budget + values.authority + values.need + values.timeline;
  }, [values]);

  const progress = useMemo(() => {
    return Math.round((totalScore / 100) * 100);
  }, [totalScore]);

  const category = useMemo(() => {
    return getScoreCategory(totalScore);
  }, [totalScore]);

  const recommendation = useMemo(() => {
    return getRecommendedAction(values);
  }, [values]);

  return {
    values,
    setValue,
    setValues,
    reset,
    totalScore,
    progress,
    category,
    recommendation,
    BANT_QUESTIONS
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useLeadScoring;

