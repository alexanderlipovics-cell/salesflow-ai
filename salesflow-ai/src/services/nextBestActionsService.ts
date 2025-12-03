/**
 * Service für Next Best Actions - KI-gestützte Task-Priorisierung
 * 
 * Dieser Service kommuniziert mit dem Backend-Endpoint, um offene Tasks
 * intelligent zu priorisieren. Die KI bewertet Tasks basierend auf:
 * - Dringlichkeit (Fälligkeit/Überfälligkeit)
 * - Potenzial (hohes Ticket, warmer Lead)
 * - Momentum (Follow-up-Stufe, letzter Kontakt)
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type NextBestTaskInput = {
  id: string;
  task_type: string;
  status: string;
  due_at?: string | null;
  vertical?: string | null;
  lead_name?: string | null;
  lead_status?: string | null;
  potential_value?: number | null;
  last_contact_at?: string | null;
  notes?: string | null;
};

export type NextBestAction = {
  task_id: string;
  score: number;
  label: string;
  reason: string;
  recommended_timeframe?: string | null;
};

// ─────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Holt KI-basierte Priorisierung für offene Tasks
 */
export async function fetchNextBestActions(
  tasks: NextBestTaskInput[],
  userId?: string | null,
  personaKey?: "speed" | "balanced" | "relationship"
): Promise<NextBestAction[]> {
  if (!tasks.length) return [];

  const response = await fetch("http://localhost:8000/api/next-best-actions/suggest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId ?? null,
      tasks,
      persona_key: personaKey ?? null,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Next-Best-Actions Anfrage fehlgeschlagen (${response.status}): ${
        text || "Unbekannter Fehler"
      }`
    );
  }

  const data = (await response.json()) as { actions: NextBestAction[] };
  return data.actions ?? [];
}

