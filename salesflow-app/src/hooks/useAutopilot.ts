/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useAutopilot Hook                                                         ║
 * ║  React Hook für Autopilot Settings, Drafts & Stats                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  autopilotApi, 
  AutopilotSettings,
  AutopilotDraft,
  ActionLog,
  MorningBriefing,
  EveningSummary,
  AutopilotStats,
} from '../api/autopilot';

export interface UseAutopilotReturn {
  // State
  settings: AutopilotSettings | null;
  drafts: AutopilotDraft[];
  pendingCount: number;
  actions: ActionLog[];
  stats: AutopilotStats | null;
  morningBriefing: MorningBriefing | null;
  eveningSummary: EveningSummary | null;
  loading: boolean;
  error: string | null;
  
  // Settings Actions
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AutopilotSettings>) => Promise<void>;
  toggleAutopilot: (enabled: boolean) => Promise<void>;
  
  // Draft Actions
  loadDrafts: (status?: 'pending' | 'approved' | 'rejected') => Promise<void>;
  approveDraft: (draftId: string, editedContent?: string) => Promise<AutopilotDraft>;
  rejectDraft: (draftId: string) => Promise<void>;
  
  // Stats & Logs
  loadStats: (period?: 'today' | 'week' | 'month') => Promise<void>;
  loadActionLogs: (days?: number) => Promise<void>;
  
  // Briefings
  loadMorningBriefing: () => Promise<void>;
  loadEveningSummary: () => Promise<void>;
}

export function useAutopilot(): UseAutopilotReturn {
  const [settings, setSettings] = useState<AutopilotSettings | null>(null);
  const [drafts, setDrafts] = useState<AutopilotDraft[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [stats, setStats] = useState<AutopilotStats | null>(null);
  const [morningBriefing, setMorningBriefing] = useState<MorningBriefing | null>(null);
  const [eveningSummary, setEveningSummary] = useState<EveningSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Settings
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await autopilotApi.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update Settings
  const updateSettings = useCallback(async (newSettings: Partial<AutopilotSettings>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await autopilotApi.updateSettings(newSettings);
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle Autopilot
  const toggleAutopilot = useCallback(async (enabled: boolean) => {
    try {
      const data = await autopilotApi.toggleAutopilot(enabled);
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Umschalten');
      throw err;
    }
  }, []);

  // Load Drafts
  const loadDrafts = useCallback(async (status?: 'pending' | 'approved' | 'rejected') => {
    setLoading(true);
    setError(null);
    try {
      const data = await autopilotApi.getDrafts({ status });
      setDrafts(data.drafts);
      setPendingCount(data.pending_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve Draft
  const approveDraft = useCallback(async (draftId: string, editedContent?: string) => {
    try {
      const approved = await autopilotApi.approveDraft(draftId, editedContent);
      setDrafts(prev => prev.map(d => d.id === draftId ? approved : d));
      setPendingCount(prev => Math.max(0, prev - 1));
      return approved;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Genehmigen');
      throw err;
    }
  }, []);

  // Reject Draft
  const rejectDraft = useCallback(async (draftId: string) => {
    try {
      await autopilotApi.rejectDraft(draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Ablehnen');
      throw err;
    }
  }, []);

  // Load Stats
  const loadStats = useCallback(async (period: 'today' | 'week' | 'month' = 'week') => {
    setLoading(true);
    setError(null);
    try {
      const data = await autopilotApi.getStats(period);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Action Logs
  const loadActionLogs = useCallback(async (days: number = 7) => {
    setLoading(true);
    setError(null);
    try {
      const data = await autopilotApi.getActionLogs({ days });
      setActions(data.actions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Morning Briefing
  const loadMorningBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const data = await autopilotApi.getMorningBriefing();
      setMorningBriefing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Evening Summary
  const loadEveningSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await autopilotApi.getEveningSummary();
      setEveningSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    drafts,
    pendingCount,
    actions,
    stats,
    morningBriefing,
    eveningSummary,
    loading,
    error,
    loadSettings,
    updateSettings,
    toggleAutopilot,
    loadDrafts,
    approveDraft,
    rejectDraft,
    loadStats,
    loadActionLogs,
    loadMorningBriefing,
    loadEveningSummary,
  };
}

export default useAutopilot;

