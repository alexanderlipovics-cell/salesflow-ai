/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - USE SUCCESS PATTERNS HOOK                                       ║
 * ║  React Hook für Team-Performance und Mentor-Matching                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getSuccessPatterns,
  getTopMentors,
  getPatternSummary,
  groupByPattern,
  calculateTeamStats,
  findBestMentor,
  getPatternLabel,
  getPatternColor,
  getScoreLevel,
  isValidUUID
} from '../services/successPatternsService';

/**
 * Hook für Success Patterns - lädt und cached Team-Performance-Daten
 * 
 * @param {string} workspaceId - UUID des Workspaces
 * @param {Object} options - Konfigurationsoptionen
 * @param {boolean} [options.autoRefresh=false] - Automatisch alle 5 Minuten refreshen
 * @param {boolean} [options.loadSummary=true] - Summary mit laden
 * @returns {Object} Success Patterns State und Funktionen
 * 
 * @example
 * const { 
 *   patterns, 
 *   summary, 
 *   isLoading, 
 *   error,
 *   topPerformers,
 *   mentors,
 *   refresh 
 * } = useSuccessPatterns(workspaceId);
 */
export function useSuccessPatterns(workspaceId, options = {}) {
  const { autoRefresh = false, loadSummary = true } = options;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [patterns, setPatterns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchData = useCallback(async () => {
    // Keine workspaceId oder ungültige UUID -> leere Daten ohne Fehler
    if (!workspaceId || !isValidUUID(workspaceId)) {
      console.log('ℹ️ useSuccessPatterns: Keine gültige Workspace-ID, zeige leere Daten');
      setPatterns([]);
      setSummary(null);
      setIsLoading(false);
      setError(null); // Kein Fehler anzeigen!
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parallel laden für bessere Performance
      const promises = [getSuccessPatterns(workspaceId)];
      if (loadSummary) {
        promises.push(getPatternSummary(workspaceId));
      }

      const [patternsData, summaryData] = await Promise.all(promises);

      setPatterns(patternsData || []);
      if (loadSummary) {
        setSummary(summaryData || null);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ useSuccessPatterns Fehler:', err);
      setError(err.message || 'Fehler beim Laden der Daten');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, loadSummary]);

  // Initial Load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-Refresh (alle 5 Minuten)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Top 5 Performer nach Score
   */
  const topPerformers = useMemo(() => {
    return [...patterns]
      .sort((a, b) => b.success_score - a.success_score)
      .slice(0, 5);
  }, [patterns]);

  /**
   * Alle Elite-Performer
   */
  const elitePerformers = useMemo(() => {
    return patterns.filter(p => p.success_pattern === 'elite_performer');
  }, [patterns]);

  /**
   * Patterns gruppiert nach Typ
   */
  const groupedPatterns = useMemo(() => {
    return groupByPattern(patterns);
  }, [patterns]);

  /**
   * Team-Statistiken
   */
  const teamStats = useMemo(() => {
    return calculateTeamStats(patterns);
  }, [patterns]);

  /**
   * Pattern-Distribution für Charts
   */
  const patternDistribution = useMemo(() => {
    const distribution = {
      elite_performer: 0,
      script_master: 0,
      closing_expert: 0,
      timing_champion: 0,
      solid_performer: 0
    };

    patterns.forEach(p => {
      if (distribution[p.success_pattern] !== undefined) {
        distribution[p.success_pattern]++;
      }
    });

    return Object.entries(distribution).map(([pattern, count]) => ({
      pattern,
      label: getPatternLabel(pattern),
      color: getPatternColor(pattern),
      count,
      percentage: patterns.length > 0 
        ? Math.round((count / patterns.length) * 100) 
        : 0
    }));
  }, [patterns]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Findet Mentoren für einen bestimmten Bereich
   * @param {string} area - Mentor-Bereich
   * @returns {Array} Passende Mentoren
   */
  const getMentorsForArea = useCallback((area) => {
    return patterns.filter(p => p.can_mentor_in.includes(area));
  }, [patterns]);

  /**
   * Findet den besten Mentor für einen Bereich
   * @param {string} area - Mentor-Bereich
   * @returns {Object|null} Bester Mentor
   */
  const getBestMentor = useCallback((area) => {
    return findBestMentor(patterns, area);
  }, [patterns]);

  /**
   * Sucht Performer nach Name
   * @param {string} query - Suchbegriff
   * @returns {Array} Gefundene Performer
   */
  const searchPerformers = useCallback((query) => {
    if (!query) return patterns;
    const lowerQuery = query.toLowerCase();
    return patterns.filter(p => 
      p.full_name.toLowerCase().includes(lowerQuery) ||
      p.email.toLowerCase().includes(lowerQuery)
    );
  }, [patterns]);

  /**
   * Gibt Pattern-Info für einen User zurück
   * @param {string} userId - User-ID
   * @returns {Object|null} Pattern des Users
   */
  const getPatternForUser = useCallback((userId) => {
    return patterns.find(p => p.user_id === userId) || null;
  }, [patterns]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Data
    patterns,
    summary,
    
    // Status
    isLoading,
    error,
    lastUpdated,
    
    // Computed
    topPerformers,
    elitePerformers,
    groupedPatterns,
    teamStats,
    patternDistribution,
    
    // Functions
    refresh: fetchData,
    getMentorsForArea,
    getBestMentor,
    searchPerformers,
    getPatternForUser,
    
    // Counts
    totalPerformers: patterns.length,
    hasData: patterns.length > 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPECIALIZED HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook speziell für Mentoren-Suche
 * 
 * @param {string} workspaceId - UUID des Workspaces
 * @param {string} [area] - Optional: Spezifischer Mentor-Bereich
 * @returns {Object} Mentoren-State
 */
export function useMentors(workspaceId, area = null) {
  const [mentors, setMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMentors = useCallback(async () => {
    // Keine workspaceId oder ungültige UUID -> leere Daten ohne Fehler
    if (!workspaceId || !isValidUUID(workspaceId)) {
      setMentors([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getTopMentors(workspaceId, area, 10);
      setMentors(data || []);
    } catch (err) {
      console.error('❌ useMentors Fehler:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, area]);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  const scriptMentors = useMemo(() => 
    mentors.filter(m => m.can_mentor_in?.includes('script_optimization')), 
    [mentors]
  );

  const closingMentors = useMemo(() => 
    mentors.filter(m => m.can_mentor_in?.includes('closing_techniques')), 
    [mentors]
  );

  const timingMentors = useMemo(() => 
    mentors.filter(m => m.can_mentor_in?.includes('time_management')), 
    [mentors]
  );

  return {
    mentors,
    isLoading,
    error,
    refresh: fetchMentors,
    scriptMentors,
    closingMentors,
    timingMentors,
    hasMentors: mentors.length > 0
  };
}

/**
 * Hook für Dashboard-Summary
 * 
 * @param {string} workspaceId - UUID des Workspaces
 * @returns {Object} Summary-State
 */
export function usePatternSummary(workspaceId) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    // Keine workspaceId oder ungültige UUID -> leere Daten ohne Fehler
    if (!workspaceId || !isValidUUID(workspaceId)) {
      setSummary(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getPatternSummary(workspaceId);
      setSummary(data || null);
    } catch (err) {
      console.error('❌ usePatternSummary Fehler:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refresh: fetchSummary,
    
    // Quick accessors
    avgTeamScore: summary?.avg_team_score || 0,
    topPerformer: summary?.top_performer || null,
    totalPerformers: summary?.total_performers || 0,
    eliteCount: summary?.elite_performers || 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useSuccessPatterns;

