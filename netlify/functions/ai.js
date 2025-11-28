const { getSupabase } = require("./supabaseClient");

// KI-Cloud-Bridge: enriches every AI response with Supabase lead context.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

const BASE_PROMPT = [
  "Du bist Sales Flow AI, ein Revenue-Coach.",
  "Antworte strukturiert, fokussiert auf nächste Schritte, Taktiken und klare Handlungsempfehlungen.",
  "Nutze vorhandenen Lead-Kontext, um Follow-ups zu personalisieren und konkrete Empfehlungen abzuleiten.",
  "Falls kein Kontext vorliegt, erkläre knapp welche Infos fehlen.",
].join("\n");

const LEAD_COLUMNS = [
  "id",
  "name",
  "status",
  "branche",
  "disg_type",
  "deal_value",
  "last_contact_at",
  "tags",
];

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

function createLeadLoadError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function baseLeadQuery(client, userId) {
  let query = client
    .from("leads")
    .select(LEAD_COLUMNS.join(","), { head: false })
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  return query;
}

async function executeLeadQuery(query) {
  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Supabase error:", error);
    throw createLeadLoadError("Konnte Lead-Daten nicht abrufen.");
  }

  return data;
}

/**
 * KI-Cloud-Bridge helper: loads the relevant lead from Supabase once per request.
 */
async function loadLeadContext(userId, leadIdOrName) {
  if (!leadIdOrName) return null;

  const supabase = getSupabase();
  if (!supabase) {
    throw createLeadLoadError(
      "Supabase ist nicht konfiguriert. Bitte SUPABASE_URL und Key setzen."
    );
  }

  const lookupValue = String(leadIdOrName).trim();
  const scopedUserId = userId ? String(userId).trim() : null;

  if (!lookupValue) return null;

  const byIdQuery = baseLeadQuery(supabase, scopedUserId).eq(
    "id",
    lookupValue
  );

  let data = await executeLeadQuery(byIdQuery);

  if (!data) {
    const nameSearch = lookupValue.includes("%")
      ? lookupValue
      : `%${lookupValue}%`;
    const byNameQuery = baseLeadQuery(supabase, scopedUserId).ilike(
      "name",
      nameSearch
    );
    data = await executeLeadQuery(byNameQuery);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    status: data.status || null,
    branche: data.branche || null,
    disg_type: data.disg_type || null,
    deal_value: data.deal_value || null,
    last_contact_at: data.last_contact_at || null,
    tags: Array.isArray(data.tags)
      ? data.tags.filter(Boolean)
      : data.tags
      ? [data.tags]
      : [],
  };
}

function buildLeadSnippet(leadContext) {
  if (!leadContext) {
    return "\nAKTUELLER LEAD: unbekannt (kein Kontext gefunden)\n";
  }

  const tagList = leadContext.tags?.length
    ? leadContext.tags.join(", ")
    : "-";

  return `\nAKTUELLER LEAD:\nName: ${leadContext.name || "-"}\nStatus: ${
    leadContext.status || "-"
  }\nBranche: ${leadContext.branche || "-"}\nDISG: ${
    leadContext.disg_type || "-"
  }\nDeal-Wert: ${leadContext.deal_value || "-"}\nLetzter Kontakt: ${
    leadContext.last_contact_at || "-"
  }\nTags: ${tagList}\n`;
}

function buildSystemPrompt(leadContext) {
  const leadSnippet = buildLeadSnippet(leadContext);
  return `${BASE_PROMPT}${leadSnippet}`;
}

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
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: "Nur POST wird unterstützt." }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: "Ungültiger JSON-Body." }),
      };
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
    const leadName =
      typeof body.leadName === "string" ? body.leadName.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!message) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: "Die Nachricht darf nicht leer sein." }),
      };
    }

    const leadLookup = leadId || leadName;
    let leadContext = null;

    if (leadLookup) {
      leadContext = await loadLeadContext(userId, leadLookup);
    }

    const systemPrompt = buildSystemPrompt(leadContext);

    const reply = await callClaude({
      systemPrompt,
      history,
      message,
    });

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reply,
        leadContext,
      }),
    };
  } catch (error) {
    console.error("AI function error:", error);
    const statusCode = error.statusCode || 500;
    return {
      statusCode,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        error: "AI bridge error",
        details: error.message || "Interner Serverfehler.",
      }),
    };
  }
};
