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
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro-latest";

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
    
    const action = typeof body.action === "string" ? body.action.trim() : "chat";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history : [];
    const requestedModule = typeof body.module === "string" ? body.module.trim().toLowerCase() : "";
    const engine = typeof body.engine === "string" ? body.engine.trim().toLowerCase() : "claude";
    const extra = isPlainObject(body.extra) ? body.extra : {};

    if (!message && action !== "analyze_lead_context") {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: "Die Nachricht darf nicht leer sein." }),
      };
    }

    const module = (requestedModule && MODULE_INSTRUCTIONS[requestedModule] ? requestedModule : null) ||
      ACTION_MODULE_MAP[action] || "general_sales";

    const leads = []; // Supabase lead loading can be added later
    const systemPrompt = buildSystemPrompt(leads);
    const userPrompt = buildUserPrompt({ module, message: message || "Analysiere diesen Lead.", leads, extra });

    const { reply, engineUsed } = await dispatchToEngine({
      engine,
      systemPrompt,
      history,
      userPrompt,
    });

    return {
      statusCode: 200,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reply,
        module,
        engine: engineUsed,
        leadContext: leads,
      }),
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
