import { useEffect, useState, type FormEvent } from "react";
import { Clipboard, Loader2, Sparkles, Check } from "lucide-react";
import { ContactNameInput } from "../contacts/ContactNameInput";
import type { ContactSummary } from "../contacts/ContactPickerDialog";
import { api } from "@/lib/api";

export type FollowUpStage = "first_contact" | "followup1" | "followup2" | "reactivation";
export type FollowUpChannel = "whatsapp" | "email" | "dm";
export type FollowUpTone = "du" | "sie";

export interface FollowUpPanelProps {
  initialName?: string;
  initialBranch?: string;
  initialStage?: FollowUpStage;
  initialChannel?: FollowUpChannel;
  initialTone?: FollowUpTone;
  initialContext?: string;
  onMessageGenerated?: (message: string) => void;
}

interface FollowUpResponse {
  message: string;
  template_id?: string | null;
  source?: string | null;
}

const FOLLOWUP_ENDPOINT = "/followups/generate";

const BRANCH_SUGGESTIONS = [
  "Network Marketing",
  "Immobilien",
  "Finanzberatung",
  "Coaching",
  "SaaS",
  "Beratung",
  "Health",
];

const STAGE_OPTIONS: { value: FollowUpStage; label: string }[] = [
  { value: "first_contact", label: "Erstkontakt" },
  { value: "followup1", label: "Follow-up 1" },
  { value: "followup2", label: "Follow-up 2" },
  { value: "reactivation", label: "Reaktivierung" },
];

const CHANNEL_OPTIONS: { value: FollowUpChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-Mail" },
  { value: "dm", label: "Social DM" },
];

const TONE_OPTIONS: { value: FollowUpTone; label: string; description: string }[] = [
  { value: "du", label: "Du", description: "Persönlich & locker" },
  { value: "sie", label: "Sie", description: "Formell & respektvoll" },
];

export function FollowUpPanel(props: FollowUpPanelProps = {}) {
  const {
    initialBranch,
    initialStage,
    initialChannel,
    initialTone,
    initialName,
    initialContext,
    onMessageGenerated,
  } = props;

  const [branch, setBranch] = useState(initialBranch ?? "");
  const [stage, setStage] = useState<FollowUpStage>(initialStage ?? "first_contact");
  const [channel, setChannel] = useState<FollowUpChannel>(initialChannel ?? "whatsapp");
  const [tone, setTone] = useState<FollowUpTone>(initialTone ?? "du");
  const [name, setName] = useState(initialName ?? "");
  const [context, setContext] = useState(initialContext ?? "");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatorSource, setGeneratorSource] = useState<string | null>(null);

  useEffect(() => {
    setBranch(initialBranch ?? "");
    setStage(initialStage ?? "first_contact");
    setChannel(initialChannel ?? "whatsapp");
    setTone(initialTone ?? "du");
  }, [initialBranch, initialStage, initialChannel, initialTone]);

  useEffect(() => {
    setName(initialName ?? "");
  }, [initialName]);

  useEffect(() => {
    setContext(initialContext ?? "");
  }, [initialContext]);

  useEffect(() => {
    setGeneratedMessage("");
    setError(null);
    setCopied(false);
    setGeneratorSource(null);
  }, [initialBranch, initialStage, initialChannel, initialTone, initialName, initialContext]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setCopied(false);
    setGeneratedMessage("");

    const payload = {
      branch: branch.trim() || "Sales / Business",
      stage,
      channel,
      tone,
      name: name.trim() || undefined,
      context: context.trim() || undefined,
    };

    try {
      const data = await api.post<FollowUpResponse>(FOLLOWUP_ENDPOINT, payload);
      if (!data?.message) {
        throw new Error("Unerwartete Antwort vom Server.");
      }
      const messageText = data.message.trim();
      setGeneratedMessage(messageText);
      setGeneratorSource(data.source ?? null);
      onMessageGenerated?.(messageText);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedMessage) {
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleContactSelected = (contact: ContactSummary) => {
    if (contact.name) {
      setName(contact.name);
    }
    const inferred = inferBranchFromContact(contact);
    if (inferred) {
      setBranch(inferred);
    }
    if (!context && contact.city) {
      setContext(`Kontakt aus ${contact.city}.`);
    }
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-950/70 p-6 shadow-2xl">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-salesflow-accent">
          Follow-up Workbench
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-white">Follow-up Generator</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-salesflow-accent" />
            Beta
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Erzeuge in Sekunden saubere Follow-ups für warme Leads, alte Kontakte oder schnelle
          Reaktivierungen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-400">Branche / Vertical</label>
            <input
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              list="followup-branch-suggestions"
              placeholder="z. B. Network Marketing, Coaching, Immobilien …"
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <datalist id="followup-branch-suggestions">
              {BRANCH_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-400">Phase</label>
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as FollowUpStage)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-400">Kanal</label>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value as FollowUpChannel)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              {CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-400">Ton</label>
            <div className="flex gap-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    tone === option.value
                      ? "border-emerald-500 bg-emerald-500/10 text-white"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <span className="block text-base">{option.label}</span>
                  <span className="text-[11px] font-normal text-slate-400">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <ContactNameInput
              label="Kontaktname"
              placeholder="Name eingeben oder Kontakt wählen"
              value={name}
              onChange={setName}
              onContactSelected={handleContactSelected}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-400">Kontext / Notiz</label>
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                rows={4}
                placeholder="z.B. hat Präsentation vor 2 Wochen gesehen, wartet noch auf Rückmeldung…"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-4 py-3 text-base font-semibold text-black shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Nachricht wird erzeugt…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Nachricht erzeugen
            </>
          )}
        </button>
      </form>

      {generatedMessage && (
        <div className="mt-6 space-y-3 rounded-2xl border border-white/5 bg-slate-950/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Vorschlag</p>
              <h3 className="text-lg font-semibold text-white">Generierte Nachricht</h3>
              {generatorSource && (
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Quelle: {generatorSource === "chief" ? "CHIEF" : "Fallback"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Kopiert
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" />
                  In Zwischenablage kopieren
                </>
              )}
            </button>
          </div>
          <textarea
            value={generatedMessage}
            readOnly
            className="min-h-[200px] w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-100"
          />
        </div>
      )}
    </section>
  );
}

function inferBranchFromContact(contact: ContactSummary): string | null {
  const probe = [contact.vertical, contact.status, contact.city]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  if (probe.some((value) => value.includes("network"))) {
    return "Network Marketing";
  }
  if (probe.some((value) => value.includes("immo") || value.includes("estate"))) {
    return "Immobilien";
  }
  if (
    probe.some(
      (value) =>
        value.includes("finance") ||
        value.includes("finanz") ||
        value.includes("versicherung") ||
        value.includes("bank")
    )
  ) {
    return "Finanzberatung";
  }
  if (probe.some((value) => value.includes("coach"))) {
    return "Coaching";
  }
  return null;
}

