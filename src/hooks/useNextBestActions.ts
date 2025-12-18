/**
 * Hook für Next Best Actions - Direkte Priorisierung aus Supabase
 * 
 * Workflow:
 * 1. Lädt Follow-ups aus der View "today_follow_ups"
 * 2. Sortiert nach:
 *    - Überfällige zuerst (next_follow_up_at < now)
 *    - Dann nach Phase (followup vor reactivation)
 *    - Dann nach Datum (älteste zuerst)
 * 3. Gibt Top 10 als "Nächste beste Aktionen" zurück
 */

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type NextBestActionWithContext = {
  task_id: string;
  score: number;
  label: string;
  reason: string;
  recommended_timeframe: string | null;
  lead_id: string;
  lead_name: string | null;
  task_type: string;
  due_at: string | null;
  vertical: string | null;
};

export type UseNextBestActionsResult = {
  loading: boolean;
  error: string | null;
  actions: NextBestActionWithContext[];
  refetch: () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────
// Types für today_follow_ups View
// ─────────────────────────────────────────────────────────────────

interface TodayFollowUpRow {
  status_id: string;
  lead_id: string;
  lead_name: string | null;
  lead_company: string | null;
  lead_vertical: string | null;
  current_step_code: string;
  status: string;
  next_follow_up_at: string;
  last_contacted_at: string | null;
  contact_count: number;
  reply_count: number;
  default_channel: string;
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function mapVertical(raw?: string | null): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("network")) return "network";
  if (v.includes("real") || v.includes("immo")) return "real_estate";
  if (v.includes("finanz") || v.includes("finance")) return "finance";
  return "generic";
}

/**
 * Bestimmt die Phase aus dem Step-Code
 */
function getPhaseFromStepCode(stepCode: string): "followup" | "reactivation" {
  // rx_ prefix = reactivation, sonst followup
  return stepCode.startsWith("rx_") ? "reactivation" : "followup";
}

/**
 * Berechnet wie viele Tage der Task überfällig ist (negativ = zukünftig)
 */
