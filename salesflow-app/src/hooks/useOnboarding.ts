/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  useOnboarding Hook                                                        ║
 * ║  React Hook für Onboarding Flow                                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  onboardingApi, 
  OnboardingProgress, 
  OnboardingTask,
} from '../api/chiefV3';

export interface UseOnboardingReturn {
  // State
  progress: OnboardingProgress | null;
  tasks: OnboardingTask[];
  loading: boolean;
  error: string | null;
  
  // Computed
  isNewUser: boolean;
  isOverwhelmed: boolean;
  completionPercent: number;
  currentStage: string;
  
  // Actions
  loadProgress: () => Promise<void>;
  loadTasks: (stage?: string) => Promise<void>;
  completeTask: (taskId: string, notes?: string) => Promise<{
    success: boolean;
    celebration?: string;
  }>;
  getNextAction: () => Promise<{
    action: string;
    description: string;
    estimated_minutes: number;
    cta: string;
  }>;
  trackMilestone: (type: 'first_contact' | 'first_reply' | 'first_sale' | 'first_objection', leadId?: string) => Promise<{
    success: boolean;
    celebration: string;
  }>;
}

export function useOnboarding(): UseOnboardingReturn {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Progress
  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onboardingApi.getProgress();
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Tasks
  const loadTasks = useCallback(async (stage?: string) => {
    setLoading(true);
    try {
      const data = await onboardingApi.getTasks(stage);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Complete Task
  const completeTask = useCallback(async (taskId: string, notes?: string) => {
    try {
      const result = await onboardingApi.completeTask(taskId, notes);
      
      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, is_completed: true, celebration_message: result.celebration } : t
      ));
      
      // Reload progress
      await loadProgress();
      
      return {
        success: result.success,
        celebration: result.celebration || undefined,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
      return { success: false };
    }
  }, [loadProgress]);

  // Get Next Action
  const getNextAction = useCallback(async () => {
    return onboardingApi.getNextAction();
  }, []);

  // Track Milestone
  const trackMilestone = useCallback(async (
    type: 'first_contact' | 'first_reply' | 'first_sale' | 'first_objection',
    leadId?: string
  ) => {
    try {
      const result = await onboardingApi.trackMilestone(type, leadId);
      
      // Reload progress
      await loadProgress();
      
      return {
        success: result.success,
        celebration: result.celebration,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
      return { success: false, celebration: '' };
    }
  }, [loadProgress]);

  // Initial Load
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Computed values
  const isNewUser = progress ? progress.days_since_start <= 7 : true;
  const isOverwhelmed = progress?.is_overwhelmed || false;
  const completionPercent = progress?.completion_percent || 0;
  const currentStage = progress?.current_stage || 'day_1';

  return {
    progress,
    tasks,
    loading,
    error,
    isNewUser,
    isOverwhelmed,
    completionPercent,
    currentStage,
    loadProgress,
    loadTasks,
    completeTask,
    getNextAction,
    trackMilestone,
  };
}

