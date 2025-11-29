/**
 * Sales Flow AI – Netlify Bridge
 * ----------------------------------
 * - Führt Chat-Anfragen an Claude/OpenAI/Gemini aus
 * - Bietet strukturierte Actions (Lead-Listen, Follow-ups) mit Supabase-Zugriff
 * - Liefert bei Bedarf Debug-Informationen über ausgeführte Queries
 */

import { getSupabase } from "./supabaseClient.js";

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
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro-latest";
const SUPABASE_TABLE = "leads";

const SALESFLOW_SYSTEM_PROMPT = `
Du bist SALES FLOW AI, ein spezialisierter Vertriebs-Assistent.

DEIN JOB:
- Du hilfst beim Finden, Strukturieren und Abschließen von Deals.
- Du arbeitest IMMER in klaren, kurzen, direkt einfügbaren Texten.
- Du stellst so wenig Rückfragen wie möglich und triffst sinnvolle Entscheidungen.

MODULE:
1) EINWAND-KILLER - Liefere 3 Antwort-Varianten: logisch, emotional, provokant.
2) DEAL-MEDIC - Analysiere Budget/Authority/Need/Timing, gib Urteil + Empfehlung.
3) SPEED-HUNTER LOOP - Nenne den nächsten besten Lead mit fertiger Nachricht.
4) SCREENSHOT-REACTIVATOR - Reaktiviere alte Kontakte aus Listen/Screenshots.

WICHTIG:
- Wenn ein bestimmtes Modul gefordert ist, fokussiere dich darauf.
- Wenn kein Modul explizit genannt ist, wähle das naheliegendste auf Basis der Aufgabe.
- Antworte auf Deutsch, klar und actionable.
`;

const MODULE_INSTRUCTIONS = {
  general_sales: "Du bist der allgemeine Sales-Operator. Analysiere Leads, erkenne Chancen und antworte mit einem konkreten nächsten Schritt + Nachrichtentext.",
  einwand_killer: "Modus: EINWAND-KILLER. Liefere exakt drei Antwortvarianten (Logisch / Emotional / Provokant) und bleibe respektvoll.",
  speed_hunter_loop: "Modus: SPEED-HUNTER LOOP. Nenne den nächsten besten Lead, gib eine fertige Nachricht und einen klaren Call-to-Action.",
  deal_medic: "Modus: DEAL-MEDIC. Analysiere Budget/Authority/Need/Timing, gib Urteil (stark/mittel/schwach) + konkrete Empfehlung.",
  screenshot_reactivator: "Modus: SCREENSHOT-REACTIVATOR. Reaktiviere alte Kontakte, sortiere nach Potenzial und formuliere Follow-up-Vorschläge.",
};

