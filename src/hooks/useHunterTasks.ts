import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Lead, LeadTaskStatus, LeadTaskWithLead } from "@/types/leadTasks";

type HunterTaskCompletionStatus = Extract<LeadTaskStatus, "done" | "skipped">;

/**
 * Raw row shape returned by Supabase when joining lead_tasks with leads.
 * The nested relation is named "leads" (table name, singular foreign key).
 */
type LeadTaskRow = {
  id: string;
  lead_id?: string | null;
  task_type: string;
  status: LeadTaskStatus;
  due_at: string | null;
  note: string | null;
  leads: Lead | null;
};

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
const mapRowsToTasks = (data: LeadTaskRow[] | null): LeadTaskWithLead[] => {
  if (!data) return [];

  return data
    .map((entry) => ({
      id: entry.id,
      lead_id: entry.lead_id,
      task_type: entry.task_type,
      status: entry.status,
      due_at: entry.due_at,
      note: entry.note ?? null,
      lead: entry.leads ?? null,
    }))
    .sort(sortByDueDate);
};

/**
 * Fetches all open hunter tasks from Supabase, including the related lead data.
 * @throws Error with descriptive message on failure
 */
const fetchOpenHunterTasks = async (): Promise<LeadTaskWithLead[]> => {
  const { data, error } = await supabaseClient
    .from("lead_tasks")
    .select("id, lead_id, task_type, status, due_at, note, leads(*)")
    .eq("task_type", "hunter")
    .eq("status", "open")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message ?? "Hunter-Aufgaben konnten nicht geladen werden.");
  }

  // Supabase returns unknown shape, cast via unknown for type safety
  return mapRowsToTasks(data as unknown as LeadTaskRow[] | null);
};

/**
 * Custom hook to manage Hunter tasks from the lead_tasks table.
 *
 * Provides:
 * - tasks: Array of open hunter tasks with embedded lead data
 * - loading: Boolean loading state
 * - error: Error message string or null
 * - refetch: Function to reload tasks
 * - markAs: Function to update task status to 'done' or 'skipped'
 */
export const useHunterTasks = () => {
  const [tasks, setTasks] = useState<LeadTaskWithLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refetch all open hunter tasks from the database.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextTasks = await fetchOpenHunterTasks();
      setTasks(nextTasks);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Hunter-Aufgaben konnten nicht geladen werden.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  /**
   * Mark a task as 'done' or 'skipped'.
   * Uses optimistic UI update with rollback on failure.
   * @throws Error with descriptive message on failure
   */
  const markAs = useCallback(
    async (taskId: string, nextStatus: HunterTaskCompletionStatus) => {
      setError(null);

      // Optimistic update: store previous state for potential rollback
      let previousTasks: LeadTaskWithLead[] = [];
      let removed = false;

      setTasks((prev) => {
        previousTasks = prev;
        removed = prev.some((task) => task.id === taskId);
        return removed ? prev.filter((task) => task.id !== taskId) : prev;
      });

      if (!removed) {
        const message = "Aufgabe konnte nicht gefunden werden.";
        setError(message);
        throw new Error(message);
      }

      try {
        const { error: updateError } = await supabaseClient
          .from("lead_tasks")
          .update({ status: nextStatus })
          .eq("id", taskId);

        if (updateError) {
          throw new Error(updateError.message ?? "Aufgabe konnte nicht aktualisiert werden.");
        }
      } catch (err) {
        // Rollback on failure
        setTasks(previousTasks);
        const message =
          err instanceof Error ? err.message : "Aufgabe konnte nicht aktualisiert werden.";
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
