/**
 * Hook für EINWAND-KILLER (Objection Solver)
 * Generiert 3 personalisierte Antwort-Strategien basierend auf Company Truth + Lead DISG
 */

import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/lib/supabaseClient";

// ============================================================================
// Types
// ============================================================================

export interface ObjectionResponse {
  logical: string;
  emotional: string;
  provocative: string;
}

export interface SolveObjectionParams {
  objection_key: string; // e.g., "pyramid_scheme", "price_too_high"
  lead_id: string | null;
  user_id: string;
}

export interface SolveObjectionResult {
  success: boolean;
  objection_key: string;
  lead_name: string | null;
  disg_type: "D" | "I" | "S" | "G" | null;
  responses: ObjectionResponse;
}

// ============================================================================
// API Function: Call Edge Function
// ============================================================================

async function solveObjection(
  params: SolveObjectionParams
): Promise<SolveObjectionResult> {
  const { objection_key, lead_id, user_id } = params;

  if (!lead_id) {
    throw new Error("lead_id is required");
  }

  // Get current session
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  // Call Supabase Edge Function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/solve-objection`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      objection_key,
      lead_id,
      user_id: user_id || session.user.id,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

// ============================================================================
// Fallback: Get Raw Company Content from DB
// ============================================================================

async function getRawCompanyContent(
  objectionKey: string
): Promise<ObjectionResponse | null> {
  try {
    const { data, error } = await supabaseClient.rpc("get_optimized_content", {
      p_category: "objection",
      p_key_identifier: objectionKey,
      p_language: "de",
      p_region: null,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const content = data[0];
    const script = content.payload?.script || content.payload?.title || "";

    if (!script) {
      return null;
    }

    // Return as single response (all three variants same if fallback)
    return {
      logical: script,
      emotional: script,
      provocative: script,
    };
  } catch (error) {
    console.error("Error fetching raw company content:", error);
    return null;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useObjectionSolver(
  params: SolveObjectionParams | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const enabled = options?.enabled !== false && params !== null;

  const query = useQuery({
    queryKey: ["objectionSolver", params?.objection_key, params?.lead_id],
    queryFn: async () => {
      if (!params) {
        throw new Error("Params required");
      }

      try {
        // Try AI generation via Edge Function
        const result = await solveObjection(params);
        return result;
      } catch (error) {
        console.warn("AI generation failed, trying fallback:", error);

        // Fallback: Get raw content from DB
        const fallback = await getRawCompanyContent(params.objection_key);

        if (!fallback) {
          throw error; // Re-throw original error if fallback also fails
        }

        // Return fallback in same format
        return {
          success: true,
          objection_key: params.objection_key,
          lead_name: null,
          disg_type: null,
          responses: fallback,
        } as SolveObjectionResult;
      }
    },
    enabled,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    retry: 1, // Only retry once
    retryDelay: 1000,
  });

  return {
    ...query,
    // Convenience getters
    responses: query.data?.responses || null,
    leadName: query.data?.lead_name || null,
    disgType: query.data?.disg_type || null,
  };
}

