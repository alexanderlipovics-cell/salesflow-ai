import clsx from "clsx";
import { useMemo, useState } from "react";
import { ArrowUpRight, Loader, Sparkles } from "lucide-react";

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    if (!draft.trim() || isSending) return;

    setIsSending(true);
    const userMessage = {
      id: createId(),
      role: "user",
      author: "Du",
      content: draft.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    try {
      const response = await fetch("/.netlify/functions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, engine: "gpt" }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed with status ${response.status}`);
      }

      const data = await response.json();
      const reply =
        typeof data?.reply === "string" && data.reply.trim().length > 0
          ? data.reply
          : "Die AI konnte keine Antwort liefern. Bitte versuche es erneut.";

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          author: "Sales Flow AI",
          content: reply,
        },
      ]);
    } catch (error) {
      console.error("AI request failed", error);
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          author: "Sales Flow AI",
          content:
            "Ups, etwas ist schiefgelaufen. Versuch es gleich nochmal oder kontaktiere den Support.",
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
                  message.role === "assistant"
                    ? "border-salesflow-accent/30 bg-salesflow-accent/5 text-white"
                    : "border-white/10 bg-white/5 text-gray-100"
                )}
              >
                <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                  {message.author}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{message.content}</p>
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
