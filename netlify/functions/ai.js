const { createClient } = require("@supabase/supabase-js");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

const getFetch = (() => {
  let cached = null;
  return async () => {
    if (cached) return cached;
    if (typeof fetch === "function") {
      cached = fetch.bind(globalThis);
      return cached;
    }
    const dynamic = await import("node-fetch");
    cached = dynamic.default || dynamic;
    return cached;
  };
})();

const sanitizeLeadReference = (lead) => {
  if (!lead || typeof lead !== "object") return null;
  const reference = {};

  if (lead.id && String(lead.id).trim()) {
    reference.id = String(lead.id).trim();
  }
  if (lead.name && String(lead.name).trim()) {
    reference.name = String(lead.name).trim();
  }

  if (!reference.id && !reference.name) {
    return null;
  }
  return reference;
};

const fetchLeadContext = async (leadReference) => {
  if (!supabase || !leadReference) return null;

  let query = supabase
    .from("leads")
    .select("id,name,status,disg,notes,last_contact", { head: false })
    .limit(1);

  if (leadReference.id) {
    query = query.eq("id", leadReference.id);
  } else if (leadReference.name) {
    query = query.ilike("name", `%${leadReference.name}%`);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    throw new Error("Konnte Lead-Daten nicht abrufen.");
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    status: data.status || "unbekannt",
    disg: data.disg || null,
    notes: data.notes || "",
    last_contact: data.last_contact || null,
  };
};

const buildSystemPrompt = (leadContext, missingLead) => {
  const sections = [
    "Du bist Sales Flow AI, ein Revenue-Coach. Antworte strukturiert, fokussiert auf nächste Schritte, knappe Taktiken und klare Handlungsempfehlungen.",
  ];

  if (leadContext) {
    sections.push(
      [
        "Du hast die Lead-Datenbank abgerufen. Erstelle eine Strategie für diesen Lead basierend auf seinen Daten.",
        "Lead-Kontext (JSON):",
        JSON.stringify(leadContext, null, 2),
      ].join("\n")
    );
  } else if (missingLead) {
    sections.push(
      "Du konntest keinen passenden Lead im CRM finden. Bitte den User konkret nach Name oder ID und erkläre, welche Formate unterstützt werden (z. B. @Name oder #lead:123)."
    );
  } else {
    sections.push(
      "Es wurde kein Lead-Kontext angefordert. Antworte allgemein, doch erinnere den User daran, dass er mit @Name oder #lead:ID gezielt Leads analysieren kann."
    );
  }

  return sections.join("\n\n");
};

const buildClaudeMessages = (history = [], currentMessage = "") => {
  const safeHistory = Array.isArray(history) ? history : [];

  const formatted = safeHistory
    .filter((entry) => entry && entry.role && entry.content)
    .map((entry) => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: [{ type: "text", text: String(entry.content) }],
    }));

  formatted.push({
    role: "user",
    content: [{ type: "text", text: String(currentMessage) }],
  });

  return formatted;
};

const callClaude = async ({ systemPrompt, history, message }) => {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY fehlt. Bitte in den Environment Variablen setzen."
    );
  }

  const fetcher = await getFetch();
  const response = await fetcher("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      temperature: 0.2,
      system: systemPrompt,
      messages: buildClaudeMessages(history, message),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Claude API error:", response.status, errorBody);
    throw new Error("Claude API konnte nicht erreicht werden.");
  }

  const payload = await response.json();
  const content = payload.content || [];
  const reply = content
    .map((part) => (part.text ? part.text : ""))
    .join("\n")
    .trim();

  return reply || "Ich konnte gerade keine Antwort generieren.";
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Nur POST wird unterstützt." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const action = body.action || "chat";
    const message = (body.message || "").trim();
    const history = body.history || [];
    const leadReference = sanitizeLeadReference(body.lead);

    if (!message) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Die Nachricht darf nicht leer sein." }),
      };
    }

    if (action === "analyze_lead_context" && !leadReference) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "Für analyze_lead_context benötigst du eine Lead-ID oder einen Namen.",
        }),
      };
    }

    let leadContext = null;
    const shouldLoadLead = Boolean(leadReference);

    if (shouldLoadLead && !supabase) {
      throw new Error(
        "Supabase ist nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen."
      );
    }

    if (shouldLoadLead) {
      leadContext = await fetchLeadContext(leadReference);
    }

    const systemPrompt = buildSystemPrompt(
      leadContext,
      action === "analyze_lead_context" && !leadContext
    );

    const reply = await callClaude({
      systemPrompt,
      history,
      message,
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        reply,
        leadContext,
      }),
    };
  } catch (error) {
    console.error("AI function error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message || "Interner Serverfehler." }),
    };
  }
};
