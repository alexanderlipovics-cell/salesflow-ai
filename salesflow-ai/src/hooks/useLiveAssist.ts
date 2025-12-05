/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useLiveAssist Hook                                                        ║
 * ║  React Hook für Live Sales Assistant Mode                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 *   - Session Management (Start, End)
 *   - Automatic Trigger Detection ("Bin mit Kunde")
 *   - Query Processing
 *   - Voice Integration Ready
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import * as liveAssistApi from '../api/liveAssist';
import type {
  LiveQueryResponse,
  StartSessionResponse,
  SessionStatsResponse,
  UseLiveAssistOptions,
  UseLiveAssistReturn,
  QuickFactItem,
  ProductItem,
  QueryType,
  SessionOutcome,
} from '../types/liveAssist';

// =============================================================================
// TRIGGER DETECTION
// =============================================================================

const ACTIVATION_TRIGGERS = [
  'bin mit kunde',
  'kundengespräch',
  'live hilfe',
  'assist mode',
  'meeting läuft',
  'brauche fakten',
  'quick help',
  'hilf mir',
  'unterstütz mich',
  'bin im gespräch',
  'live assist',
  'verkaufsgespräch',
];

const DEACTIVATION_TRIGGERS = [
  'gespräch vorbei',
  'kunde weg',
  'assist aus',
  'normal mode',
  'meeting fertig',
  'fertig mit kunde',
  'gespräch beendet',
  'live assist aus',
  'danke chief',
];

/**
 * Prüft ob der Text einen Aktivierungs-Trigger enthält.
 */
export function detectActivation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return ACTIVATION_TRIGGERS.some(trigger => lower.includes(trigger));
}

/**
 * Prüft ob der Text einen Deaktivierungs-Trigger enthält.
 */
export function detectDeactivation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return DEACTIVATION_TRIGGERS.some(trigger => lower.includes(trigger));
}

// =============================================================================
// HOOK
// =============================================================================

export function useLiveAssist(options: UseLiveAssistOptions = {}): UseLiveAssistReturn {
  const { 
    companyId, 
    vertical, 
    onActivate, 
    onDeactivate, 
    onResponse,
    onError,
  } = options;
  
  // State
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<LiveQueryResponse | null>(null);
  const [keyFacts, setKeyFacts] = useState<QuickFactItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [companyName, setCompanyName] = useState<string | null>(null);
  
  // WebSocket ref for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  
  // =============================================================================
  // ACTIONS
  // =============================================================================
  
  /**
   * Aktiviert Live Assist Mode.
   */
  const activate = useCallback(async (opts?: { 
    companyId?: string; 
    leadId?: string;
  }) => {
    if (isActive) return;
    
    setIsLoading(true);
    
    try {
      const response = await liveAssistApi.startSession({
        company_id: opts?.companyId || companyId,
        vertical,
        lead_id: opts?.leadId,
      });
      
      setSessionId(response.session_id);
      setKeyFacts(response.key_facts || []);
      setProducts(response.available_products || []);
      setCompanyName(response.company_name || null);
      setIsActive(true);
      
      onActivate?.();
      
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unbekannter Fehler');
      console.error('Failed to start Live Assist:', error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isActive, companyId, vertical, onActivate, onError]);
  
  /**
   * Deaktiviert Live Assist Mode.
   */
  const deactivate = useCallback(async (outcome?: SessionOutcome) => {
    if (!isActive || !sessionId) return;
    
    setIsLoading(true);
    
    try {
      await liveAssistApi.endSession({
        session_id: sessionId,
        outcome,
      });
      
      setIsActive(false);
      setSessionId(null);
      setLastResponse(null);
      setKeyFacts([]);
      setProducts([]);
      setCompanyName(null);
      
      // Close WebSocket if open
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      onDeactivate?.();
      
    } catch (e) {
      console.error('Failed to end Live Assist:', e);
      // Still deactivate locally
      setIsActive(false);
      setSessionId(null);
    } finally {
      setIsLoading(false);
    }
  }, [isActive, sessionId, onDeactivate]);
  
  /**
   * Sendet eine Query und wartet auf Antwort.
   */
  const query = useCallback(async (
    text: string,
    type: QueryType = 'text',
  ): Promise<LiveQueryResponse> => {
    if (!sessionId) {
      throw new Error('Keine aktive Session');
    }
    
    setIsLoading(true);
    
    try {
      const response = await liveAssistApi.sendQuery({
        session_id: sessionId,
        query_text: text,
        query_type: type,
      });
      
      setLastResponse(response);
      onResponse?.(response);
      
      return response;
      
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unbekannter Fehler');
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, onResponse, onError]);
  
  /**
   * Holt Session-Statistiken.
   */
  const getStats = useCallback(async (): Promise<SessionStatsResponse | null> => {
    if (!sessionId) return null;
    
    try {
      return await liveAssistApi.getSessionStats(sessionId);
    } catch (e) {
      console.error('Failed to get session stats:', e);
      return null;
    }
  }, [sessionId]);
  
  // =============================================================================
  // AUTO-DETECTION
  // =============================================================================
  
  /**
   * Prüft Nachricht auf Trigger und verarbeitet entsprechend.
   * 
   * Returns:
   * - LiveQueryResponse wenn Query verarbeitet wurde
   * - null wenn Aktivierung/Deaktivierung oder keine Aktion
   */
  const checkAndProcessMessage = useCallback(async (
    text: string,
  ): Promise<LiveQueryResponse | null> => {
    // Check for deactivation first
    if (isActive && detectDeactivation(text)) {
      await deactivate();
      return null;
    }
    
    // Check for activation
    if (!isActive && detectActivation(text)) {
      await activate();
      // Don't process the activation message itself
      return null;
    }
    
    // If active, process as query
    if (isActive && sessionId) {
      return query(text);
    }
    
    return null;
  }, [isActive, sessionId, activate, deactivate, query]);
  
  // =============================================================================
  // CLEANUP
  // =============================================================================
  
  useEffect(() => {
    return () => {
      // Cleanup WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  return {
    // State
    isActive,
    sessionId,
    isLoading,
    lastResponse,
    keyFacts,
    products,
    companyName,
    
    // Actions
    activate,
    deactivate,
    query,
    checkAndProcessMessage,
    getStats,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook für Quick Facts ohne aktive Session.
 */
export function useQuickFacts(options: {
  companyId?: string;
  vertical?: string;
  keyOnly?: boolean;
  enabled?: boolean;
}) {
  const [facts, setFacts] = useState<QuickFactItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { companyId, vertical, keyOnly, enabled = true } = options;
  
  useEffect(() => {
    if (!enabled) return;
    
    const fetchFacts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await liveAssistApi.getQuickFacts({
          companyId,
          vertical,
          keyOnly,
        });
        setFacts(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Fehler beim Laden'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFacts();
  }, [companyId, vertical, keyOnly, enabled]);
  
  return { facts, isLoading, error };
}

/**
 * Hook für Einwand-Antworten ohne aktive Session.
 */
export function useObjectionResponses(options: {
  companyId?: string;
  objectionType?: string;
  enabled?: boolean;
}) {
  const [responses, setResponses] = useState<liveAssistApi.ObjectionResponseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { companyId, objectionType, enabled = true } = options;
  
  useEffect(() => {
    if (!enabled) return;
    
    const fetchResponses = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await liveAssistApi.getObjectionResponses({
          companyId,
          objectionType: objectionType as any,
        });
        setResponses(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Fehler beim Laden'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResponses();
  }, [companyId, objectionType, enabled]);
  
  return { responses, isLoading, error };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useLiveAssist;

