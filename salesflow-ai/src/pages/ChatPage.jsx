import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, Loader2, Paperclip, Send, Sparkles, Upload, User } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const initialMessages = [
  {
    id: "sys",
    role: "assistant",
    content:
      "Hey! 👋 Ich bin dein Sales Flow Copilot. Was können wir heute in deiner Pipeline bewegen?",
  },
];

const quickActions = [
  "Lead analysieren",
  "Follow-up schreiben",
  "Einwand behandeln",
  "Abschluss-Strategie",
];

const defaultLeadContext = `{
  "name": "Sebastian Krüger",
  "company": "Flowmatic",
  "status": "Demo erledigt",
  "next_step": "Nach 3 Tagen follow-up",
  "notes": "Hat Budget für Q1 reserviert"
}`;

const leadFieldLabels = [
  { key: "name", label: "Name" },
  { key: "company", label: "Firma" },
  { key: "status", label: "Status" },
  { key: "next_step", label: "Nächster Schritt" },
  { key: "notes", label: "Notizen" },
];

const LeadContextSummary = ({ entries, hasError, onEdit, className = "" }) => {
  if (hasError) {
    return (
      <div
        className={clsx(
          "rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-50",
          className
        )}
      >
        <p>Der Lead-Kontext konnte nicht geladen werden. Bitte prüfe dein JSON.</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-rose-400/50 px-4 py-1.5 text-xs font-semibold text-rose-100 hover:border-rose-200/80"
          >
            JSON bearbeiten
          </button>
        )}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div
        className={clsx(
          "rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-300",
          className
        )}
      >
        <p>Noch keine Lead-Daten hinterlegt.</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
          >
            Lead-Kontext hinzufügen
          </button>
        )}
      </div>
    );
  }

  return (
    <dl className={clsx("space-y-3", className)}>
      {entries.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            {label}
          </dt>
          <dd className="mt-1 text-sm text-slate-100 whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const ChatPage = () => {
  // URL-Parameter für vorgefüllten Text (z.B. aus Follow-ups Seite)
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillText = searchParams.get("prefill") ?? "";
  const [prefillApplied, setPrefillApplied] = useState(false);

  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadContext, setLeadContext] = useState(defaultLeadContext);
  const [contextSaved, setContextSaved] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [contextPanel, setContextPanel] = useState("lead");
  const [isEditingLeadContext, setIsEditingLeadContext] = useState(false);

  // Ref für Auto-Scroll
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-Scroll zu neuesten Nachrichten
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Prefill-Text aus URL-Parameter anwenden
  useEffect(() => {
    if (prefillText && !prefillApplied) {
      setInput(prefillText);
      setPrefillApplied(true);
      // URL-Parameter entfernen, um bei Refresh nicht erneut zu setzen
      setSearchParams({}, { replace: true });
    }
  }, [prefillText, prefillApplied, setSearchParams]);

  const parsedLeadContext = useMemo(() => {
    try {
      return JSON.parse(leadContext || "{}");
    } catch (error) {
      console.error("Ungültiger Lead-Kontext", error);
      return null;
    }
  }, [leadContext]);

  const leadContextEntries = useMemo(() => {
    if (!parsedLeadContext || typeof parsedLeadContext !== "object") {
      return [];
    }

    const prioritized = leadFieldLabels
      .map(({ key, label }) => {
        const value = parsedLeadContext[key];
        if (value === undefined || value === null || value === "") return null;
        return {
          label,
          value:
            typeof value === "string" ? value : JSON.stringify(value, null, 2),
        };
      })
      .filter(Boolean);

    const additional = Object.entries(parsedLeadContext)
      .filter(([key, value]) => {
        if (value === undefined || value === null || value === "") return false;
        return !leadFieldLabels.some((field) => field.key === key);
      })
      .map(([key, value]) => ({
        label: key
          .split("_")
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(" "),
        value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      }));

    return [...prioritized, ...additional];
  }, [parsedLeadContext]);

  const handleSendMessage = async (event, customMessage = null) => {
    if (event) {
      event.preventDefault();
    }

    const messageText = customMessage || input.trim();
    if (!messageText) return;

    const humanMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, humanMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Baue History für Backend (nur content und role)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(`${API_BASE_URL}/chat/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: history,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);

      const reply = data?.reply;
      if (!reply) {
        throw new Error("No reply from backend");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (error) {
      console.error("Fehler beim Abrufen der AI-Antwort", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Ups, da ist was schiefgelaufen. Läuft das Backend? (Check: http://localhost:8000/health)",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    handleSendMessage(null, action);
  };

  const handleSaveContext = (event) => {
    event.preventDefault();
    setContextSaved(true);
    setTimeout(() => setContextSaved(false), 1800);
  };

  const handleImport = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const fileNames = fileList.map((file) => file.name).join(", ") || "Deine Dateien";

    setImportStatus(`${fileList.length} Datei(en) hinzugefügt · Analyse gestartet`);
    setMessages((prev) => [
      ...prev,
      {
        id: `import-${Date.now()}`,
        role: "user",
        content: `Import gestartet: ${fileNames}`,
      },
    ]);

    setTimeout(() => setImportStatus(null), 4000);
    event.target.value = "";
  };

  return (
    <main className="flex-1 bg-slate-950">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row">
        {/* HAUPTBEREICH - Chat */}
        <section className="flex flex-1 flex-col gap-4">
          {/* Header */}
          <header className="flex flex-col gap-3 border-b border-slate-800/80 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Sales Flow Brain
              </p>
              <h1 className="text-2xl font-bold text-slate-50">
                Chat Assistent
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Dein KI-Copilot für Vertriebsstrategie, Einwände & Follow-ups
              </p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400"
              title="Live-Modus: Antworten basieren auf deinen echten CRM-Daten."
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span>LIVE</span>
            </div>
          </header>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="rounded-full border border-slate-800/80 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:bg-slate-800/80 hover:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Chat-Nachrichten */}
          <div
            ref={messagesContainerRef}
            className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6"
            style={{ minHeight: "400px", maxHeight: "calc(100vh - 400px)" }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  "flex items-start gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {/* Avatar AI */}
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                {/* Nachricht Bubble */}
                <div
                  className={clsx(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "border border-slate-800 bg-slate-900/80 text-slate-100"
                  )}
                >
                  {message.content}
                </div>

                {/* Avatar User */}
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Tippt...</span>
                </div>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bereich */}
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage(event);
                  }
                }}
                rows={3}
                disabled={isLoading}
                placeholder="Frag nach einem Follow-up, einer Sequenz oder Einwandbehandlung..."
                className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
              />
              <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-slate-50">
                  <Paperclip className="h-4 w-4" />
                  <span>Anhang</span>
                  <input type="file" className="hidden" />
                </label>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sende..." : "Senden"}
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Tipp: Enter zum Senden, Shift+Enter für neue Zeile
            </p>
          </form>
        </section>

        {/* SIDEBAR - Kontext */}
        <aside className="w-full lg:w-96 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Kontext
                </p>
                <h2 className="text-lg font-semibold text-slate-50">
                  {contextPanel === "lead"
                    ? "Lead-Kontext"
                    : "Bestandskunden importieren"}
                </h2>
              </div>
              <div className="inline-flex gap-2 rounded-full bg-slate-900/60 p-1 text-xs font-semibold text-slate-400">
                {["lead", "import"].map((panel) => (
                  <button
                    key={panel}
                    type="button"
                    onClick={() => setContextPanel(panel)}
                    className={clsx(
                      "rounded-full px-3 py-1 transition",
                      contextPanel === panel
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-100"
                    )}
                  >
                    {panel === "lead" ? "Lead" : "Import"}
                  </button>
                ))}
              </div>
            </div>

            {contextPanel === "lead" ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Kontext für deinen Copilot. Name, Firma, Status & letzte Aktion.
                </p>
                <LeadContextSummary
                  entries={leadContextEntries}
                  hasError={!parsedLeadContext}
                  onEdit={() => setIsEditingLeadContext(true)}
                />

                {isEditingLeadContext ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      handleSaveContext(event);
                      setIsEditingLeadContext(false);
                    }}
                  >
                    <textarea
                      value={leadContext}
                      onChange={(event) => setLeadContext(event.target.value)}
                      className="h-48 w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 font-mono text-xs text-emerald-200 outline-none"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
                      >
                        Speichern
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingLeadContext(false)}
                        className="flex-1 rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingLeadContext(true)}
                    className="w-full rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white"
                  >
                    Lead-Kontext bearbeiten
                  </button>
                )}

                {contextSaved && (
                  <p className="text-center text-xs text-emerald-200">
                    ✓ Kontext gespeichert
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Lade CSV-Listen hoch. Sales Flow AI segmentiert automatisch.
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 px-4 py-8 text-sm text-slate-300 hover:border-emerald-500/40">
                  <Upload className="h-8 w-8 text-slate-400" />
                  <span>CSV oder XLSX ablegen</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
                {importStatus && (
                  <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                    {importStatus}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold">Sales Flow Brain</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ich helfe dir bei Lead-Analyse, Follow-up-Sequenzen, Einwandbehandlung
              und Abschluss-Strategien. Frag mich einfach!
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default ChatPage;
