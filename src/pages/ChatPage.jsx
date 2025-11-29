import clsx from "clsx";
import { useMemo, useState } from "react";
import { ArrowUpRight, Loader, Sparkles } from "lucide-react";

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sampleMessages = [
  {
    id: "m1",
    role: "assistant",
    author: "Sales Flow AI",
    content:
      "Hi Lena! Ich habe deine letzten Sales Touchpoints gescannt. Willst du Maximilian ein Update zu seinem POC schicken?",
  },
  {
    id: "m2",
    role: "user",
    author: "Du",
    content:
      "Ja, bitte. Er wartet auf das neue Integrations-Video. Frag ihn auch, ob Dienstag 14 Uhr passt.",
  },
  {
    id: "m3",
    role: "assistant",
    author: "Sales Flow AI",
    content:
      "Verstanden. Ich formuliere eine Message im Tonfall 'direkt & freundlich'. Ready?",
  },
];

const ENGINE_OPTIONS = [
  { value: "claude", label: "Claude 3.5 Sonnet" },
  { value: "gpt", label: "OpenAI GPT-4o" },
  { value: "gemini", label: "Google Gemini 1.5" },
];

const MODULE_OPTIONS = [
  {
    value: "general_sales",
    label: "Sales Operator",
    helper: "Fokussiert auf allgemeine Sales-Taktiken",
  },
  {
    value: "einwand_killer",
    label: "Einwand-Killer",
    helper: "3 Antwort-Varianten auf Einwände",
  },
  {
    value: "deal_medic",
    label: "Deal Medic",
    helper: "Analysiert BANT & nächste Schritte",
  },
  {
    value: "speed_hunter_loop",
    label: "Speed-Hunter Loop",
    helper: "Findet nächste heiße Leads",
  },
  {
    value: "screenshot_reactivator",
    label: "Screenshot-Reactivator",
    helper: "Reaktiviert Kontakte aus Listen",
  },
];

const mapHistory = (history = []) =>
  history.map((entry) => ({
    role: entry.role === "assistant" ? "assistant" : "user",
    content: entry.content,
  }));

const formatActionResult = (actionResult) => {
  if (!actionResult || !actionResult.result) return null;
  const snapshot = actionResult.result;

  if (Array.isArray(snapshot.leads) && snapshot.leads.length) {
    return snapshot.leads
      .map((lead, index) => {
        const label = lead.name || lead.company || `Lead ${index + 1}`;
        const status = lead.status ? ` · ${lead.status}` : "";
        const next =
          lead.next_action_description || lead.next_action_at
            ? `\n→ ${lead.next_action_description || lead.next_action_at}`
            : "";
        return `${label}${status}${next}`.trim();
      })
      .join("\n\n");
  }

  return JSON.stringify(snapshot, null, 2);
};

