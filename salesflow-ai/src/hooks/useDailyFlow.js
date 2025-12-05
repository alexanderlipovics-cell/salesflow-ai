/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - USE DAILY FLOW HOOK                                      ║
 * ║  React Hook für Daily Flow Agent - Tagespläne, Actions, Fortschritt       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getDailyFlowConfig,
  saveDailyFlowConfig,
  getDailyPlan,
  generateDailyPlan,
  completeAction as completeActionService,
  skipAction as skipActionService,
  snoozeAction as snoozeActionService,
  startAction as startActionService,
  getDailyStats,
  getConversionRates,
  DailyFlowError,
  getProgressPercentage,
  groupActionsByStatus,
} from '../services/dailyFlowService';
import { getTodayString } from '../types/dailyFlow';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK: useDailyFlow
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Haupt-Hook für Daily Flow
 * 
 * @param {Object} options - Optionen
 * @param {boolean} options.autoGenerate - Plan automatisch generieren wenn keiner existiert (default: true)
 * @param {string} options.date - Datum im Format YYYY-MM-DD (default: heute)
 * @returns {Object} Daily Flow State und Funktionen
 * 
 * @example
 * const { 
 *   config, 
 *   plan, 
 *   pendingActions,
 *   progress, 
 *   completeAction,
 *   isLoading 
 * } = useDailyFlow();
 */
