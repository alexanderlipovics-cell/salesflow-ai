/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useDailyFlowApi Hook                                                      ║
 * ║  React Hook für Daily Flow Actions & Status (API-basiert)                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  dailyFlowApi, 
  DailyAction,
  DailyFlowStatus,
  DailyFlowSettings,
  ActionCompletion,
  ActionType,
  ActionStatus,
  Priority,
} from '../api/dailyFlow';

export interface UseDailyFlowApiReturn {
  // State
  status: DailyFlowStatus | null;
  actions: DailyAction[];
  nextAction: DailyAction | null;
  settings: DailyFlowSettings | null;
  loading: boolean;
  error: string | null;
  
  // Computed
  completionPercent: number;
  remainingActions: number;
  streakDays: number;
  
  // Actions
  loadStatus: (date?: string) => Promise<void>;
  loadActions: (options?: { type?: ActionType; status?: ActionStatus }) => Promise<void>;
  loadNextAction: () => Promise<void>;
  createAction: (action: {
    type: ActionType;
    title: string;
    description?: string;
    priority?: Priority;
    estimated_minutes?: number;
    lead_id?: string;
  }) => Promise<DailyAction>;
  completeAction: (actionId: string, notes?: string, outcome?: string) => Promise<ActionCompletion>;
  skipAction: (actionId: string, reason?: string) => Promise<void>;
  snoozeAction: (actionId: string, minutes: number) => Promise<void>;
  
  // Settings
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<DailyFlowSettings>) => Promise<void>;
  
  // Generation
  generateActions: (force?: boolean) => Promise<{ generated: number; actions: DailyAction[] }>;
}

export function useDailyFlowApi(): UseDailyFlowApiReturn {
  const [status, setStatus] = useState<DailyFlowStatus | null>(null);
  const [actions, setActions] = useState<DailyAction[]>([]);
  const [nextAction, setNextAction] = useState<DailyAction | null>(null);
  const [settings, setSettings] = useState<DailyFlowSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Status
  const loadStatus = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dailyFlowApi.getStatus(date);
      setStatus(data);
      setNextAction(data.next_action);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Actions
  const loadActions = useCallback(async (options?: { type?: ActionType; status?: ActionStatus }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dailyFlowApi.getActions(options);
      setActions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Next Action
  const loadNextAction = useCallback(async () => {
    try {
      const data = await dailyFlowApi.getNextAction();
      setNextAction(data);
    } catch (err) {
      console.error('Failed to load next action:', err);
    }
  }, []);

  // Create Action
  const createAction = useCallback(async (action: {
    type: ActionType;
    title: string;
    description?: string;
    priority?: Priority;
    estimated_minutes?: number;
    lead_id?: string;
  }) => {
    const created = await dailyFlowApi.createAction(action);
    setActions(prev => [...prev, created]);
    return created;
  }, []);

  // Complete Action
  const completeAction = useCallback(async (actionId: string, notes?: string, outcome?: string) => {
    const result = await dailyFlowApi.completeAction(actionId, { notes, outcome });
    setActions(prev => prev.map(a => 
      a.id === actionId ? { ...a, status: 'completed' as ActionStatus, completed_at: new Date().toISOString() } : a
    ));
    if (result.next_action_suggested) {
      setNextAction(result.next_action_suggested);
    }
    // Reload status
    loadStatus();
    return result;
  }, [loadStatus]);

  // Skip Action
  const skipAction = useCallback(async (actionId: string, reason?: string) => {
    await dailyFlowApi.skipAction(actionId, reason);
    setActions(prev => prev.map(a => 
      a.id === actionId ? { ...a, status: 'skipped' as ActionStatus } : a
    ));
    loadNextAction();
  }, [loadNextAction]);

  // Snooze Action
  const snoozeAction = useCallback(async (actionId: string, minutes: number) => {
    const updated = await dailyFlowApi.snoozeAction(actionId, minutes);
    setActions(prev => prev.map(a => a.id === actionId ? updated : a));
    loadNextAction();
  }, [loadNextAction]);

  // Load Settings
  const loadSettings = useCallback(async () => {
    try {
      const data = await dailyFlowApi.getSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    }
  }, []);

  // Update Settings
  const updateSettings = useCallback(async (newSettings: Partial<DailyFlowSettings>) => {
    const updated = await dailyFlowApi.updateSettings(newSettings);
    setSettings(updated);
  }, []);

  // Generate Actions
  const generateActions = useCallback(async (force?: boolean) => {
    setLoading(true);
    try {
      const result = await dailyFlowApi.generateActions({ force });
      setActions(prev => [...prev, ...result.actions]);
      loadStatus();
      return result;
    } finally {
      setLoading(false);
    }
  }, [loadStatus]);

  // Initial Load
  useEffect(() => {
    loadStatus();
    loadActions();
  }, [loadStatus, loadActions]);

  // Computed
  const completionPercent = status?.completion_percent ?? 0;
  const remainingActions = (status?.total_actions ?? 0) - (status?.completed_actions ?? 0);
  const streakDays = status?.streak_days ?? 0;

  return {
    status,
    actions,
    nextAction,
    settings,
    loading,
    error,
    completionPercent,
    remainingActions,
    streakDays,
    loadStatus,
    loadActions,
    loadNextAction,
    createAction,
    completeAction,
    skipAction,
    snoozeAction,
    loadSettings,
    updateSettings,
    generateActions,
  };
}

export default useDailyFlowApi;

