/**
 * 🧠 useSendMessageWithTeach Hook
 * ================================
 * Hook der Nachrichten sendet und automatisch erkennt,
 * wenn der User den KI-Vorschlag stark verändert hat.
 *
 * Zeigt dann das Teach-UI um eine Regel zu lernen.
 */

import { useState, useCallback } from "react";
import type {
  OverrideEvent,
  OverrideContext,
  SimilarityConfig,
  TeachUIState,
} from "../../api/types/salesBrain";
import {
  computeSimpleSimilarity,
  detectOverrideType,
  isSignificantOverride,
  DEFAULT_SIMILARITY_CONFIG,
} from "../../api/types/salesBrain";

// =============================================================================
// TYPES
// =============================================================================

export interface Suggestion {
  id: string;
  text: string;
}

export interface SendMessageOptions {
  /** Die finale Nachricht die gesendet werden soll */
  finalText: string;
  /** Der KI-Vorschlag (falls vorhanden) */
  suggestion?: Suggestion;
  /** Kontext für die Regel */
  context?: OverrideContext;
  /** Callback um die Nachricht wirklich zu senden */
  sendCallback?: (text: string) => Promise<void> | void;
}

export interface UseSendMessageWithTeachOptions {
  /** Similarity-Konfiguration */
  similarityConfig?: Partial<SimilarityConfig>;
  /** Default-Kontext der immer verwendet wird */
  defaultContext?: Partial<OverrideContext>;
  /** Ob das Teach-UI aktiviert ist */
  enabled?: boolean;
}

export interface UseSendMessageWithTeachReturn {
  /** Sendet eine Nachricht und prüft auf Override */
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  /** Teach-UI State */
  teachState: TeachUIState;
  /** Schließt das Teach-UI */
  closeTeach: () => void;
  /** Setzt den pending Override manuell */
  setPendingOverride: (override: OverrideEvent | null) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useSendMessageWithTeach(
  options: UseSendMessageWithTeachOptions = {}
): UseSendMessageWithTeachReturn {
  const {
    similarityConfig = DEFAULT_SIMILARITY_CONFIG,
    defaultContext = {},
    enabled = true,
  } = options;

  // Merge config
  const config: SimilarityConfig = {
    ...DEFAULT_SIMILARITY_CONFIG,
    ...similarityConfig,
  };

  // State
  const [teachState, setTeachState] = useState<TeachUIState>({
    visible: false,
    overrideEvent: null,
    isSubmitting: false,
    error: null,
  });

  // =============================================================================
  // SEND MESSAGE
  // =============================================================================

  const sendMessage = useCallback(
    async ({ finalText, suggestion, context, sendCallback }: SendMessageOptions) => {
      // 1) Nachricht normal senden
      if (sendCallback) {
        try {
          await sendCallback(finalText);
        } catch (e) {
          console.error("Failed to send message:", e);
          throw e;
        }
      }

      // 2) Prüfen ob Teach-UI aktiviert ist
      if (!enabled) return;

      // 3) Prüfen ob es einen KI-Vorschlag gab
      if (!suggestion?.text) return;

      // 4) Berechne Ähnlichkeit
      const similarity = computeSimpleSimilarity(suggestion.text, finalText);

      // 5) Prüfen ob es ein signifikanter Override ist
      const isOverride = isSignificantOverride(suggestion.text, finalText, config);

      if (!isOverride) {
        // Kein signifikanter Override - nichts tun
        return;
      }

      // 6) Override Event erstellen
      const overrideEvent: OverrideEvent = {
        suggestionId: suggestion.id,
        originalText: suggestion.text,
        finalText,
        similarityScore: similarity,
        context: {
          ...defaultContext,
          ...context,
        },
        overrideType: detectOverrideType(suggestion.text, finalText),
      };

      // 7) Teach-UI anzeigen
      setTeachState((prev) => ({
        ...prev,
        visible: true,
        overrideEvent,
      }));
    },
    [enabled, config, defaultContext]
  );

  // =============================================================================
  // CLOSE TEACH
  // =============================================================================

  const closeTeach = useCallback(() => {
    setTeachState({
      visible: false,
      overrideEvent: null,
      isSubmitting: false,
      error: null,
    });
  }, []);

  // =============================================================================
  // SET PENDING OVERRIDE
  // =============================================================================

  const setPendingOverride = useCallback((override: OverrideEvent | null) => {
    setTeachState((prev) => ({
      ...prev,
      visible: override !== null,
      overrideEvent: override,
    }));
  }, []);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    sendMessage,
    teachState,
    closeTeach,
    setPendingOverride,
  };
}

// =============================================================================
// STANDALONE DETECTION HOOK
// =============================================================================

/**
 * Hook nur für die Erkennung von Overrides
 * (ohne Senden)
 */
export function useOverrideDetection(
  config: SimilarityConfig = DEFAULT_SIMILARITY_CONFIG
) {
  /**
   * Prüft ob ein Text ein signifikanter Override ist
   */
  const checkOverride = useCallback(
    (
      originalText: string,
      finalText: string,
      context?: OverrideContext
    ): OverrideEvent | null => {
      const similarity = computeSimpleSimilarity(originalText, finalText);
      const isOverride = isSignificantOverride(originalText, finalText, config);

      if (!isOverride) return null;

      return {
        suggestionId: null,
        originalText,
        finalText,
        similarityScore: similarity,
        context: context || {},
        overrideType: detectOverrideType(originalText, finalText),
      };
    },
    [config]
  );

  return { checkOverride };
}

// =============================================================================
// EXPORT
// =============================================================================

export default useSendMessageWithTeach;

