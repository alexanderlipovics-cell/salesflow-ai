/**
 * useTodayLeadTasks Hook
 *
 * Custom Hook zum Laden von heute fälligen und überfälligen Tasks
 * (Follow-ups & Hunter) für das Tages-Cockpit im Dashboard.
 */

import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Lead, LeadTaskStatus, LeadTaskWithLead } from "@/types/leadTasks";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/**
 * Raw row shape returned by Supabase when joining lead_tasks with leads.
 */
type TodayTaskRow = {
  id: string;
  lead_id?: string | null;
  task_type: string;
  status: LeadTaskStatus;
  template_key: string | null;
  due_at: string | null;
  note: string | null;
  leads: Lead | null;
};

/**
 * Return type of the useTodayLeadTasks hook.
 */
export type TodayLeadTasksResult = {
  loading: boolean;
  error: string | null;
  todayFollowUps: LeadTaskWithLead[];
  todayHunters: LeadTaskWithLead[];
  overdueFollowUpsCount: number;
  overdueHuntersCount: number;
  refetch: () => Promise<void>;
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
const mapRowsToTasks = (data: TodayTaskRow[] | null): LeadTaskWithLead[] => {
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
 * Get start and end of today in local timezone as ISO strings.
 */
const getTodayBounds = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return {
    startIso: startOfDay.toISOString(),
    endIso: endOfDay.toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

/**
 * Custom hook to load today's and overdue tasks for the dashboard cockpit.
 *
 * Provides:
 * - todayFollowUps: Array of follow-up tasks due today
 * - todayHunters: Array of hunter tasks due today
 * - overdueFollowUpsCount: Number of overdue follow-ups
 * - overdueHuntersCount: Number of overdue hunter tasks
 * - loading: Boolean loading state
 * - error: Error message string or null
 * - refetch: Function to reload tasks
 */
export const useTodayLeadTasks = (): TodayLeadTasksResult => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [todayFollowUps, setTodayFollowUps] = useState<LeadTaskWithLead[]>([]);
  const [todayHunters, setTodayHunters] = useState<LeadTaskWithLead[]>([]);
  const [overdueFollowUpsCount, setOverdueFollowUpsCount] = useState<number>(0);
  const [overdueHuntersCount, setOverdueHuntersCount] = useState<number>(0);

  /**
   * Fetch all open tasks with due_at <= end of today.
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startIso, endIso } = getTodayBounds();

      const { data, error: queryError } = await supabaseClient
        .from("lead_tasks")
        .select("id, lead_id, task_type, status, template_key, due_at, note, leads(*)")
        .eq("status", "open")
        .in("task_type", ["follow_up", "hunter"])
        .not("due_at", "is", null)
        .lte("due_at", endIso)
        .order("due_at", { ascending: true });

      if (queryError) {
        throw new Error(queryError.message ?? "Tages-Cockpit konnte nicht geladen werden.");
      }

      // Map rows to typed tasks
      const tasks = mapRowsToTasks(data as unknown as TodayTaskRow[] | null);

      // Split into categories
      const followUpsToday = tasks.filter(
        (t) => t.task_type === "follow_up" && t.due_at && t.due_at >= startIso && t.due_at < endIso
      );

      const huntersToday = tasks.filter(
        (t) => t.task_type === "hunter" && t.due_at && t.due_at >= startIso && t.due_at < endIso
      );

      const overdueFollowUps = tasks.filter(
        (t) => t.task_type === "follow_up" && t.due_at && t.due_at < startIso
      ).length;

      const overdueHunters = tasks.filter(
        (t) => t.task_type === "hunter" && t.due_at && t.due_at < startIso
      ).length;

      setTodayFollowUps(followUpsToday);
      setTodayHunters(huntersToday);
      setOverdueFollowUpsCount(overdueFollowUps);
      setOverdueHuntersCount(overdueHunters);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Tages-Cockpit konnte nicht geladen werden.";
      console.error("useTodayLeadTasks fetch error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    loading,
    error,
    todayFollowUps,
    todayHunters,
    overdueFollowUpsCount,
    overdueHuntersCount,
    refetch,
  };
};

