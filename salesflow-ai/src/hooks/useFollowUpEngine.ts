import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import type {
  TodayFollowUpTask,
  FollowUpStats,
  TaskOutcome,
  LeadStatus,
  FollowUpStepCode,
  FollowUpPhase,
  TaskUrgency,
  FollowUpChannel,
  GenerateMessageParams,
  CompleteTaskParams,
} from "@/types/followUp";
import { STEP_CONFIGS } from "@/types/followUp";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface UseFollowUpEngineReturn {
  /** Heute fällige Tasks */
  tasks: TodayFollowUpTask[];
  /** Statistiken */
  stats: FollowUpStats | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Tasks neu laden */
  refetch: () => Promise<void>;
  /** Task als erledigt markieren */
  completeTask: (params: CompleteTaskParams) => Promise<void>;
  /** Task auf morgen verschieben */
  skipTask: (leadId: string) => Promise<void>;
  /** Lead hat geantwortet */
  markReplied: (leadId: string, notes?: string) => Promise<void>;
  /** Lead konvertiert */
  markConverted: (leadId: string, notes?: string) => Promise<void>;
  /** Lead verloren */
  markLost: (leadId: string, reason?: string) => Promise<void>;
  /** Lead pausieren */
  pauseLead: (leadId: string, pauseUntil: Date) => Promise<void>;
  /** Lead reaktivieren */
  resumeLead: (leadId: string) => Promise<void>;
  /** Personalisierte Nachricht generieren */
  generateMessage: (params: GenerateMessageParams) => string;
  /** Stats neu laden */
  refetchStats: () => Promise<void>;
}

/**
 * Raw row from today_follow_ups view
 */
