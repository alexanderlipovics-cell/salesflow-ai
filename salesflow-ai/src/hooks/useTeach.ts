/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  USE TEACH HOOK                                                            ║
 * ║  Hauptlogik für Teach-UI Integration                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Dieser Hook kombiniert:
 * - Similarity-Analyse
 * - Quick Change Detection
 * - API-Kommunikation
 * - State Management für TeachSheet
 */

import { useState, useCallback, useRef } from 'react';

import type { 
  OverrideEvent, 
  OverrideContext, 
  TeachSheetState, 
  CreateRulePayload,
  TeachResponse,
  RuleScope,
  TeachStats,
} from '../types/teach';

import { 
  analyzeSimilarity, 
  detectChangesQuick,
  quickSimilarityCheck,
} from '../services/similarityService';

import * as teachApi from '../api/teach';

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseTeachOptions {
  // Thresholds
  significanceThreshold?: number;   // Default: 0.85
  minCharDiff?: number;             // Default: 10
  
  // Behavior
  autoDetect?: boolean;             // Default: true
  showForMinorChanges?: boolean;    // Default: false
  
  // API
  apiBaseUrl?: string;              // Default: '/api/v1'
  
  // Context
  defaultContext?: Partial<OverrideContext>;
  
  // Callbacks
  onTeachComplete?: (response: TeachResponse) => void;
  onPatternDetected?: (pattern: TeachResponse['patternDetected']) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// HOOK RETURN
// =============================================================================

export interface UseTeachReturn {
  // State
  sheetState: TeachSheetState;
  
  // Actions
  checkForOverride: (original: string, final: string, context?: OverrideContext) => void;
  dismissSheet: () => void;
  submitTeach: (scope: RuleScope, note?: string, tags?: string[]) => Promise<void>;
  
  // Quick Actions
  ignoreOnce: () => void;
  savePersonal: () => Promise<void>;
  saveTeam: () => Promise<void>;
  saveAsTemplate: () => Promise<void>;
  
  // Stats
  stats: {
    totalTeaches: number;
    pendingPatterns: number;
  } | null;
  refreshStats: () => Promise<void>;
  
  // Loading
  isSubmitting: boolean;
  error: string | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useTeach(options: UseTeachOptions = {}): UseTeachReturn {
  const {
    significanceThreshold = 0.85,
    showForMinorChanges = false,
    apiBaseUrl,
    defaultContext = {},
    onTeachComplete,
    onPatternDetected,
    onError,
  } = options;
  
  // State
  const [sheetState, setSheetState] = useState<TeachSheetState>({
    visible: false,
    event: null,
    selectedScope: 'personal',
    isLoading: false,
    showAdvanced: false,
  });
  
  const [stats, setStats] = useState<{ totalTeaches: number; pendingPatterns: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const lastCheckRef = useRef<string | null>(null);
  
  // API Options
  const apiOptions = apiBaseUrl ? { baseUrl: apiBaseUrl } : undefined;
  
  // =============================================================================
  // CHECK FOR OVERRIDE
  // =============================================================================
  
  const checkForOverride = useCallback((
    original: string,
    final: string,
    context: OverrideContext = {}
  ) => {
    // Skip if same as last check
    const checkKey = `${original}|${final}`;
    if (checkKey === lastCheckRef.current) return;
    lastCheckRef.current = checkKey;
    
    // Skip if texts are identical
    if (original.trim() === final.trim()) return;
    
    // Quick client-side check
    if (quickSimilarityCheck(original, final)) return;
    
    // Analyze similarity
    const similarity = analyzeSimilarity(original, final, {
      significanceThreshold,
    });
    
    // Skip if not significant (unless showForMinorChanges)
    if (!similarity.isSignificant && !showForMinorChanges) return;
    
    // Detect changes
    const changes = detectChangesQuick(original, final);
    
    // Create override event
    const event: OverrideEvent = {
      originalText: original,
      finalText: final,
      similarityScore: similarity.combined,
      isSignificant: similarity.isSignificant,
      detectedChanges: {
        changes: changes.changes,
        pattern: changes.pattern,
        significance: similarity.significance,
      },
      context: { ...defaultContext, ...context },
      timestamp: new Date(),
    };
    
    // Show sheet
    setSheetState({
      visible: true,
      event,
      selectedScope: 'personal',
      isLoading: false,
      showAdvanced: false,
    });
  }, [significanceThreshold, showForMinorChanges, defaultContext]);
  
  // =============================================================================
  // SUBMIT TEACH
  // =============================================================================
  
  const submitTeach = useCallback(async (
    scope: RuleScope,
    note?: string,
    tags?: string[]
  ) => {
    if (!sheetState.event) return;
    
    setIsSubmitting(true);
    setError(null);
    setSheetState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const payload: CreateRulePayload = {
        scope,
        override: {
          originalText: sheetState.event.originalText,
          finalText: sheetState.event.finalText,
          similarityScore: sheetState.event.similarityScore,
          detectedChanges: sheetState.event.detectedChanges.changes,
          context: sheetState.event.context,
        },
        note,
        tags,
      };
      
      const response = await teachApi.submitTeach(payload, apiOptions);
      
      // Callback
      onTeachComplete?.(response);
      
      // Pattern notification
      if (response.patternDetected) {
        onPatternDetected?.(response.patternDetected);
      }
      
      // Close sheet
      setSheetState(prev => ({ ...prev, visible: false, isLoading: false }));
      
      // Refresh stats
      refreshStats();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      setSheetState(prev => ({ ...prev, isLoading: false }));
    } finally {
      setIsSubmitting(false);
    }
  }, [sheetState.event, apiOptions, onTeachComplete, onPatternDetected, onError]);
  
  // =============================================================================
  // QUICK ACTIONS
  // =============================================================================
  
  const dismissSheet = useCallback(() => {
    setSheetState(prev => ({ ...prev, visible: false }));
    setError(null);
  }, []);
  
  const ignoreOnce = useCallback(async () => {
    // Log ignore for analytics (but don't create rule)
    if (sheetState.event) {
      try {
        await teachApi.logIgnore(sheetState.event, apiOptions);
      } catch (err) {
        console.warn('Failed to log ignore:', err);
      }
    }
    dismissSheet();
  }, [sheetState.event, apiOptions, dismissSheet]);
  
  const savePersonal = useCallback(async () => {
    await submitTeach('personal');
  }, [submitTeach]);
  
  const saveTeam = useCallback(async () => {
    await submitTeach('team');
  }, [submitTeach]);
  
  const saveAsTemplate = useCallback(async () => {
    if (!sheetState.event) return;
    
    setIsSubmitting(true);
    setError(null);
    setSheetState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await teachApi.createTemplate({
        text: sheetState.event.finalText,
        context: sheetState.event.context,
        source: 'teach_override',
      }, apiOptions);
      
      setSheetState(prev => ({ ...prev, visible: false, isLoading: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      setSheetState(prev => ({ ...prev, isLoading: false }));
    } finally {
      setIsSubmitting(false);
    }
  }, [sheetState.event, apiOptions, onError]);
  
  // =============================================================================
  // STATS
  // =============================================================================
  
  const refreshStats = useCallback(async () => {
    try {
      const fetchedStats = await teachApi.getTeachStats(apiOptions);
      setStats({
        totalTeaches: fetchedStats.totalTeachActions,
        pendingPatterns: fetchedStats.pendingPatterns,
      });
    } catch (err) {
      console.warn('Failed to fetch teach stats:', err);
    }
  }, [apiOptions]);
  
  // =============================================================================
  // RETURN
  // =============================================================================
  
  return {
    sheetState,
    checkForOverride,
    dismissSheet,
    submitTeach,
    ignoreOnce,
    savePersonal,
    saveTeam,
    saveAsTemplate,
    stats,
    refreshStats,
    isSubmitting,
    error,
  };
}

// =============================================================================
// CONVENIENCE HOOK: useSendWithTeach
// =============================================================================

export interface UseSendWithTeachOptions extends UseTeachOptions {
  onSend: (text: string) => Promise<void>;
}

/**
 * Combined hook for sending messages with teach detection
 */
export function useSendWithTeach(options: UseSendWithTeachOptions) {
  const { onSend, ...teachOptions } = options;
  const teach = useTeach(teachOptions);
  
  const [lastSuggestion, setLastSuggestion] = useState<string | null>(null);
  
  const sendMessage = useCallback(async (
    text: string,
    context?: OverrideContext
  ) => {
    // Send message first (non-blocking)
    const sendPromise = onSend(text);
    
    // Check for override (if we had a suggestion)
    if (lastSuggestion && lastSuggestion !== text) {
      teach.checkForOverride(lastSuggestion, text, context);
    }
    
    // Clear suggestion
    setLastSuggestion(null);
    
    // Await send
    await sendPromise;
  }, [lastSuggestion, teach, onSend]);
  
  const setSuggestion = useCallback((suggestion: string) => {
    setLastSuggestion(suggestion);
  }, []);
  
  const clearSuggestion = useCallback(() => {
    setLastSuggestion(null);
  }, []);
  
  return {
    ...teach,
    sendMessage,
    setSuggestion,
    clearSuggestion,
    hasSuggestion: lastSuggestion !== null,
    currentSuggestion: lastSuggestion,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useTeach;