export function useDailyFlow(options = {}) {
  const { 
    autoGenerate = true, 
    date = getTodayString() 
  } = options;

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [config, setConfig] = useState(null);
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState(null);
  const [conversionRates, setConversionRates] = useState(null);
  
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [error, setError] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Config laden
   */
  const loadConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setError(null);

    try {
      const configData = await getDailyFlowConfig();
      setConfig(configData);
      return configData;
    } catch (err) {
      console.error('❌ Load Config Error:', err);
      setError(err instanceof DailyFlowError ? err : new DailyFlowError('Failed to load config', 'LOAD_ERROR', err));
      return null;
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  /**
   * Plan laden
   */
  const loadPlan = useCallback(async () => {
    setIsLoadingPlan(true);
    setError(null);

    try {
      let planData = await getDailyPlan(date);
      
      // Auto-generate wenn kein Plan existiert und Config vorhanden
      if (!planData && autoGenerate && config) {
        setIsGenerating(true);
        planData = await generateDailyPlan(date);
        setIsGenerating(false);
      }
      
      setPlan(planData);
      return planData;
    } catch (err) {
      console.error('❌ Load Plan Error:', err);
      // Kein Fehler wenn einfach kein Plan existiert
      if (err.code !== 'NO_CONFIG') {
        setError(err instanceof DailyFlowError ? err : new DailyFlowError('Failed to load plan', 'LOAD_ERROR', err));
      }
      return null;
    } finally {
      setIsLoadingPlan(false);
    }
  }, [date, autoGenerate, config]);

  /**
   * Stats laden
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getDailyStats(date);
      setStats(statsData);
      return statsData;
    } catch (err) {
      console.error('❌ Load Stats Error:', err);
      return null;
    }
  }, [date]);

  /**
   * Conversion Rates laden
   */
  const loadConversionRates = useCallback(async () => {
    try {
      const ratesData = await getConversionRates(90);
      setConversionRates(ratesData);
      return ratesData;
    } catch (err) {
      console.error('❌ Load Rates Error:', err);
      return null;
    }
  }, []);

  /**
   * Alle Daten neu laden
   */
  const refetch = useCallback(async () => {
    await loadConfig();
    await loadPlan();
    await loadStats();
  }, [loadConfig, loadPlan, loadStats]);

  // Initial Load
  useEffect(() => {
    loadConfig();
    loadConversionRates();
  }, [loadConfig, loadConversionRates]);

  // Load Plan when config is available
  useEffect(() => {
    if (!isLoadingConfig) {
      loadPlan();
    }
  }, [isLoadingConfig, loadPlan]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Config speichern
   */
  const saveConfig = useCallback(async (newConfig) => {
    setIsUpdating(true);
    setError(null);

    try {
      const savedConfig = await saveDailyFlowConfig(newConfig);
      setConfig(savedConfig);
      return savedConfig;
    } catch (err) {
      console.error('❌ Save Config Error:', err);
      setError(err instanceof DailyFlowError ? err : new DailyFlowError('Failed to save config', 'SAVE_ERROR', err));
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAN ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Plan generieren
   */
  const generatePlan = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const newPlan = await generateDailyPlan(date);
      setPlan(newPlan);
      return newPlan;
    } catch (err) {
      console.error('❌ Generate Plan Error:', err);
      setError(err instanceof DailyFlowError ? err : new DailyFlowError('Failed to generate plan', 'GENERATE_ERROR', err));
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [date]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Action als erledigt markieren
   */
  const completeAction = useCallback(async (actionId, notes = null) => {
    setIsUpdating(true);
    try {
      await completeActionService(actionId, notes);
      await loadPlan(); // Reload to get updated stats
    } catch (err) {
      console.error('❌ Complete Action Error:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadPlan]);

  /**
   * Action überspringen
   */
  const skipAction = useCallback(async (actionId, reason) => {
    setIsUpdating(true);
    try {
      await skipActionService(actionId, reason);
      await loadPlan();
    } catch (err) {
      console.error('❌ Skip Action Error:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadPlan]);

  /**
   * Action verschieben (snooze)
   */
  const snoozeAction = useCallback(async (actionId, until) => {
    setIsUpdating(true);
    try {
      await snoozeActionService(actionId, until);
      await loadPlan();
    } catch (err) {
      console.error('❌ Snooze Action Error:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadPlan]);

  /**
   * Action starten
   */
  const startAction = useCallback(async (actionId) => {
    setIsUpdating(true);
    try {
      await startActionService(actionId);
      await loadPlan();
    } catch (err) {
      console.error('❌ Start Action Error:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [loadPlan]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Alle Actions
   */
  const actions = useMemo(() => plan?.actions ?? [], [plan]);

  /**
   * Gruppierte Actions
   */
  const groupedActions = useMemo(() => groupActionsByStatus(actions), [actions]);

  /**
   * Pending Actions (offen + in Bearbeitung)
   */
  const pendingActions = useMemo(
    () => [...groupedActions.pending, ...groupedActions.in_progress],
    [groupedActions]
  );

  /**
   * Erledigte Actions
   */
  const completedActions = useMemo(
    () => groupedActions.done,
    [groupedActions]
  );

  /**
   * Übersprungene Actions
   */
  const skippedActions = useMemo(
    () => groupedActions.skipped,
    [groupedActions]
  );

  /**
   * Verschobene Actions
   */
  const snoozedActions = useMemo(
    () => groupedActions.snoozed,
    [groupedActions]
  );

  /**
   * Fortschritt in Prozent
   */
  const progress = useMemo(
    () => getProgressPercentage(plan),
    [plan]
  );

  /**
   * Anzahl offener Actions
   */
  const actionsRemaining = useMemo(
    () => pendingActions.length,
    [pendingActions]
  );

  /**
   * Ist konfiguriert?
   */
  const isConfigured = useMemo(
    () => config !== null && config.target_deals_per_period !== null,
    [config]
  );

  /**
   * Plan-Status
   */
  const planState = useMemo(
    () => plan?.state ?? 'NOT_CONFIGURED',
    [plan]
  );

  /**
   * Ist Plan abgeschlossen?
   */
  const isCompleted = useMemo(
    () => planState === 'COMPLETED' || progress >= 80,
    [planState, progress]
  );

  /**
   * Gesamter Loading-Status
   */
  const isLoading = isLoadingConfig || isLoadingPlan || isGenerating;

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Config
    config,
    isConfigured,
    saveConfig,
    
    // Plan
    plan,
    planState,
    isCompleted,
    
    // Actions
    actions,
    groupedActions,
    pendingActions,
    completedActions,
    skippedActions,
    snoozedActions,
    
    // Stats
    progress,
    actionsRemaining,
    stats,
    conversionRates,
    
    // Action Handlers
    generatePlan,
    completeAction,
    skipAction,
    snoozeAction,
    startAction,
    
    // Loading States
    isLoading,
    isLoadingConfig,
    isLoadingPlan,
    isGenerating,
    isUpdating,
    
    // Error
    error,
    
    // Utils
    refetch,
    loadConfig,
    loadPlan,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useDailyFlowConfig
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook nur für Config-Management
 * 
 * @example
 * const { config, saveConfig, isLoading } = useDailyFlowConfig();
 */
export function useDailyFlowConfig() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDailyFlowConfig();
      setConfig(data);
      return data;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (newConfig) => {
    setIsSaving(true);
    setError(null);
    try {
      const data = await saveDailyFlowConfig(newConfig);
      setConfig(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    config,
    isConfigured: config !== null && config.target_deals_per_period !== null,
    isLoading,
    isSaving,
    error,
    saveConfig: save,
    refresh: load,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: useDailyActions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für Actions eines Plans
 * 
 * @param {string} planId 
 * @example
 * const { 
 *   actions, 
 *   pendingActions, 
 *   complete, 
 *   skip 
 * } = useDailyActions(planId);
 */
export function useDailyActions(planId) {
  const { 
    actions, 
    pendingActions, 
    completedActions,
    completeAction,
    skipAction,
    snoozeAction,
    startAction,
    isUpdating,
  } = useDailyFlow({ autoGenerate: false });

  return {
    actions,
    pendingActions,
    completedActions,
    complete: completeAction,
    skip: skipAction,
    snooze: snoozeAction,
    start: startAction,
    isUpdating,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default useDailyFlow;