const leads = [
  { label: "Name", value: "Maximilian Vogt" },
  { label: "Firma", value: "Nexora Energy" },
  { label: "Status", value: "Needs Action · Demo vereinbaren" },
  { label: "Deal Value", value: "€38.500" },
  { label: "Letzte Aktion", value: "Discovery Call · 26. Nov" },
];

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [engine, setEngine] = useState("claude");
  const [module, setModule] = useState("general_sales");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const timeline = useMemo(
    () => [
      { id: 1, title: "Warm-Up Step · LinkedIn", time: "Heute · 08:42" },
      { id: 2, title: "Speed-Hunter Batch 12", time: "Gestern · 17:05" },
      { id: 3, title: "Phoenix Restart", time: "24. Nov · 09:18" },
    ],
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setErrorMessage(null);

    if (!draft.trim() || isSending) return;

    setIsSending(true);
    const userMessage = {
      id: createId(),
      role: "user",
      author: "Du",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    const historyPayload = mapHistory([...messages, userMessage]);

    try {
      const response = await fetch("/.netlify/functions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          engine,
          module,
          history: historyPayload,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || data?.details || "AI Service nicht erreichbar.");
      }

      const actionResult = data?.type === "action_result" ? data : null;
      const reply =
        data?.reply ||
        actionResult?.description ||
        actionResult?.result?.followup_text ||
        "Ich konnte keine Antwort generieren.";

      const engineLabel =
        ENGINE_OPTIONS.find((option) => option.value === (data?.engine || engine))?.label ||
        "Sales Flow AI";

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        author: engineLabel,
        content: reply,
        actionResult,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const fallback = error?.message || "Nachricht konnte nicht gesendet werden.";
      setErrorMessage(fallback);
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "system",
          author: "System",
          content: fallback,
          variant: "error",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.5em] text-gray-500">
          Playground
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-semibold text-white">
            Sales Flow AI · Chat
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full border border-salesflow-accent/40 px-3 py-1 text-xs font-semibold text-salesflow-accent">
            <Sparkles className="h-4 w-4" />
            Live Co-Pilot
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Unterhalte dich mit Sales Flow AI, greife auf Lead-Kontext zu und triggere
          Tools wie Speed-Hunter, Phoenix oder den CSV-Import ohne den Flow zu
          verlassen.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-gray-950/70 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                Konversation
              </p>
              <p className="text-lg font-semibold text-white">
                Follow-up für Maximilian
              </p>
            </div>
            <button className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white">
              Verlauf exportieren
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {messages.map((message) => (
              <article
                key={message.id}
                className={clsx(
                  "max-w-3xl rounded-2xl border px-5 py-4",
                  message.role === "assistant" && "border-salesflow-accent/30 bg-salesflow-accent/5 text-white",
                  message.role === "user" && "border-white/10 bg-white/5 text-gray-100",
                  message.role === "system" &&
                    "border-red-400/40 bg-red-500/10 text-red-100 backdrop-blur"
                )}
              >
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                  {message.author}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                  {message.content}
                </p>
                {message.actionResult && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-gray-500">
                      {message.actionResult.name || message.actionResult.action}
                    </p>
                    <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-gray-200">
                      {formatActionResult(message.actionResult)}
                    </pre>
                  </div>
                )}
              </article>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label
              htmlFor="chat-input"
              className="text-xs uppercase tracking-[0.4em] text-gray-500"
            >
              Anfrage formulieren
            </label>
            <textarea
              id="chat-input"
              rows={3}
              placeholder="Frag nach einer personalisierten Nachricht, einer Angebots-Zusammenfassung oder einer Phoenix Sequenz …"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-salesflow-accent/50"
            />
            <div className="grid gap-3 text-xs text-gray-300 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="tracking-[0.3em] text-gray-500">AI Engine</span>
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                  value={engine}
                  onChange={(event) => setEngine(event.target.value)}
                >
                  {ENGINE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="tracking-[0.3em] text-gray-500">Modus</span>
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                  value={module}
                  onChange={(event) => setModule(event.target.value)}
                >
                  {MODULE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {module !== "general_sales" && (
              <p className="text-xs text-gray-500">
                {
                  MODULE_OPTIONS.find((option) => option.value === module)?.helper ??
                  "Sales Flow AI wählt automatisch den passenden Modus."
                }
              </p>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                {errorMessage}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Sales Flow AI nutzt automatisch den Lead-Kontext & dein Daily Command.
              </p>
              <button
                type="submit"
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-5 py-2 text-sm font-semibold text-black shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Sendet …
                  </>
                ) : (
                  <>
                    Nachricht senden
                    <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <ContextPanel title="Lead-Kontext" hint="Auto-sync aus Supabase">
            <dl className="space-y-3 text-sm text-gray-300">
              {leads.map((entry) => (
                <div key={entry.label}>
                  <dt className="text-xs uppercase tracking-[0.4em] text-gray-500">
                    {entry.label}
                  </dt>
                  <dd className="text-base text-white">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </ContextPanel>

          <ContextPanel title="Bestandskunden importieren" hint="CSV · 2 Klicks">
            <p className="text-sm text-gray-400">
              Lade eine CSV-Datei hoch oder fotografiere Verträge – Screenshot AI extrahiert
              die Daten und enrichiert sie mit Speed-Hunter.
            </p>
            <button className="mt-4 w-full rounded-2xl border border-dashed border-white/20 px-4 py-3 text-sm text-white hover:border-salesflow-accent/40">
              CSV auswählen
            </button>
          </ContextPanel>

          <ContextPanel title="Aktive Sequenzen" hint="Phoenix & Speed-Hunter">
            <ul className="space-y-3 text-sm text-gray-300">
              {timeline.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </li>
              ))}
            </ul>
          </ContextPanel>
        </aside>
      </div>
    </div>
  );
};

const ContextPanel = ({ title, hint, children }) => (
  <section className="rounded-3xl border border-white/10 bg-gray-950/50 p-5 shadow-inner shadow-black/30">
    <header className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">{hint}</p>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
    </header>
    <div className="mt-4 space-y-4">{children}</div>
  </section>
);

export default ChatPage;
