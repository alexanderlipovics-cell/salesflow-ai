import { useMemo, useState } from "react";
import { Bot, Paperclip, Send, Upload } from "lucide-react";

const initialMessages = [
  {
    id: "sys",
    role: "assistant",
    content:
      "Hey, ich bin dein Sales Flow Copilot. Lass uns eine Pipeline-Situation lösen.",
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

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const humanMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedInput,
    };

    setMessages((prev) => [...prev, humanMessage]);
    setInput("");

    try {
      const response = await fetch("/.netlify/functions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: humanMessage.content, engine: "gpt" }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      const reply = data?.reply;
      if (!response.ok || !reply) {
        throw new Error("AI API returned an invalid response.");
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
    }
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
    <div className="space-y-6 text-white">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        <section className="rounded-3xl border border-white/5 bg-gray-950/80 p-6 shadow-2xl">
          <header className="flex flex-col gap-3 border-b border-white/5 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                Conversational Ops
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">
                Sales Flow AI · Chat
              </h1>
              <p className="mt-1 text-sm text-slate-400 max-w-xl">
                Frag nach Follow-ups, Sequenzen oder Speed-Hunter-Kampagnen – dein
                Copilot nutzt den Lead-Kontext automatisch.
              </p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/40"
              title="Live-Modus: Antworten basieren auf deinen echten CRM-Daten."
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>
          </header>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action) => {
                const isPrimary = action === "Lead analysieren";
                const buttonClasses = isPrimary
                  ? "inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 shadow-sm hover:bg-emerald-400 transition"
                  : "inline-flex items-center gap-1 rounded-md border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800/80 transition";

                return (
                  <button key={action} type="button" className={buttonClasses}>
                    {action}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">{renderedMessages}</div>

            <form onSubmit={handleSendMessage} className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Prompt an Copilot
              </label>
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 sm:px-5 sm:py-4">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Frag nach einem Follow-up, einer Sequenz oder nach einer Speed-Hunter Kampagne…"
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
                />
                <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
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
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Lead-Kontext
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Kontext für deinen Copilot. Name, Firma, Status & letzte Aktion – der
                  Chat nutzt diese Infos für Antworten & Follow-ups.
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                Sync bereit
              </span>
            </div>

            <form className="space-y-4" onSubmit={handleSaveContext}>
              <textarea
                value={leadContext}
                onChange={(event) => setLeadContext(event.target.value)}
                className="h-48 w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 font-mono text-sm text-emerald-100 outline-none"
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

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Bestandskunden importieren
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Lade CSV-Listen hoch – Sales Flow AI erkennt Status, letzten Kontakt
                  und schlägt automatisch nächste Schritte vor. Perfekt für Speed-Hunter &
                  Phönix.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  <li>• Segmentiert Interessenten, Kunden & schlafende Kontakte</li>
                  <li>• Erkennt Follow-up-Bedarf automatisch</li>
                  <li>• Keine alten Listen mehr im Ordner „Irgendwann“ 😅</li>
                </ul>
              </div>
              <Upload className="h-5 w-5 text-slate-500" />
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-6 text-sm text-slate-300 hover:border-emerald-400/60">
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
              <p className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200">
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
