// ============================================================================
// Sales Flow AI - EINWAND-KILLER Edge Function
// ============================================================================
// Real-time Negotiation Coach: Generates 3 personalized objection responses
// based on Company Truth + Lead DISG Profile
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ============================================================================
// Types
// ============================================================================

interface SolveObjectionRequest {
  objection_key: string; // e.g., "pyramid_scheme", "price_too_high"
  lead_id: string; // UUID
  user_id: string; // UUID (from auth)
}

interface LeadProfile {
  id: string;
  name: string | null;
  disg_type: "D" | "I" | "S" | "G" | null;
  company: string | null;
  notes: string | null;
}

interface CompanyContent {
  payload: {
    title?: string;
    script?: string;
    ai_hints?: string;
  } | null;
}

interface ObjectionResponse {
  logical: string;
  emotional: string;
  provocative: string;
}

// ============================================================================
// Helper: Fetch Lead Profile with DISG Data
// ============================================================================

async function fetchLeadProfile(
  supabase: any,
  leadId: string
): Promise<LeadProfile | null> {
  // Try lead_profiles table first
  let { data, error } = await supabase
    .from("lead_profiles")
    .select("id, name, disg_type, company, notes")
    .eq("id", leadId)
    .single();

  // Fallback to leads table if lead_profiles doesn't exist
  if (error || !data) {
    console.log("Trying leads table as fallback...");
    const result = await supabase
      .from("leads")
      .select("id, name, disg_type, company, notes")
      .eq("id", leadId)
      .single();
    
    data = result.data;
    error = result.error;
  }

  if (error || !data) {
    console.error("Error fetching lead profile:", error);
    return null;
  }

  return data;
}

// ============================================================================
// Helper: Fetch Company Truth via Waterfall RPC
// ============================================================================

async function fetchCompanyContent(
  supabase: any,
  objectionKey: string,
  companyId: string | null,
  language: string = "de"
): Promise<CompanyContent | null> {
  // Use the waterfall RPC function to get optimized content
  const { data, error } = await supabase.rpc("get_optimized_content", {
    p_category: "objection",
    p_key_identifier: objectionKey,
    p_language: language,
    p_region: null,
  });

  if (error || !data || data.length === 0) {
    console.warn(`No content found for objection_key: ${objectionKey}`);
    return null;
  }

  return data[0];
}

// ============================================================================
// Helper: Generate AI Responses (GPT-4o-mini)
// ============================================================================

async function generateObjectionResponses(
  leadName: string,
  disgType: string | null,
  companyTruth: string,
  objectionKey: string
): Promise<ObjectionResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const disgDescription = {
    D: "Dominant: Direct, results-oriented, time-sensitive. Keep it short, data-driven, challenge them.",
    I: "Influencer: Enthusiastic, relationship-focused, optimistic. Use stories, emotions, personal connection.",
    S: "Steady: Patient, methodical, risk-averse. Be calm, structured, provide proof and reassurance.",
    G: "Conscientious: Analytical, detail-oriented, logical. Present data, facts, comparisons, no fluff.",
  };

  const systemPrompt = `Du bist ein Weltklasse MLM Sales Trainer mit 20+ Jahren Erfahrung. 
Deine Aufgabe: Konvertiere die rohe Firmenwahrheit in 3 spezifische, kopierfertige Scripts für ${leadName || "den Lead"}.

WICHTIG:
- ${leadName ? `Lead Name: ${leadName}` : "Kein Name verfügbar"}
- DISG-Typ: ${disgType ? disgDescription[disgType as keyof typeof disgDescription] : "Unbekannt"}
- Firmenwahrheit: ${companyTruth}

Generiere 3 Varianten (JSON-Format):
1. "logical": Datenbasiert, ruhig, strukturiert (perfekt für 'C' und 'S' Typen)
2. "emotional": Story-basiert, empathisch, persönlich (perfekt für 'I' und 'S' Typen)
3. "provocative": Challenger-Sale, direkte Frage, provokant (perfekt für 'D' Typen)

Regeln:
- Keine Präfixe wie "Hier ist ein Script:"
- Direkt kopierfertig, als ob du es direkt sendest
- Maximal 150 Wörter pro Variante
- Nutze die Firmenwahrheit als Faktenbasis
- Personalisiere auf ${leadName || "den Lead"} und ${disgType || "seinen Typ"}
- Antwort auf Deutsch (außer explizit anders gewünscht)

Antworte NUR mit valides JSON, keine zusätzlichen Erklärungen:
{
  "logical": "...",
  "emotional": "...",
  "provocative": "..."
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Generiere 3 Antwort-Strategien für den Einwand: "${objectionKey}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("No content from OpenAI");
  }

  // Parse JSON response (handle potential markdown code blocks)
  let parsed: ObjectionResponse;
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON, using raw content:", e);
    // Fallback: Split content into three parts if JSON parsing fails
    const parts = content.split(/\n\n/);
    parsed = {
      logical: parts[0]?.replace(/^.*?:/, "").trim() || companyTruth,
      emotional: parts[1]?.replace(/^.*?:/, "").trim() || companyTruth,
      provocative: parts[2]?.replace(/^.*?:/, "").trim() || companyTruth,
    };
  }

  return parsed;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // CORS Headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Parse request
    const body: SolveObjectionRequest = await req.json();
    const { objection_key, lead_id, user_id } = body;

    if (!objection_key || !lead_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: objection_key, lead_id, user_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step A: Fetch Context
    const leadProfile = await fetchLeadProfile(supabase, lead_id);

    if (!leadProfile) {
      return new Response(
        JSON.stringify({ error: "Lead profile not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get user's company_id from profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user_id)
      .single();

    const companyId = userProfile?.company_id || null;

    // Fetch company truth via waterfall
    const companyContent = await fetchCompanyContent(
      supabase,
      objection_key,
      companyId,
      "de" // Default to German, can be made dynamic later
    );

    const companyTruth =
      companyContent?.payload?.script ||
      companyContent?.payload?.title ||
      companyContent?.payload?.ai_hints ||
      "Keine spezifische Firmenwahrheit verfügbar. Nutze allgemeine Vertriebsprinzipien.";

    // Step B: AI Generation
    const responses = await generateObjectionResponses(
      leadProfile.name || "Lead",
      leadProfile.disg_type,
      companyTruth,
      objection_key
    );

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        objection_key,
        lead_name: leadProfile.name,
        disg_type: leadProfile.disg_type,
        responses,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in solve-objection:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