interface TodayFollowUpRow {
  status_id: string;
  lead_id: string;
  lead_name: string | null;
  lead_company: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  lead_instagram: string | null;
  lead_linkedin?: string | null;
  lead_vertical: string | null;
  current_step_code: string;
  status: string;
  next_follow_up_at: string;
  last_contacted_at: string | null;
  contact_count: number;
  reply_count: number;
  preferred_channel: string | null;
  template_id?: string;
  message_template: string | null;
  subject_template?: string | null;
  default_channel: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Berechnet die Dringlichkeit eines Tasks basierend auf dem Fälligkeitsdatum
 */
function calculateUrgency(nextFollowUpAt: string): { urgency: TaskUrgency; daysOverdue: number } {
  const now = new Date();
  const dueDate = new Date(nextFollowUpAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { urgency: "overdue", daysOverdue: diffDays };
  }
  if (diffDays === 0) {
    return { urgency: "today", daysOverdue: 0 };
  }
  return { urgency: "upcoming", daysOverdue: diffDays };
}

/**
 * Ermittelt die Phase basierend auf dem Step-Code
 */
function getPhaseFromStepCode(stepCode: FollowUpStepCode): FollowUpPhase {
  const config = STEP_CONFIGS.find((s) => s.code === stepCode);
  return config?.phase ?? "followup";
}

/**
 * Ermittelt den nächsten Step in der Sequenz
 */
function getNextStep(currentStepCode: FollowUpStepCode): FollowUpStepCode | null {
  const currentIndex = STEP_CONFIGS.findIndex((s) => s.code === currentStepCode);
  if (currentIndex === -1 || currentIndex === STEP_CONFIGS.length - 1) {
    // Bei loop_checkin: bleibt im Loop
    if (currentStepCode === "rx_loop_checkin") {
      return "rx_loop_checkin";
    }
    return null;
  }
  return STEP_CONFIGS[currentIndex + 1].code;
}

/**
 * Berechnet das nächste Fälligkeitsdatum basierend auf der Template-Konfiguration
 */
function calculateNextDueDate(currentStepCode: FollowUpStepCode): Date {
  const daysMap: Record<FollowUpStepCode, number> = {
    initial_contact: 3, // -> fu_1_bump nach 3 Tagen
    fu_1_bump: 4, // -> fu_2_value nach 4 Tagen (Tag 7)
    fu_2_value: 3, // -> fu_3_decision nach 3 Tagen (Tag 10)
    fu_3_decision: 4, // -> fu_4_last_touch nach 4 Tagen (Tag 14)
    fu_4_last_touch: 46, // -> rx_1_update nach 46 Tagen (Tag 60)
    rx_1_update: 60, // -> rx_2_value_asset nach 60 Tagen (Tag 120)
    rx_2_value_asset: 180, // -> rx_3_yearly_checkin nach 180 Tagen (Tag 300)
    rx_3_yearly_checkin: 180, // -> rx_loop_checkin
    rx_loop_checkin: 180, // Alle 180 Tage wiederholen
  };

  const daysToAdd = daysMap[currentStepCode] || 7;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}

/**
 * Mappt Datenbankzeilen zu Task-Objekten
 */
function mapRowToTask(row: TodayFollowUpRow): TodayFollowUpTask {
  const stepCode = row.current_step_code as FollowUpStepCode;
  const { urgency, daysOverdue } = calculateUrgency(row.next_follow_up_at);

  return {
    status_id: row.status_id,
    lead_id: row.lead_id,
    lead_name: row.lead_name,
    lead_company: row.lead_company,
    lead_phone: row.lead_phone,
    lead_email: row.lead_email,
    lead_instagram: row.lead_instagram,
    lead_linkedin: row.lead_linkedin ?? null,
    lead_vertical: row.lead_vertical,
    current_step_code: stepCode,
    phase: getPhaseFromStepCode(stepCode),
    status: row.status as LeadStatus,
    next_follow_up_at: row.next_follow_up_at,
    last_contacted_at: row.last_contacted_at,
    contact_count: row.contact_count,
    reply_count: row.reply_count,
    preferred_channel: row.preferred_channel as FollowUpChannel | null,
    template_id: row.template_id,
    message_template: row.message_template,
    subject_template: row.subject_template ?? null,
    default_channel: row.default_channel as FollowUpChannel,
    urgency,
    days_overdue: daysOverdue,
  };
}

/**
 * Sortiert Tasks nach Dringlichkeit (overdue zuerst, dann today, dann upcoming)
 */
function sortByUrgency(a: TodayFollowUpTask, b: TodayFollowUpTask): number {
  const urgencyOrder: Record<TaskUrgency, number> = { overdue: 0, today: 1, upcoming: 2 };
  const orderDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  if (orderDiff !== 0) return orderDiff;

  // Innerhalb der gleichen Urgency: nach Datum sortieren
  return new Date(a.next_follow_up_at).getTime() - new Date(b.next_follow_up_at).getTime();
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Eternal Follow-Up Engine Hook
 *
 * Verwaltet das gesamte Follow-Up System:
 * - Lädt heute fällige Tasks aus der View "today_follow_ups"
 * - Ermöglicht Task-Completion mit automatischer Berechnung des nächsten Steps
 * - Skip, Reply, Convert, Lost Aktionen
 * - Statistiken
 * - Message-Personalisierung
 */
export function useFollowUpEngine(): UseFollowUpEngineReturn {
  const [tasks, setTasks] = useState<TodayFollowUpTask[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch Today Tasks
  // ────────────────────────────────────────────────────────────────────────────

  const fetchTodayTasks = useCallback(async (): Promise<TodayFollowUpTask[]> => {
    // Versuche zuerst die View, falls nicht vorhanden, manueller Query
    const { data, error: queryError } = await supabaseClient
      .from("today_follow_ups")
      .select("*");

    if (queryError) {
      // Fallback: Manueller Query falls View nicht existiert
      const today = new Date().toISOString().split("T")[0];
      const { data: fallbackData, error: fallbackError } = await supabaseClient
        .from("lead_follow_up_status")
        .select(`
          id,
          lead_id,
          current_step_code,
          status,
          next_follow_up_at,
          last_contacted_at,
          contact_count,
          reply_count,
          preferred_channel,
          leads (
            id,
            name,
            company,
            phone,
            email,
            instagram,
            vertical
          )
        `)
        .eq("status", "active")
        .lte("next_follow_up_at", today)
        .order("next_follow_up_at", { ascending: true });

      if (fallbackError) {
        throw new Error(fallbackError.message ?? "Follow-ups konnten nicht geladen werden.");
      }

      // Map fallback data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (fallbackData ?? []).map((row: any) => {
        const lead = row.leads ?? {};
        const stepCode = row.current_step_code as FollowUpStepCode;
        const { urgency, daysOverdue } = calculateUrgency(row.next_follow_up_at);

        return {
          status_id: row.id,
          lead_id: row.lead_id,
          lead_name: lead.name ?? null,
          lead_company: lead.company ?? null,
          lead_phone: lead.phone ?? null,
          lead_email: lead.email ?? null,
          lead_instagram: lead.instagram ?? null,
          lead_linkedin: null,
          lead_vertical: lead.vertical ?? null,
          current_step_code: stepCode,
          phase: getPhaseFromStepCode(stepCode),
          status: row.status as LeadStatus,
          next_follow_up_at: row.next_follow_up_at,
          last_contacted_at: row.last_contacted_at,
          contact_count: row.contact_count,
          reply_count: row.reply_count,
          preferred_channel: row.preferred_channel as FollowUpChannel | null,
          message_template: null,
          default_channel: row.preferred_channel ?? "whatsapp",
          urgency,
          days_overdue: daysOverdue,
        } as TodayFollowUpTask;
      });
    }

    return (data ?? [])
      .map((row) => mapRowToTask(row as TodayFollowUpRow))
      .sort(sortByUrgency);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch Stats
  // ────────────────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async (): Promise<FollowUpStats> => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Parallel queries for different counts
    const [activeResult, overdueResult, todayResult, upcomingResult, statusCounts] = await Promise.all([
      supabaseClient
        .from("lead_follow_up_status")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      supabaseClient
        .from("lead_follow_up_status")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .lt("next_follow_up_at", today),

      supabaseClient
        .from("lead_follow_up_status")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gte("next_follow_up_at", today)
        .lt("next_follow_up_at", tomorrowStr),

      supabaseClient
        .from("lead_follow_up_status")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gte("next_follow_up_at", tomorrowStr),

      supabaseClient
        .from("lead_follow_up_status")
        .select("status, contact_count, reply_count"),
    ]);

    const allStatuses = statusCounts.data ?? [];
    const pausedCount = allStatuses.filter((s) => s.status === "paused").length;
    const repliedCount = allStatuses.filter((s) => s.status === "replied").length;
    const convertedCount = allStatuses.filter((s) => s.status === "converted").length;
    const lostCount = allStatuses.filter((s) => s.status === "lost").length;

    // Calculate rates
    const totalContacts = allStatuses.reduce((sum, s) => sum + (s.contact_count ?? 0), 0);
    const totalReplies = allStatuses.reduce((sum, s) => sum + (s.reply_count ?? 0), 0);
    const totalFinished = convertedCount + lostCount;
    const replyRate = totalContacts > 0 ? (totalReplies / totalContacts) * 100 : 0;
    const conversionRate = totalFinished > 0 ? (convertedCount / totalFinished) * 100 : 0;

    // Average touches to reply
    const repliedLeads = allStatuses.filter((s) => s.reply_count > 0);
    const avgTouchesToReply =
      repliedLeads.length > 0
        ? repliedLeads.reduce((sum, s) => sum + s.contact_count, 0) / repliedLeads.length
        : 0;

    return {
      total_active: activeResult.count ?? 0,
      overdue_count: overdueResult.count ?? 0,
      today_count: todayResult.count ?? 0,
      upcoming_count: upcomingResult.count ?? 0,
      paused_count: pausedCount,
      replied_count: repliedCount,
      converted_count: convertedCount,
      lost_count: lostCount,
      reply_rate: Math.round(replyRate * 10) / 10,
      conversion_rate: Math.round(conversionRate * 10) / 10,
      avg_touches_to_reply: Math.round(avgTouchesToReply * 10) / 10,
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Refetch Functions
  // ────────────────────────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextTasks, nextStats] = await Promise.all([fetchTodayTasks(), fetchStats()]);
      setTasks(nextTasks);
      setStats(nextStats);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Daten konnten nicht geladen werden.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchTodayTasks, fetchStats]);

  const refetchStats = useCallback(async () => {
    try {
      const nextStats = await fetchStats();
      setStats(nextStats);
    } catch {
      // Stats-Fehler sind nicht kritisch
    }
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  // ────────────────────────────────────────────────────────────────────────────
  // Complete Task
  // ────────────────────────────────────────────────────────────────────────────

  const completeTask = useCallback(
    async ({ leadId, outcome, messageSent, notes }: CompleteTaskParams) => {
      setError(null);

      // Find current task
      const currentTask = tasks.find((t) => t.lead_id === leadId);
      if (!currentTask) {
        throw new Error("Task nicht gefunden.");
      }

      // Optimistic update
      const previousTasks = [...tasks];
      setTasks((prev) => prev.filter((t) => t.lead_id !== leadId));

      try {
        // 1. Log to history
        await supabaseClient.from("follow_up_history").insert({
          lead_id: leadId,
          follow_up_status_id: currentTask.status_id,
          step_code: currentTask.current_step_code,
          channel: currentTask.preferred_channel ?? currentTask.default_channel,
          outcome,
          message_sent: messageSent ?? null,
          notes: notes ?? null,
          executed_at: new Date().toISOString(),
        });

        // 2. Determine next step
        const nextStep = getNextStep(currentTask.current_step_code);
        const nextDueDate = nextStep ? calculateNextDueDate(currentTask.current_step_code) : null;

        // 3. Update status
        const updateData: Record<string, unknown> = {
          last_contacted_at: new Date().toISOString(),
          contact_count: currentTask.contact_count + 1,
        };

        // Wenn Antwort erhalten, entsprechend handeln
        if (outcome === "replied" || outcome === "interested" || outcome === "meeting_scheduled") {
          updateData.status = "replied";
          updateData.reply_count = currentTask.reply_count + 1;
          updateData.next_follow_up_at = null;
        } else if (outcome === "not_interested") {
          updateData.status = "lost";
          updateData.next_follow_up_at = null;
        } else if (nextStep) {
          // Weiter zur nächsten Stufe
          updateData.current_step_code = nextStep;
          updateData.next_follow_up_at = nextDueDate?.toISOString() ?? null;
        } else {
          // Ende der Sequenz ohne Antwort -> lost
          updateData.status = "lost";
          updateData.next_follow_up_at = null;
        }

        const { error: updateError } = await supabaseClient
          .from("lead_follow_up_status")
          .update(updateData)
          .eq("id", currentTask.status_id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Refetch stats
        await refetchStats();
      } catch (err) {
        // Rollback
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : "Task konnte nicht abgeschlossen werden.";
        setError(message);
        throw new Error(message);
      }
    },
    [tasks, refetchStats]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Skip Task (auf morgen verschieben)
  // ────────────────────────────────────────────────────────────────────────────

  const skipTask = useCallback(
    async (leadId: string) => {
      setError(null);

      const currentTask = tasks.find((t) => t.lead_id === leadId);
      if (!currentTask) {
        throw new Error("Task nicht gefunden.");
      }

      // Optimistic update: entfernen aus heutiger Liste
      const previousTasks = [...tasks];
      setTasks((prev) => prev.filter((t) => t.lead_id !== leadId));

      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { error: updateError } = await supabaseClient
          .from("lead_follow_up_status")
          .update({ next_follow_up_at: tomorrow.toISOString() })
          .eq("id", currentTask.status_id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        await refetchStats();
      } catch (err) {
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : "Task konnte nicht verschoben werden.";
        setError(message);
        throw new Error(message);
      }
    },
    [tasks, refetchStats]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Mark Replied
  // ────────────────────────────────────────────────────────────────────────────

  const markReplied = useCallback(
    async (leadId: string, notes?: string) => {
      setError(null);

      const currentTask = tasks.find((t) => t.lead_id === leadId);
      if (!currentTask) {
        throw new Error("Task nicht gefunden.");
      }

      const previousTasks = [...tasks];
      setTasks((prev) => prev.filter((t) => t.lead_id !== leadId));

      try {
        // Log to history
        await supabaseClient.from("follow_up_history").insert({
          lead_id: leadId,
          follow_up_status_id: currentTask.status_id,
          step_code: currentTask.current_step_code,
          channel: currentTask.preferred_channel ?? currentTask.default_channel,
          outcome: "replied",
          notes: notes ?? "Lead hat geantwortet",
          executed_at: new Date().toISOString(),
        });

        // Update status
        const { error: updateError } = await supabaseClient
          .from("lead_follow_up_status")
          .update({
            status: "replied",
            reply_count: currentTask.reply_count + 1,
            next_follow_up_at: null,
            notes: notes ?? null,
          })
          .eq("id", currentTask.status_id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        await refetchStats();
      } catch (err) {
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : "Status konnte nicht geändert werden.";
        setError(message);
        throw new Error(message);
      }
    },
    [tasks, refetchStats]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Mark Converted
  // ────────────────────────────────────────────────────────────────────────────

  const markConverted = useCallback(
    async (leadId: string, notes?: string) => {
      setError(null);

      const currentTask = tasks.find((t) => t.lead_id === leadId);
      if (!currentTask) {
        throw new Error("Task nicht gefunden.");
      }

      const previousTasks = [...tasks];
      setTasks((prev) => prev.filter((t) => t.lead_id !== leadId));

      try {
        await supabaseClient.from("follow_up_history").insert({
          lead_id: leadId,
          follow_up_status_id: currentTask.status_id,
          step_code: currentTask.current_step_code,
          channel: currentTask.preferred_channel ?? currentTask.default_channel,
          outcome: "interested",
          notes: notes ?? "Lead konvertiert",
          executed_at: new Date().toISOString(),
        });

        const { error: updateError } = await supabaseClient
          .from("lead_follow_up_status")
          .update({
            status: "converted",
            next_follow_up_at: null,
            notes: notes ?? null,
          })
          .eq("id", currentTask.status_id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        await refetchStats();
      } catch (err) {
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : "Status konnte nicht geändert werden.";
        setError(message);
        throw new Error(message);
      }
    },
    [tasks, refetchStats]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Mark Lost
  // ────────────────────────────────────────────────────────────────────────────

  const markLost = useCallback(
    async (leadId: string, reason?: string) => {
      setError(null);

      const currentTask = tasks.find((t) => t.lead_id === leadId);
      if (!currentTask) {
        throw new Error("Task nicht gefunden.");
      }

      const previousTasks = [...tasks];
      setTasks((prev) => prev.filter((t) => t.lead_id !== leadId));

      try {
        await supabaseClient.from("follow_up_history").insert({
          lead_id: leadId,
          follow_up_status_id: currentTask.status_id,
          step_code: currentTask.current_step_code,
          channel: currentTask.preferred_channel ?? currentTask.default_channel,
          outcome: "not_interested",
          notes: reason ?? "Lead verloren",
          executed_at: new Date().toISOString(),
        });

        const { error: updateError } = await supabaseClient
          .from("lead_follow_up_status")
          .update({
            status: "lost",
            next_follow_up_at: null,
            notes: reason ?? null,
          })
          .eq("id", currentTask.status_id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        await refetchStats();
      } catch (err) {
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : "Status konnte nicht geändert werden.";
        setError(message);
        throw new Error(message);
      }
    },
    [tasks, refetchStats]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Pause Lead
  // ────────────────────────────────────────────────────────────────────────────

  const pauseLead = useCallback(
    async (leadId: string, pauseUntil: Date) => {
      setError(null);

      const currentTask = tasks.find((t) => t.lead_id === leadId);
      if (!currentTask) {
        throw new Error("Task nicht gefunden.");
      }

      const previousTasks = [...tasks];
      setTasks((prev) => prev.filter((t) => t.lead_id !== leadId));

      try {
        const { error: updateError } = await supabaseClient
          .from("lead_follow_up_status")
          .update({
            status: "paused",
            paused_until: pauseUntil.toISOString(),
          })
          .eq("id", currentTask.status_id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        await refetchStats();
      } catch (err) {
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : "Lead konnte nicht pausiert werden.";
        setError(message);
        throw new Error(message);
      }
    },
    [tasks, refetchStats]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Resume Lead
  // ────────────────────────────────────────────────────────────────────────────

  const resumeLead = useCallback(async (leadId: string) => {
    setError(null);

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { error: updateError } = await supabaseClient
        .from("lead_follow_up_status")
        .update({
          status: "active",
          paused_until: null,
          next_follow_up_at: tomorrow.toISOString(),
        })
        .eq("lead_id", leadId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Neu laden, da der Lead jetzt wieder aktiv ist
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lead konnte nicht reaktiviert werden.";
      setError(message);
      throw new Error(message);
    }
  }, [refetch]);

  // ────────────────────────────────────────────────────────────────────────────
  // Generate Message
  // ────────────────────────────────────────────────────────────────────────────

  const generateMessage = useCallback(({ template, lead }: GenerateMessageParams): string => {
    if (!template) return "";

    let message = template;

    // Standard-Platzhalter ersetzen
    const replacements: Record<string, string> = {
      "{{name}}": lead.name ?? "du",
      "{{vorname}}": lead.name?.split(" ")[0] ?? "du",
      "{{company}}": lead.company ?? "dein Unternehmen",
      "{{firma}}": lead.company ?? "dein Unternehmen",
      "{{vertical}}": lead.vertical ?? "dein Bereich",
      "{{branche}}": lead.vertical ?? "dein Bereich",
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(placeholder, "gi"), value);
    }

    // Zusätzliche dynamische Platzhalter aus dem Lead-Objekt
    for (const [key, value] of Object.entries(lead)) {
      if (value && typeof value === "string") {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        message = message.replace(placeholder, value);
      }
    }

    return message.trim();
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Return
  // ────────────────────────────────────────────────────────────────────────────

  return {
    tasks,
    stats,
    loading,
    error,
    refetch,
    completeTask,
    skipTask,
    markReplied,
    markConverted,
    markLost,
    pauseLead,
    resumeLead,
    generateMessage,
    refetchStats,
  };
}

