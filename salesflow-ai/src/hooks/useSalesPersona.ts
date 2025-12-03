/**
 * Hook für Sales Agent Personas
 * 
 * Lädt die aktuelle Persona des Users beim Mount und bietet
 * eine Funktion zum Aktualisieren. Fallback immer auf "balanced".
 */

import { useEffect, useState } from "react";
import {
  getCurrentUserPersona,
  updateCurrentUserPersona,
  type PersonaKey,
} from "@/services/salesPersonaService";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type UseSalesPersonaResult = {
  loading: boolean;
  error: string | null;
  persona: PersonaKey;
  setPersona: (p: PersonaKey) => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useSalesPersona(): UseSalesPersonaResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persona, setPersonaState] = useState<PersonaKey>("balanced");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getCurrentUserPersona();
        setPersonaState(p);
      } catch (err: any) {
        console.error("Fehler beim Laden der Sales-Persona:", err);
        setError(
          err?.message ||
            "Deine KI-Persona konnte nicht geladen werden. Es wird 'balanced' verwendet."
        );
        setPersonaState("balanced");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setPersona = async (p: PersonaKey) => {
    setLoading(true);
    setError(null);
    try {
      await updateCurrentUserPersona(p);
      setPersonaState(p);
    } catch (err: any) {
      console.error("Fehler beim Aktualisieren der Persona:", err);
      setError(
        err?.message || "Persona konnte nicht aktualisiert werden. Versuch es später erneut."
      );
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, persona, setPersona };
}