const ACTION_MODULE_MAP = {
  analyze_lead_context: "deal_medic",
};

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

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const buildSystemPrompt = (leads = []) => {
  let prompt = SALESFLOW_SYSTEM_PROMPT.trim();
  
  if (Array.isArray(leads) && leads.length) {
    const leadInfo = leads.map((lead, i) => {
      const parts = [`${i + 1}) ${lead.name || `Lead #${lead.id || "n/a"}`}`];
      if (lead.status) parts.push(`Status: ${lead.status}`);
      if (lead.value) parts.push(`Deal: ${lead.value}`);
      return parts.join(" · ");
    }).join("\n");
    
    prompt += `\n\nLEAD-KONTEXT:\n${leadInfo}`;
  }
  
  return prompt;
};

const buildUserPrompt = ({ module, message, leads, extra }) => {
  const moduleInstruction = MODULE_INSTRUCTIONS[module] || MODULE_INSTRUCTIONS.general_sales;
  
  const parts = [moduleInstruction];
  
  if (Array.isArray(leads) && leads.length) {
    parts.push(`Leads im Fokus: ${leads.map(l => l.name || l.id).join(", ")}`);
  }
  
  parts.push("Nutzeranfrage:", message);
  
  if (extra && Object.keys(extra).length) {
    parts.push(`Zusatzkontext: ${JSON.stringify(extra).slice(0, 500)}`);
  }
  
  return parts.filter(Boolean).join("\n\n");
};

const normalizeHistory = (history = []) => {
  if (!Array.isArray(history)) return [];
  return history
    .map((entry) => {
      if (!entry || !entry.content) return null;
      const role = entry.role === "assistant" ? "assistant" : "user";
      return { role, content: String(entry.content) };
    })
    .filter(Boolean);
};

const buildClaudeMessages = (history = [], userPrompt = "") => {
  const safeHistory = normalizeHistory(history);

  const formatted = safeHistory.map((entry) => ({
    role: entry.role === "assistant" ? "assistant" : "user",
    content: [{ type: "text", text: String(entry.content) }],
  }));

  formatted.push({
    role: "user",
    content: [{ type: "text", text: String(userPrompt) }],
  });

  return formatted;
};

const callClaude = async ({ systemPrompt, history, userPrompt }) => {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY fehlt. Bitte in den Environment Variablen setzen.");
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
      messages: buildClaudeMessages(history, userPrompt),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Claude API error:", response.status, errorBody);
    throw new Error("Claude API konnte nicht erreicht werden.");
  }

  const payload = await response.json();
  const content = payload.content || [];
  const reply = content.map((part) => (part.text ? part.text : "")).join("\n").trim();

  return reply || "Ich konnte gerade keine Antwort generieren.";
};

const callOpenAI = async ({ systemPrompt, history, userPrompt }) => {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY fehlt. Bitte konfigurieren.");
  }

  const fetcher = await getFetch();
  const normalizedHistory = normalizeHistory(history);
  const messages = [
    { role: "system", content: systemPrompt },
    ...normalizedHistory.map((entry) => ({ role: entry.role, content: entry.content })),
    { role: "user", content: userPrompt },
  ];

  const response = await fetcher("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 800,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenAI API error:", response.status, errorBody);
    throw new Error("OpenAI API konnte nicht erreicht werden.");
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content?.trim() || "Ich konnte gerade keine Antwort generieren.";
};

const callGemini = async ({ systemPrompt, history, userPrompt }) => {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY/GOOGLE_API_KEY fehlt. Bitte konfigurieren.");
  }

  const fetcher = await getFetch();
  const normalized = normalizeHistory(history);
  const contents = normalized.map((entry) => ({
    role: entry.role === "assistant" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));
  contents.push({ role: "user", parts: [{ text: userPrompt }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.25, maxOutputTokens: 800 },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini API error:", response.status, errorBody);
    throw new Error("Gemini API konnte nicht erreicht werden.");
  }

  const payload = await response.json();
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim() || "Ich konnte gerade keine Antwort generieren.";
};

const ENGINE_ALIASES = {
  claude: "claude",
  anthropic: "claude",
  gpt: "gpt",
  openai: "gpt",
  gemini: "gemini",
  google: "gemini",
};

const dispatchToEngine = async ({ engine, systemPrompt, history, userPrompt }) => {
  const normalized = ENGINE_ALIASES[engine] || "claude";

  if (normalized === "gpt" && OPENAI_API_KEY) {
    return { reply: await callOpenAI({ systemPrompt, history, userPrompt }), engineUsed: "gpt" };
  }

  if (normalized === "gemini" && GEMINI_API_KEY) {
    return { reply: await callGemini({ systemPrompt, history, userPrompt }), engineUsed: "gemini" };
  }

  return { reply: await callClaude({ systemPrompt, history, userPrompt }), engineUsed: "claude" };
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
};

const getCurrentWeekRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const day = start.getUTCDay() || 7; // Montag = 1, Sonntag = 7
  start.setUTCDate(start.getUTCDate() - (day - 1));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
};

const ensureSupabaseClient = () => {
  const client = getSupabase();
  if (!client) {
    const error = new Error("Supabase ist nicht konfiguriert.");
    error.statusCode = 500;
    throw error;
  }
  return client;
};

