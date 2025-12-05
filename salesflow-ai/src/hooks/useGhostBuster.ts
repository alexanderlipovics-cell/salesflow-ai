/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useGhostBuster Hook                                                       ║
 * ║  React Hook für Ghost Re-Engagement                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  ghostBusterApi, 
  Ghost, 
  GhostDetail, 
  GhostReport,
  GhostType,
  ReEngagementStrategy,
  ReEngageResponse,
} from '../api/chiefV3';

export interface UseGhostBusterReturn {
  // State
  ghosts: Ghost[];
  selectedGhost: GhostDetail | null;
  report: GhostReport | null;
  loading: boolean;
  error: string | null;
  
  // Generated message
  reEngageMessage: ReEngageResponse | null;
  
  // Computed
  softGhosts: Ghost[];
  hardGhosts: Ghost[];
  deepGhosts: Ghost[];
  totalGhosts: number;
  
  // Actions
  loadGhosts: (options?: { ghostType?: GhostType; platform?: string }) => Promise<void>;
  loadGhostDetail: (ghostId: string) => Promise<void>;
  loadReport: () => Promise<void>;
  generateMessage: (ghostId: string, strategy?: ReEngagementStrategy, context?: Record<string, string>) => Promise<ReEngageResponse>;
  markSent: (ghostId: string, message: string) => Promise<void>;
  skipGhost: (ghostId: string, reason: string) => Promise<void>;
  breakup: (ghostId: string) => Promise<void>;
  snooze: (ghostId: string, days: number) => Promise<void>;
  clearSelection: () => void;
}

export function useGhostBuster(): UseGhostBusterReturn {
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [selectedGhost, setSelectedGhost] = useState<GhostDetail | null>(null);
  const [report, setReport] = useState<GhostReport | null>(null);
  const [reEngageMessage, setReEngageMessage] = useState<ReEngageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Ghosts
  const loadGhosts = useCallback(async (options?: { ghostType?: GhostType; platform?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ghostBusterApi.listGhosts(options);
      setGhosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Ghost Detail
  const loadGhostDetail = useCallback(async (ghostId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await ghostBusterApi.getGhostDetail(ghostId);
      setSelectedGhost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Report
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ghostBusterApi.getReport();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Message
  const generateMessage = useCallback(async (
    ghostId: string, 
    strategy?: ReEngagementStrategy,
    context?: Record<string, string>
  ) => {
    setLoading(true);
    try {
      const data = await ghostBusterApi.generateReEngageMessage(ghostId, strategy, context);
      setReEngageMessage(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark as Sent
  const markSent = useCallback(async (ghostId: string, message: string) => {
    try {
      await ghostBusterApi.performAction(ghostId, 'send', { messageSent: message });
      // Remove from list
      setGhosts(prev => prev.filter(g => g.id !== ghostId));
      setSelectedGhost(null);
      setReEngageMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Skip Ghost
  const skipGhost = useCallback(async (ghostId: string, reason: string) => {
    try {
      await ghostBusterApi.performAction(ghostId, 'skip', { skipReason: reason });
      setGhosts(prev => prev.filter(g => g.id !== ghostId));
      setSelectedGhost(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Breakup
  const breakup = useCallback(async (ghostId: string) => {
    try {
      await ghostBusterApi.performAction(ghostId, 'breakup');
      setGhosts(prev => prev.filter(g => g.id !== ghostId));
      setSelectedGhost(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Snooze
  const snooze = useCallback(async (ghostId: string, days: number) => {
    try {
      await ghostBusterApi.performAction(ghostId, 'snooze', { snoozeDays: days });
      setGhosts(prev => prev.filter(g => g.id !== ghostId));
      setSelectedGhost(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, []);

  // Clear Selection
  const clearSelection = useCallback(() => {
    setSelectedGhost(null);
    setReEngageMessage(null);
  }, []);

  // Initial Load
  useEffect(() => {
    loadGhosts();
  }, [loadGhosts]);

  // Computed
  const softGhosts = ghosts.filter(g => g.ghost_type === 'soft');
  const hardGhosts = ghosts.filter(g => g.ghost_type === 'hard');
  const deepGhosts = ghosts.filter(g => g.ghost_type === 'deep');
  const totalGhosts = ghosts.length;

  return {
    ghosts,
    selectedGhost,
    report,
    reEngageMessage,
    loading,
    error,
    softGhosts,
    hardGhosts,
    deepGhosts,
    totalGhosts,
    loadGhosts,
    loadGhostDetail,
    loadReport,
    generateMessage,
    markSent,
    skipGhost,
    breakup,
    snooze,
    clearSelection,
  };
}

