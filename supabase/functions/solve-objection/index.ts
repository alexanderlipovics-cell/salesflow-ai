// ═══════════════════════════════════════════════════════════════════════════
// SALES FLOW AI - EINWAND-KILLER EDGE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════
// 
// Real-time Negotiation Coach that generates 3 distinct response strategies
// based on Company's approved content + Lead's DISG profile
// 
// Input: objection_key, lead_id, user_id
// Output: { logical, emotional, provocative } scripts
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface RequestBody {
  objection_key: string;
  lead_id: string;
  user_id: string;
}

interface LeadProfile {
  name: string;
  disg_type: string | null;
  company_id: string | null;
}

interface CompanyContent {
  title: string;
  script: string;
  ai_hints: string[];
  tone?: string;
}

interface ResponseStrategies {
  logical: string;
  emotional: string;
  provocative: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Parse request
    const { objection_key, lead_id, user_id }: RequestBody = await req.json();

    if (!objection_key || !lead_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: objection_key, lead_id, user_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ────────────────────────────────────────────
    // STEP A: FETCH CONTEXT
    // ────────────────────────────────────────────

    // Get Lead's Name and DISG Profile
    const { data: leadProfile, error: leadError } = await supabase
      .from("lead_profiles")
      .select("name, disg_type, company_id")
      .eq("id", lead_id)
      .single();

    if (leadError || !leadProfile) {
      return new Response(
        JSON.stringify({ error: "Lead not found", details: leadError?.message }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const lead: LeadProfile = {
      name: leadProfile.name || "der Lead",
      disg_type: leadProfile.disg_type,
      company_id: leadProfile.company_id,
    };

    // Get approved Company Truth for this objection
    const { data: contentDataArray, error: contentError } = await supabase
      .rpc("get_optimized_content", {
        p_category: "objection",
        p_language: "de",
        p_region: null,
      });

    // Find the specific objection key
    const contentData = contentDataArray?.find(
      (item: any) => item.key_identifier === objection_key
    );

    let companyContent: CompanyContent = {
      title: "Einwand",
      script: "Keine spezifische Antwort verfügbar.",
      ai_hints: [],
    };

    if (!contentError && contentData?.payload) {
      const payload = contentData.payload as any;
      companyContent = {
        title: payload.title || companyContent.title,
        script: payload.script || companyContent.script,
        ai_hints: payload.ai_hints || [],
        tone: payload.tone,
      };
    }

    // ────────────────────────────────────────────
    // STEP B: AI GENERATION (GPT-4o-mini)
    // ────────────────────────────────────────────

    const systemPrompt = `Du bist ein Weltklasse MLM-Verkaufstrainer. Konvertiere die rohen Firmen-Fakten in 3 spezifische Scripts für ${lead.name}, der ein ${lead.disg_type || "unbekannter"} Persönlichkeitstyp ist.

Firmen-Fakten:
Titel: ${companyContent.title}
Basis-Text: ${companyContent.script}
Wichtige Punkte: ${companyContent.ai_hints.join(", ")}

Generiere 3 verschiedene Ansätze:
1. LOGICAL: Datenbasiert, ruhig, für 'C' (Conscientious) Typen
2. EMOTIONAL: Geschichten-basiert, empathisch, für 'I' (Influencer) und 'S' (Steady) Typen
3. PROVOCATIVE: Challenger-Sale, direkte Frage, für 'D' (Dominant) Typen

WICHTIG:
- Nutze NUR die Fakten aus den Firmen-Fakten
- Keine erfundenen Preise, Zahlen oder Behauptungen
- Jede Antwort muss copy-paste ready sein (keine "Hier ist ein Script:" Präfixe)
- Maximal 150 Wörter pro Antwort
- Personalisiere für ${lead.name} und den ${lead.disg_type || "unbekannten"} Typ`;

    const userPrompt = `Einwand-Schlüssel: ${objection_key}
Lead: ${lead.name} (${lead.disg_type || "unbekannter Typ"})
Firmen-Fakten: ${companyContent.script}`;

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API Error:", errorText);
      
      // Fallback to raw company content
      return new Response(
        JSON.stringify({
          logical: companyContent.script,
          emotional: companyContent.script,
          provocative: companyContent.script,
          fallback: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiContent = JSON.parse(openaiData.choices[0].message.content);

    const strategies: ResponseStrategies = {
      logical: aiContent.logical || companyContent.script,
      emotional: aiContent.emotional || companyContent.script,
      provocative: aiContent.provocative || companyContent.script,
    };

    // ────────────────────────────────────────────
    // RETURN RESPONSE
    // ────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        ...strategies,
        lead_name: lead.name,
        disg_type: lead.disg_type,
        objection_key,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );

  } catch (error) {
    console.error("Error in solve-objection:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});