const handleSupabaseError = (error, label = "Supabase-Query") => {
  console.error(`${label} failed:`, error);
  const err = new Error(`${label} fehlgeschlagen.`);
  err.statusCode = 502;
  throw err;
};

const SELECT_LEAD_FIELDS =
  "id,name,email,company,status,last_contact,next_action_at,next_action_description,needs_action,notes";

const loadLeadsForContext = async ({ leadIds = [], logDebug }) => {
  if (!Array.isArray(leadIds) || !leadIds.length) return [];
  const supabase = getSupabase();
  if (!supabase) {
    logDebug("load_leads_for_context", { skipped: "supabase_missing" });
    return [];
  }
  const ids = leadIds.slice(0, 5);
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select("id,name,status,company,deal_value")
    .in("id", ids);
  if (error) {
    logDebug("load_leads_for_context_error", { message: error.message });
    return [];
  }
  const mapped = (data || []).map((lead) => ({
    id: lead.id,
    name: lead.name,
    status: lead.status,
    company: lead.company,
    value: lead.deal_value,
  }));
  logDebug("load_leads_for_context", { ids, count: mapped.length });
  return mapped;
};

const findLeadByIdentifier = async ({ supabase, leadId, leadName, logDebug }) => {
  if (!leadId && !leadName) {
    const err = new Error("Bitte lead_id oder lead_name angeben.");
    err.statusCode = 400;
    throw err;
  }

  if (leadId) {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select(SELECT_LEAD_FIELDS)
      .eq("id", leadId)
      .maybeSingle();
    if (error) handleSupabaseError(error, "Lead-Suche per ID");
    if (!data) {
      const err = new Error("Kein Lead mit dieser ID gefunden.");
      err.statusCode = 404;
      throw err;
    }
    logDebug("find_lead_by_id", { leadId });
    return data;
  }

  const sanitizedName = leadName.trim();
  const baseQuery = () =>
    supabase
      .from(SUPABASE_TABLE)
      .select(SELECT_LEAD_FIELDS)
      .limit(1);

  let response = await baseQuery().ilike("name", sanitizedName);
  if (response.error) handleSupabaseError(response.error, "Lead-Suche per Name");

  if (!response.data?.length) {
    response = await baseQuery()
      .ilike("name", `%${sanitizedName}%`)
      .order("next_action_at", { ascending: true, nullsFirst: true });
    if (response.error) handleSupabaseError(response.error, "Lead-Suche per Name (Fallback)");
  }

  const lead = response.data?.[0];
  if (!lead) {
    const err = new Error("Kein Lead mit diesem Namen gefunden.");
    err.statusCode = 404;
    throw err;
  }

  logDebug("find_lead_by_name", { query: sanitizedName, leadId: lead.id });
  return lead;
};

const FOLLOWUP_SYSTEM_PROMPT = `
Du bist Sales Flow AI. Schreibe kurze, direkte Follow-up-Nachrichten auf Deutsch.
- Ton: locker, wertschätzend, klarer Call-to-Action.
- Nutze Status, letzte Aktivität und Notizen.
- Eine Nachricht mit 2–4 Sätzen, keine Floskeln wie "Ich hoffe es geht dir gut".
Gib nur den Nachrichtentext zurück.
`.trim();

