/**
 * Service für Objection Brain - KI-gestützter Einwand-Coach
 */

// ─────────────────────────────────────────────────────────────────
// Types - Generate
// ─────────────────────────────────────────────────────────────────

export type ObjectionBrainInput = {
  vertical?: string | null;
  channel?: string | null;
  objection: string;
  context?: string | null;
};

export type ObjectionVariant = {
  label: string;
  message: string;
  summary?: string | null;
};

export type ObjectionBrainResult = {
  primary: ObjectionVariant;
  alternatives: ObjectionVariant[];
  reasoning?: string | null;
};

// ─────────────────────────────────────────────────────────────────
// Types - Logging
// ─────────────────────────────────────────────────────────────────

export type ObjectionLogInput = {
  leadId?: string | null;
  vertical?: string | null;
  channel?: string | null;
  objectionText: string;
  chosenVariantLabel: string;
  chosenMessage: string;
  modelReasoning?: string | null;
  outcome?: string | null;
  source?: string | null;
};

export type ObjectionLogResult = {
  id: string;
};

// ─────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Generiert Einwand-Behandlungsvorschläge via Backend API
 */
export async function generateObjectionBrainResult(
  input: ObjectionBrainInput,
  personaKey?: "speed" | "balanced" | "relationship"
): Promise<ObjectionBrainResult> {
  const response = await fetch("/api/objection-brain/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vertical: input.vertical ?? null,
      channel: input.channel ?? null,
      objection: input.objection,
      context: input.context ?? null,
      language: "de",
      persona_key: personaKey ?? null,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Objection Brain Anfrage fehlgeschlagen (${response.status}): ${text || "Unbekannter Fehler"}`
    );
  }

  const data = (await response.json()) as ObjectionBrainResult;
  return data;
}

/**
 * Loggt die Verwendung einer Einwand-Antwort für Analytics
 * 
 * Wird aufgerufen wenn der User "Diese Antwort verwenden" klickt.
 * Speichert in objection_sessions Tabelle für spätere Auswertungen.
 */
export async function logObjectionUsage(
  input: ObjectionLogInput
): Promise<ObjectionLogResult> {
  const response = await fetch("/api/objection-brain/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lead_id: input.leadId ?? null,
      vertical: input.vertical ?? null,
      channel: input.channel ?? null,
      objection_text: input.objectionText,
      chosen_variant_label: input.chosenVariantLabel,
      chosen_message: input.chosenMessage,
      model_reasoning: input.modelReasoning ?? null,
      outcome: input.outcome ?? null,
      source: input.source ?? "objection_brain_page",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Objection-Log fehlgeschlagen (${response.status}): ${text || "Unbekannter Fehler"}`
    );
  }

  const data = (await response.json()) as ObjectionLogResult;
  return data;
}
