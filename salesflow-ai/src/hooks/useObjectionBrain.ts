/**
 * Hook für Objection Brain - KI-gestützter Einwand-Coach
 */

import { useState } from "react";
import {
  generateObjectionBrainResult,
  type ObjectionBrainInput,
  type ObjectionBrainResult,
} from "@/services/objectionBrainService";

export function useObjectionBrain() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObjectionBrainResult | null>(null);

  const run = async (
    input: ObjectionBrainInput,
    personaKey?: "speed" | "balanced" | "relationship"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateObjectionBrainResult(input, personaKey);
      setResult(data);
    } catch (err: any) {
      console.error("Objection Brain Fehler:", err);
      setError(err?.message || "Objection Brain konnte keine Antwort generieren.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { loading, error, result, run, reset };
}
