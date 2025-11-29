import { useMemo, useState } from "react";
import { Bot, Paperclip, Send, Sparkles, Upload } from "lucide-react";

const initialMessages = [
  {
    id: "sys",
    role: "assistant",
    content:
      "Hey, ich bin dein Sales Flow Copilot. Lass uns eine Pipeline-Situation lösen.",
  },
  {
    id: "user-1",
    role: "user",
    content:
      "Lead: Sebastian K., CFO bei Flowmatic. Wir brauchen eine Follow-up-Nachricht nach Demo.",
  },
  {
    id: "ai-1",
    role: "assistant",
    content:
      "Verstanden. Ich formuliere gleich eine prägnante Nachricht mit CTA für nächste Woche.",
  },
];

const quickActions = [
  "Lead analysieren",
  "Tonlage ändern",
  "Folgeplan erstellen",
  "Objection Handling",
];

const defaultLeadContext = `{
  "name": "Sebastian Krüger",
  "company": "Flowmatic",
  "status": "Demo erledigt",
  "next_step": "Nach 3 Tagen follow-up",
  "notes": "Hat Budget für Q1 reserviert"
}`;

const ChatPage = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [leadContext, setLeadContext] = useState(defaultLeadContext);
  const [contextSaved, setContextSaved] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => (
        <article
          key={message.id}
          className={`rounded-2xl border border-white/5 bg-black/20 p-4 text-sm leading-relaxed ${
            message.role === "assistant"
              ? "shadow-[0_0_30px_rgba(119,102,241,0.15)]"
              : ""
          }`}
        >
          <header className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-500">
            {message.role === "assistant" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-salesflow-accent/10 px-3 py-1 text-[10px] font-semibold text-salesflow-accent">
                <Bot className="h-3.5 w-3.5" /> Copilot
              </span>
            ) : (
              <span className="text-gray-400">Du</span>
            )}
            <span className="h-px w-4 bg-white/10" aria-hidden />
            <span>{message.role === "assistant" ? "Antwort" : "Prompt"}</span>
          </header>
          <p className="text-base text-gray-100">{message.content}</p>
        </article>
      )),
    [messages]
  );

  const handleSendMessage = (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    const humanMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    const aiDraft = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content:
        "Ich fasse das auf und spiele dir in Kürze einen optimierten Vorschlag aus.",
    };

    setMessages((prev) => [...prev, humanMessage, aiDraft]);
    setInput("");
  };

  const handleSaveContext = (event) => {
    event.preventDefault();
    setContextSaved(true);
    setTimeout(() => setContextSaved(false), 1800);
  };

  const handleImport = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setImportStatus(`${files.length} Datei(en) hinzugefügt · Analyse gestartet`);
    setTimeout(() => setImportStatus(null), 4000);
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    const historyPayload = mapHistory([...messages, userMessage]);

    try {
      const response = await fetch("/.netlify/functions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, engine: "gpt" }),
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
      const response = await fetch("/.netlify/functions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, engine: "gpt" }),
      });

      if (!response.ok) {
        setErrorMessage("API Fehler");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        <section className="rounded-3xl border border-white/5 bg-gray-950/80 p-6 shadow-2xl">
          <header className="flex flex-col gap-3 border-b border-white/5 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                Conversational Ops
              </p>
              <h1 className="mt-1 text-3xl font-semibold">
                Sales Flow AI · Chat
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                Kombiniere Kontext, Uploads und Speed-Hunter-Prompts in einer
                Oberfläche.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-salesflow-accent/30 bg-salesflow-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-salesflow-accent">
              <Sparkles className="h-4 w-4" /> Live
            </div>
          </header>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-gray-300 hover:border-salesflow-accent/40 hover:text-white"
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="space-y-4">{renderedMessages}</div>

            <form onSubmit={handleSendMessage} className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Prompt an Copilot
              </label>
              <div className="rounded-2xl border border-white/10 bg-black/30">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Frag nach einem Follow-up, einer Sequenz oder nach einer Speed-Hunter Kampagne…"
                  className="min-h-[140px] w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-base text-gray-100 outline-none"
                />
                <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 px-3 py-1 hover:border-salesflow-accent/40">
                      <Paperclip className="h-4 w-4" />
                      <span>Dokument anhängen</span>
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-salesflow-accent px-4 py-2 text-sm font-semibold text-black shadow-glow hover:scale-[1.01]"
                  >
                    Abschicken
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/5 bg-gray-950/60 p-6">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                  Kontext
                </p>
                <h2 className="mt-1 text-xl font-semibold">Lead-Kontext</h2>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Sync bereit
              </span>
            </header>

            <form className="mt-4 space-y-4" onSubmit={handleSaveContext}>
              <textarea
                value={leadContext}
                onChange={(event) => setLeadContext(event.target.value)}
                className="h-48 w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-sm text-emerald-100 outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-400/20 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/30"
              >
                Kontext speichern
              </button>
              {contextSaved && (
                <p className="text-center text-xs text-emerald-200">
                  Kontext aktualisiert · Copilot nutzt die neuesten Daten.
                </p>
              )}
            </form>
          </section>

          <section className="rounded-3xl border border-white/5 bg-gray-950/60 p-6">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                  Datenimporte
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Bestandskunden importieren
                </h2>
              </div>
              <Upload className="h-5 w-5 text-gray-500" />
            </header>
            <p className="mt-3 text-sm text-gray-400">
              Lade CSV-Listen oder Alumni-Accounts hoch, damit Speed-Hunter und
              Phoenix automatisch Segmente bauen.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-gray-300 hover:border-salesflow-accent/40">
              <Upload className="h-6 w-6" />
              <span>CSV oder XLSX ablegen</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleImport}
              />
            </label>
            {importStatus && (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200">
                {importStatus}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ChatPage;