const ACTION_DEFINITIONS = {
  list_hot_leads_this_week: {
    name: "Hot-Leads dieser Woche",
    description: "Listet alle Leads mit Status hot, deren Follow-up in die aktuelle Woche fällt.",
    expectedInput: "Optional: limit (max 50)",
    execute: async ({ supabase, input = {}, logDebug }) => {
      const limit = clampNumber(Number(input.limit), 1, 50, 25);
      const { start, end } = getCurrentWeekRange();
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select("id,name,company,status,next_action_at,next_action_description,last_contact")
        .in("status", ["hot", "HOT"])
        .gte("next_action_at", start.toISOString())
        .lte("next_action_at", end.toISOString())
        .order("next_action_at", { ascending: true })
        .limit(limit);
      if (error) handleSupabaseError(error, "Hot-Leads-Query");
      logDebug("list_hot_leads_this_week", {
        limit,
        range: { start: start.toISOString(), end: end.toISOString() },
        count: data?.length || 0,
      });
      return {
        leads: data || [],
        window: { start: start.toISOString(), end: end.toISOString() },
      };
    },
  },
  list_needs_action_leads: {
    name: "Needs-Action-Leads",
    description: "Zeigt Leads ohne aktuellen Kontakt oder überfällige Follow-ups.",
    expectedInput: "Optional: limit (max 100)",
    execute: async ({ supabase, input = {}, logDebug }) => {
      const limit = clampNumber(Number(input.limit), 1, 100, 50);
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select("id,name,email,company,status,last_contact,next_action_at,next_action_description")
        .eq("needs_action", true)
        .order("next_action_at", { ascending: true, nullsFirst: true })
        .limit(limit);
      if (error) handleSupabaseError(error, "Needs-Action-Query");
      logDebug("list_needs_action_leads", { limit, count: data?.length || 0 });
      return { leads: data || [] };
    },
  },
  generate_followup_for_lead: {
    name: "Follow-up erstellen",
    description: "Schreibt eine Follow-up-Nachricht für einen spezifischen Lead.",
    expectedInput: "{ lead_id?: string, lead_name?: string }",
    execute: async ({ supabase, input = {}, engine, logDebug }) => {
      const leadId = input.lead_id || input.leadId;
      const leadName = input.lead_name || input.leadName;
      const lead = await findLeadByIdentifier({ supabase, leadId, leadName, logDebug });

      const contextParts = [
        `Lead: ${lead.name || "Unbekannt"}`,
        lead.company ? `Unternehmen: ${lead.company}` : null,
        lead.status ? `Status: ${lead.status}` : null,
        lead.last_contact ? `Letzter Kontakt: ${lead.last_contact}` : null,
        lead.next_action_description ? `Nächste Aktion: ${lead.next_action_description}` : null,
        lead.notes ? `Notizen: ${String(lead.notes).slice(0, 400)}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const userPrompt = `${contextParts}\n\nAufgabe: Schreibe eine Follow-up-Nachricht mit direktem Vorschlag für den nächsten Schritt.`;

      const { reply, engineUsed } = await dispatchToEngine({
        engine,
        systemPrompt: FOLLOWUP_SYSTEM_PROMPT,
        history: [],
        userPrompt,
      });

      logDebug("generate_followup_for_lead", { leadId: lead.id, engineUsed });

      return {
        lead: {
          id: lead.id,
          name: lead.name,
          company: lead.company,
          status: lead.status,
          last_contact: lead.last_contact,
          next_action_at: lead.next_action_at,
          needs_action: lead.needs_action,
        },
        followup_text: reply,
        reasoning: `Generiert basierend auf Status ${lead.status || "unbekannt"}.`,
        engine: engineUsed,
      };
    },
  },
};

const parseJsonActionCommand = (text) => {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const payload = JSON.parse(trimmed);
    if (payload && typeof payload.action === "string") {
      return { name: payload.action, data: payload.data || payload.payload || {} };
    }
  } catch {
    return null;
  }
  return null;
};

const sanitizeName = (value = "") => value.replace(/[.,;!?]+$/, "").trim();

const detectActionFromMessage = (text) => {
  if (!text || typeof text !== "string") return null;
  const jsonAction = parseJsonActionCommand(text);
  if (jsonAction) return jsonAction;

  const lower = text.toLowerCase();
  if (lower.includes("hot") && lower.includes("lead") && (lower.includes("woche") || lower.includes("week"))) {
    return { name: "list_hot_leads_this_week", data: {} };
  }
  if (
    lower.includes("needs action") ||
    lower.includes("brauchen eine aktion") ||
    lower.includes("ohne kontakt") ||
    (lower.includes("überfällig") && lower.includes("lead"))
  ) {
    return { name: "list_needs_action_leads", data: {} };
  }

  const followMatch =
    text.match(/follow[-\s]?up\s*(?:an|für)?\s+([A-ZÄÖÜ][\wÄÖÜäöüß]+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß]+)?)/i) ||
    text.match(/schreib(?:e)?\s+(?:ein\s+)?follow[-\s]?up\s+an\s+([A-ZÄÖÜ][^\d,]+)/i);
  if (followMatch) {
    return {
      name: "generate_followup_for_lead",
      data: { lead_name: sanitizeName(followMatch[1]) },
    };
  }

  return null;
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: "Nur POST wird unterstützt." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const queryDebug = event.queryStringParameters?.debug === "true";
    const debugEnabled = queryDebug || Boolean(body.debug);
    const debugLog = [];
    const logDebug = (label, details = {}) => {
      if (!debugEnabled) return;
      debugLog.push({
        label,
        details,
        timestamp: new Date().toISOString(),
      });
    };

    const rawAction = typeof body.action === "string" ? body.action.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];
    const requestedModule = typeof body.module === "string" ? body.module.trim().toLowerCase() : "";
    const engine = typeof body.engine === "string" ? body.engine.trim().toLowerCase() : "claude";
    const extra = isPlainObject(body.extra) ? body.extra : {};
    const actionData = isPlainObject(body.data)
      ? body.data
      : isPlainObject(body.payload)
      ? body.payload
      : {};

    const explicitAction =
      rawAction && ACTION_DEFINITIONS[rawAction]
        ? { name: rawAction, data: actionData }
        : null;
    if (explicitAction) {
      logDebug("action_from_body", { action: explicitAction.name });
    }

    let detectedAction = null;
    if (!explicitAction) {
      detectedAction = detectActionFromMessage(message);
      if (detectedAction && !ACTION_DEFINITIONS[detectedAction.name]) {
        detectedAction = null;
      }
      if (detectedAction) {
        logDebug("action_detected", { action: detectedAction.name });
      }
    }

    const selectedAction = explicitAction || detectedAction;

    if (!message && !selectedAction) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: "Die Nachricht darf nicht leer sein." }),
      };
    }

    if (selectedAction) {
      const definition = ACTION_DEFINITIONS[selectedAction.name];
      const supabase = ensureSupabaseClient();
      const result = await definition.execute({
        supabase,
        input: selectedAction.data || {},
        engine,
        logDebug,
      });
      const responseBody = {
        type: "action_result",
        action: selectedAction.name,
        name: definition.name,
        description: definition.description,
        expectedInput: definition.expectedInput,
        result,
      };
      if (debugEnabled) responseBody.debug = debugLog;
      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify(responseBody),
      };
    }

    const actionForModule = rawAction || "chat";
    const module =
      (requestedModule && MODULE_INSTRUCTIONS[requestedModule] ? requestedModule : null) ||
      ACTION_MODULE_MAP[actionForModule] ||
      "general_sales";

    const leadIds = Array.isArray(body.leadIds)
      ? body.leadIds
      : Array.isArray(body.contextLeadIds)
      ? body.contextLeadIds
      : [];
    const normalizedLeadIds = leadIds.filter(Boolean).map((id) => String(id));
    const leads = await loadLeadsForContext({ leadIds: normalizedLeadIds, logDebug });

    const systemPrompt = buildSystemPrompt(leads);
    const userPrompt = buildUserPrompt({ module, message: message || "Analysiere diesen Lead.", leads, extra });

    const { reply, engineUsed } = await dispatchToEngine({
      engine,
      systemPrompt,
      history,
      userPrompt,
    });

    const responseBody = {
      reply,
      module,
      engine: engineUsed,
      leadContext: leads,
    };
    if (debugEnabled) responseBody.debug = debugLog;

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error("AI function error:", error);
    return {
      statusCode: error.statusCode || 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        error: "AI bridge error",
        details: error.message || "Interner Serverfehler.",
      }),
    };
  }
};
