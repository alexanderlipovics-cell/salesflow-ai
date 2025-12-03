/**
 * useFollowUpTasks Hook
 * 
 * Custom Hook zum Laden und Verwalten von Follow-up Tasks.
 * Analog zum useHunterTasks Hook aufgebaut.
 */

import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { scheduleNextLoopCheckinTask } from "@/services/followUpService";
import type { Lead, LeadTaskStatus, LeadTaskWithLead } from "@/types/leadTasks";

type FollowUpTaskCompletionStatus = Extract<LeadTaskStatus, "done" | "skipped">;

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * Raw row shape returned by Supabase when joining lead_tasks with leads.
 */
type FollowUpTaskRow = {
  id: string;
  lead_id?: string | null;
  task_type: string;
  status: LeadTaskStatus;
  template_key: string | null;
  due_at: string | null;
  note: string | null;
  leads: Lead | null;
};

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
 * Maps raw Supabase rows to the application's LeadTaskWithLead shape.
 */
const mapRowsToTasks = (data: FollowUpTaskRow[] | null): LeadTaskWithLead[] => {
  if (!data) return [];

  return data
    .map((entry) => ({
      id: entry.id,
      lead_id: entry.lead_id,
      task_type: entry.task_type,
      status: entry.status,
      template_key: entry.template_key,
      due_at: entry.due_at,
      note: entry.note ?? null,
      lead: entry.leads ?? null,
    }))
    .sort(sortByDueDate);
};

/**
 * Fetches all open follow-up tasks from Supabase, including the related lead data.
 * @throws Error with descriptive message on failure
 */
const fetchOpenFollowUpTasks = async (): Promise<LeadTaskWithLead[]> => {
  const { data, error } = await supabaseClient
    .from("lead_tasks")
    .select("id, lead_id, task_type, status, template_key, due_at, note, leads(*)")
    .eq("task_type", "follow_up")
    .eq("status", "open")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message ?? "Follow-up Aufgaben konnten nicht geladen werden.");
  }

  // Supabase returns unknown shape, cast via unknown for type safety
  return mapRowsToTasks(data as unknown as FollowUpTaskRow[] | null);
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
export const useFollowUpTasks = () => {
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
      const nextTasks = await fetchOpenFollowUpTasks();
      setTasks(nextTasks);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Follow-up Aufgaben konnten nicht geladen werden.";
      console.error("useFollowUpTasks fetch error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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

      if (!taskToUpdate) {
        const message = "Aufgabe konnte nicht gefunden werden.";
        setError(message);
        throw new Error(message);
      }

      try {
        // Update status in database
        const { error: updateError } = await supabaseClient
          .from("lead_tasks")
          .update({ status: nextStatus })
          .eq("id", taskId);

        if (updateError) {
          throw new Error(updateError.message ?? "Aufgabe konnte nicht aktualisiert werden.");
        }

        // Schedule next loop check-in if this is an rx_loop_checkin task marked as done
        if (
          nextStatus === "done" &&
          taskToUpdate.task_type === "follow_up" &&
          taskToUpdate.template_key === "rx_loop_checkin" &&
          taskToUpdate.lead_id
        ) {
          try {
            await scheduleNextLoopCheckinTask({
              id: taskToUpdate.id,
              lead_id: taskToUpdate.lead_id,
              due_at: taskToUpdate.due_at,
            });
          } catch (scheduleErr) {
            // Nicht die gesamte Operation rückgängig machen, aber Fehler melden
            const scheduleMessage =
              scheduleErr instanceof Error
                ? scheduleErr.message
                : "Loop-Check-in konnte nicht neu geplant werden.";
            console.error("useFollowUpTasks scheduleNextLoopCheckinTask error:", scheduleMessage);
            throw new Error("Loop-Check-in konnte nicht neu geplant werden: " + scheduleMessage);
          }
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

