/**
 * useFollowUpTasks Hook
 * 
 * Custom Hook zum Laden und Verwalten von Follow-up Tasks.
 * Analog zum useHunterTasks Hook aufgebaut.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getFollowupSuggestions,
  markFollowupSuggestion,
  type FollowupSuggestionStatus,
} from "../services/followUpService";
import type { Lead, LeadTaskStatus, LeadTaskWithLead } from "../types/leadTasks";

type FollowUpTaskCompletionStatus = Extract<LeadTaskStatus, "done" | "skipped">;

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * Raw row shape returned by Supabase when joining lead_tasks with leads.
 */
type FollowUpTaskRow = never;

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Sort tasks by due_at ascending. Tasks without due_at are pushed to the end.
 */
const sortByDueDate = (a: LeadTaskWithLead, b: LeadTaskWithLead): number => {
  if (!a.due_at && !b.due_at) return 0;
  if (!a.due_at) return 1;
  if (!b.due_at) return -1;
  return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
};

/**
 * Fetches follow-up suggestions from backend API and maps them
 * to the existing LeadTaskWithLead shape used in the UI.
 */
const fetchOpenFollowUpTasks = async (timeFilter: 'week' | 'month' | 'all' = 'week'): Promise<LeadTaskWithLead[]> => {
  const suggestions = await getFollowupSuggestions(timeFilter);

  return (suggestions || [])
    .map((sug) => {
      const statusMap: Record<FollowupSuggestionStatus, LeadTaskStatus> = {
        pending: "open",
        sent: "done",
        skipped: "skipped",
        snoozed: "open",
      };

      return {
        id: sug.id,
        lead_id: sug.lead_id,
        task_type: "follow_up",
        status: statusMap[sug.status] ?? "open",
        template_key: sug.template_key,
        due_at: sug.due_at,
        note: sug.suggested_message ?? null,
        lead: (sug as any).leads ?? null,
      } satisfies LeadTaskWithLead;
    })
    .sort(sortByDueDate);
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

/**
 * Custom hook to manage Follow-up tasks from the lead_tasks table.
 *
 * Provides:
 * - tasks: Array of open follow-up tasks with embedded lead data
 * - loading: Boolean loading state
 * - error: Error message string or null
 * - refetch: Function to reload tasks
 * - markAs: Function to update task status to 'done' or 'skipped'
 */
export const useFollowUpTasks = (timeFilter: 'week' | 'month' | 'all' = 'week') => {
  const [tasks, setTasks] = useState<LeadTaskWithLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refetch all open follow-up tasks from the database.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextTasks = await fetchOpenFollowUpTasks(timeFilter);
      setTasks(nextTasks);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Follow-up Aufgaben konnten nicht geladen werden.";
      console.error("useFollowUpTasks fetch error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  // Initial fetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * Mark a task as 'done' or 'skipped'.
   * Uses optimistic UI update with rollback on failure.
   * If marking an rx_loop_checkin task as 'done', schedules the next loop check-in.
   * @throws Error with descriptive message on failure
   */
  const markAs = useCallback(
    async (taskId: string, nextStatus: FollowUpTaskCompletionStatus) => {
      setError(null);

      // Optimistic update: store previous state for potential rollback
      let previousTasks: LeadTaskWithLead[] = [];
      let taskToUpdate: LeadTaskWithLead | undefined;

      setTasks((prev) => {
        previousTasks = prev;
        taskToUpdate = prev.find((task) => task.id === taskId);
        return taskToUpdate ? prev.filter((task) => task.id !== taskId) : prev;
      });

      try {
        // Update status via backend suggestion action
        const action = nextStatus === "done" ? "send" : "skip";
        await markFollowupSuggestion(taskId, action);
        // Falls Task nicht lokal gefunden wurde, nach erfolgreichem Call neu laden
        if (!taskToUpdate) {
          await refetch();
        }
      } catch (err) {
        // Rollback on failure
        setTasks(previousTasks);
        const message =
          err instanceof Error ? err.message : "Aufgabe konnte nicht aktualisiert werden.";
        console.error("useFollowUpTasks markAs error:", message);
        setError(message);
        throw new Error(message);
      }
    },
    []
  );

  return {
    tasks,
    loading,
    error,
    refetch,
    markAs,
  };
};

