/**
 * Hook für Playbook-Suggestor - KI-generierte Template-Vorschläge
 * 
 * Workflow:
 * 1. Manager wählt einen Top-Einwand aus Analytics
 * 2. runSuggestion() ruft Objection Brain API auf
 * 3. KI generiert ein wiederverwendbares Template
 * 4. Manager kann Template speichern oder nur Text kopieren
 */

import { useState } from "react";
import {
  generateObjectionBrainResult,
  type ObjectionBrainInput,
} from "@/services/objectionBrainService";
import {
  createObjectionTemplate,
  type ObjectionTemplate,
} from "@/services/objectionTemplatesService";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type SuggestPlayInput = {
  vertical?: string | null;
  objectionText: string;
  context?: string | null;
};

type UseObjectionPlaySuggestionResult = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  suggestion: {
    title: string;
    templateMessage: string;
    reasoning?: string | null;
  } | null;
  runSuggestion: (input: SuggestPlayInput) => Promise<void>;
  saveAsTemplate: (opts?: { titleOverride?: string }) => Promise<ObjectionTemplate | null>;
  reset: () => void;
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useObjectionPlaySuggestion(): UseObjectionPlaySuggestionResult {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState<SuggestPlayInput | null>(null);
  const [suggestion, setSuggestion] = useState<{
    title: string;
    templateMessage: string;
    reasoning?: string | null;
  } | null>(null);

  /**
   * Generiert einen KI-Vorschlag für ein Einwand-Template
   */
  const runSuggestion = async (input: SuggestPlayInput) => {
    setLoading(true);
    setError(null);
    setSuggestion(null);
    setCurrentInput(input);

    try {
      // Wir nutzen den bestehenden Objection Brain Endpoint,
      // interpretieren aber die "primary.message" als Template.
      const brainInput: ObjectionBrainInput = {
        vertical: input.vertical ?? null,
        channel: "whatsapp",
        objection: input.objectionText,
        context:
          input.context ??
          "Dies ist ein wiederkehrender Einwand aus der Analytics-Auswertung. Bitte formuliere eine gut nutzbare Standard-Antwort (Template), die in vielen Situationen wiederverwendet werden kann.",
      };

      const result = await generateObjectionBrainResult(brainInput);

      const primary = result.primary;
      const title =
        primary.label && primary.label.trim().length > 0
          ? primary.label
          : "Standardantwort auf Einwand";

      setSuggestion({
        title,
        templateMessage: primary.message,
        reasoning: result.reasoning ?? primary.summary ?? null,
      });
    } catch (err: any) {
      console.error("Fehler bei Play-Suggestion:", err);
      setError(
        err?.message ??
          "Die KI konnte keinen Vorschlag für ein Einwand-Template generieren."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Speichert den aktuellen KI-Vorschlag als Draft-Template in Supabase
   */
  const saveAsTemplate = async (opts?: { titleOverride?: string }) => {
    if (!suggestion || !currentInput) {
      return null;
    }

    setSaving(true);
    setError(null);

    try {
      const template = await createObjectionTemplate({
        title: opts?.titleOverride?.trim().length
          ? opts!.titleOverride!
          : suggestion.title,
        vertical: currentInput.vertical ?? null,
        objectionText: currentInput.objectionText,
        templateMessage: suggestion.templateMessage,
        notes: suggestion.reasoning ?? null,
        status: "draft",
      });

      return template;
    } catch (err: any) {
      console.error("Fehler beim Speichern des Templates:", err);
      setError(
        err?.message ||
          "Der Template-Vorschlag konnte nicht gespeichert werden."
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Setzt den Hook-State zurück
   */
  const reset = () => {
    setError(null);
    setSuggestion(null);
    setCurrentInput(null);
    setLoading(false);
    setSaving(false);
  };

  return { loading, saving, error, suggestion, runSuggestion, saveAsTemplate, reset };
}

