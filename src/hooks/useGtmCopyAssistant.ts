/**
 * Hook für GTM Copy Assistant
 * 
 * Verwaltet State und API-Calls für die Content-Generierung.
 */

import { useState } from "react";
import { generateGtmCopy, type GtmCopyPayload, type GtmCopyResult } from "@/services/gtmCopyService";
import { useSalesPersona } from "@/hooks/useSalesPersona";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type UseGtmCopyAssistantResult = {
  loading: boolean;
  error: string | null;
  result: GtmCopyResult | null;
  run: (payload: Omit<GtmCopyPayload, "persona_key">) => Promise<void>;
  reset: () => void;
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

/**
 * Hook für GTM Copy Assistant
 * 
 * Bietet State-Management und API-Integration für Content-Generierung.
 * Persona wird automatisch aus useSalesPersona ergänzt.
 */
export function useGtmCopyAssistant(): UseGtmCopyAssistantResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GtmCopyResult | null>(null);

  // Persona optional ergänzen (falls Hook verfügbar)
  const { persona } = useSalesPersona();

  const run = async (payload: Omit<GtmCopyPayload, "persona_key">) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await generateGtmCopy({
        ...payload,
        persona_key: persona, // "speed" | "balanced" | "relationship"
      });
      setResult(data);
    } catch (err: any) {
      console.error("Fehler im GTM Copy Assistant:", err);
      setError(
        err?.message ||
          "Der GTM Copy Assistant konnte keinen Text generieren. Bitte später erneut versuchen."
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setResult(null);
    setLoading(false);
  };

  return { loading, error, result, run, reset };
}