function getDaysOverdue(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = now.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Berechnet einen Prioritäts-Score (0-100)
 * - Überfällige Tasks: 70-100 (je überfälliger, desto höher)
 * - Heute fällige: 60-69
 * - Zukünftige: 30-59
 * - Follow-ups bekommen +10 Bonus gegenüber Reactivations
 */
function calculateScore(row: TodayFollowUpRow): number {
  const daysOverdue = getDaysOverdue(row.next_follow_up_at);
  const phase = getPhaseFromStepCode(row.current_step_code);
  
  let baseScore = 50;
  
  if (daysOverdue > 0) {
    // Überfällig: je mehr Tage, desto höher der Score (max 90)
    baseScore = Math.min(90, 70 + daysOverdue * 2);
  } else if (daysOverdue === 0) {
    // Heute fällig
    baseScore = 65;
  } else {
    // Zukünftig: leicht reduziert
    baseScore = Math.max(30, 50 + daysOverdue); // daysOverdue ist negativ
  }
  
  // Follow-ups haben Priorität über Reactivations
  if (phase === "followup") {
    baseScore += 10;
  }
  
  return Math.min(100, Math.max(0, Math.round(baseScore)));
}

/**
 * Generiert ein Label für die Aktion
 */
function generateLabel(row: TodayFollowUpRow): string {
  const daysOverdue = getDaysOverdue(row.next_follow_up_at);
  
  if (daysOverdue > 0) {
    return `Überfälliger Follow-up (${daysOverdue} Tag${daysOverdue > 1 ? "e" : ""})`;
  } else if (daysOverdue === 0) {
    return "Follow-up heute fällig";
  } else {
    return "Anstehender Follow-up";
  }
}

/**
 * Generiert eine Begründung für die Priorisierung
 */
function generateReason(row: TodayFollowUpRow): string {
  const daysOverdue = getDaysOverdue(row.next_follow_up_at);
  const phase = getPhaseFromStepCode(row.current_step_code);
  
  const parts: string[] = [];
  
  if (daysOverdue > 3) {
    parts.push(`Stark überfällig (${daysOverdue} Tage)`);
  } else if (daysOverdue > 0) {
    parts.push(`Überfällig seit ${daysOverdue} Tag${daysOverdue > 1 ? "en" : ""}`);
  } else if (daysOverdue === 0) {
    parts.push("Heute fällig");
  }
  
  if (phase === "followup") {
    parts.push("Aktive Follow-up-Phase");
  } else {
    parts.push("Reaktivierungs-Phase");
  }
  
  if (row.contact_count === 0) {
    parts.push("Noch kein Kontakt");
  } else if (row.reply_count > 0) {
    parts.push("Lead hat bereits geantwortet");
  }
  
  return parts.join(" • ");
}

/**
 * Generiert einen empfohlenen Zeitrahmen
 */
function generateTimeframe(row: TodayFollowUpRow): string | null {
  const daysOverdue = getDaysOverdue(row.next_follow_up_at);
  
  if (daysOverdue > 3) {
    return "Sofort kontaktieren";
  } else if (daysOverdue > 0) {
    return "Heute noch kontaktieren";
  } else if (daysOverdue === 0) {
    return "Heute kontaktieren";
  }
  
  return "In den nächsten Tagen";
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useNextBestActions(): UseNextBestActionsResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<NextBestActionWithContext[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Lade aus der View "today_follow_ups"
      const { data, error: queryError } = await supabaseClient
        .from("today_follow_ups")
        .select("*");

      if (queryError) {
        console.error("Fehler beim Laden der Follow-ups:", queryError);
        throw new Error("Follow-ups konnten nicht geladen werden: " + queryError.message);
      }

      const rows = (data as TodayFollowUpRow[]) ?? [];

      if (!rows.length) {
        setActions([]);
        setLoading(false);
        return;
      }

      // 2. Berechne Scores und mappe zu Actions
      const actionsWithScores = rows.map((row) => {
        const score = calculateScore(row);
        const phase = getPhaseFromStepCode(row.current_step_code);
        const daysOverdue = getDaysOverdue(row.next_follow_up_at);
        
        return {
          task_id: row.status_id,
          score,
          label: generateLabel(row),
          reason: generateReason(row),
          recommended_timeframe: generateTimeframe(row),
          lead_id: row.lead_id,
          lead_name: row.lead_name,
          task_type: "follow_up",
          due_at: row.next_follow_up_at,
          vertical: mapVertical(row.lead_vertical),
          // Sortier-Hilfswerte
          _daysOverdue: daysOverdue,
          _phase: phase,
        };
      });

      // 3. Sortiere nach:
      //    - Überfällige zuerst (daysOverdue DESC)
      //    - Dann nach Phase (followup vor reactivation)
      //    - Dann nach Datum (älteste zuerst)
      actionsWithScores.sort((a, b) => {
        // Zuerst: Überfällige (daysOverdue > 0)
        const aOverdue = a._daysOverdue > 0;
        const bOverdue = b._daysOverdue > 0;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // Wenn beide überfällig oder beide nicht: nach Phase
        if (a._phase !== b._phase) {
          return a._phase === "followup" ? -1 : 1;
        }
        
        // Gleiche Phase: nach Score (höher zuerst)
        return b.score - a.score;
      });

      // 4. Nimm Top 10
      const top10 = actionsWithScores.slice(0, 10);

      // 5. Entferne Sortier-Hilfswerte
      const finalActions = top10.map(({ _daysOverdue, _phase, ...action }) => action);

      setActions(finalActions);
    } catch (err: any) {
      console.error("Fehler bei Next-Best-Actions:", err);
      setError(
        err?.message ||
          "Die nächsten besten Aktionen konnten nicht geladen werden."
      );
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { loading, error, actions, refetch: load };
}

