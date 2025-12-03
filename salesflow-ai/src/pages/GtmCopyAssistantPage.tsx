/**
 * GTM Copy Assistant Page
 * 
 * UI für den Go-to-Market Copywriting Assistant.
 * Generiert Landingpages, Angebote, Sales-Scripts und Social Posts.
 */

import React, { useState } from "react";
import { useGtmCopyAssistant } from "@/hooks/useGtmCopyAssistant";
import { Sparkles, Copy, RotateCcw, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type VerticalOption = "generic" | "network" | "real_estate" | "finance";
type PackageOption = "solo" | "team" | "enterprise" | "custom";
type ChannelOption = "landingpage" | "offer" | "sales_script" | "social_post";
type StyleOption = "standard" | "short" | "detailed" | "social" | "presentation";

// ─────────────────────────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────────────────────────

const verticalOptions: { value: VerticalOption; label: string }[] = [
  { value: "generic", label: "Allgemein" },
  { value: "network", label: "Network Marketing" },
  { value: "real_estate", label: "Immobilien" },
  { value: "finance", label: "Finance" },
];

const packageOptions: { value: PackageOption; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "team", label: "Team" },
  { value: "enterprise", label: "Enterprise" },
  { value: "custom", label: "Custom" },
];

const channelOptions: { value: ChannelOption; label: string }[] = [
  { value: "landingpage", label: "Landingpage" },
  { value: "offer", label: "Angebot / Proposal" },
  { value: "sales_script", label: "Sales-Call / Zoom-Script" },
  { value: "social_post", label: "Social Post / Hook" },
];

const styleOptions: { value: StyleOption; label: string }[] = [
  { value: "standard", label: "Standard (balanced)" },
  { value: "short", label: "Kurz & knackig" },
  { value: "detailed", label: "Detailliert" },
  { value: "social", label: "Social / locker" },
  { value: "presentation", label: "Präsentation / Pitch-Deck" },
];

// ─────────────────────────────────────────────────────────────────
// Presets (Schnellstart-Vorlagen)
// ─────────────────────────────────────────────────────────────────

type GtmPresetKey =
  | "network_landingpage_team"
  | "realestate_offer_team"
  | "finance_script_team"
  | "network_social_solo"
  | "generic_landingpage_solo";

type GtmPreset = {
  key: GtmPresetKey;
  label: string;
  description: string;
  vertical: VerticalOption;
  pkg: PackageOption;
  channel: ChannelOption;
  style: StyleOption;
  task: string;
  context?: string;
  outputFormat?: string;
};

const gtmPresets: GtmPreset[] = [
  {
    key: "network_landingpage_team",
    label: "Landingpage – Network Team",
    description: "Für Network-Leader mit 10–50 Partnern",
    vertical: "network",
    pkg: "team",
    channel: "landingpage",
    style: "standard",
    task:
      "Komplette Landingpage für Sales Flow AI, Zielgruppe: Network-Leader mit 10–50 Vertriebspartnern, Fokus auf Follow-ups, Team-Dashboard und Objection Brain.",
    context:
      "Sales Flow AI als KI-Vertriebs-Copilot für Network Marketing. Hebel: mehr Einschreibungen aus bestehenden Kontakten, Daily Command für jeden Partner, Leader sieht Aktivität im Dashboard. Preise nur als 'ab [ANPASSBAR]'.",
    outputFormat: "Full Landingpage",
  },
  {
    key: "realestate_offer_team",
    label: "Angebot – Immo-Büro",
    description: "Proposal für Makler-Team",
    vertical: "real_estate",
    pkg: "team",
    channel: "offer",
    style: "presentation",
    task:
      "1-seitiges Angebot / Proposal für Sales Flow AI Team-Paket an ein Immobilienbüro mit 5–15 Maklern.",
    context:
      "Fokus auf mehr Abschlüsse aus bestehenden Interessenten, bessere Nachverfolgung nach Besichtigungen, professionellere Kommunikation. Keine harten Preiszusagen, nur 'ab [ANPASSBAR]' und Fokus auf Mehrwert.",
    outputFormat: "1-seitiges Angebot in Textform",
  },
  {
    key: "finance_script_team",
    label: "Sales-Script – Finance",
    description: "Zoom-Call mit Vertriebsleiter",
    vertical: "finance",
    pkg: "team",
    channel: "sales_script",
    style: "presentation",
    task:
      "Gesprochenes Sales-Script für einen 30-minütigen Zoom-Call mit einem Vertriebsleiter im Finance-Bereich.",
    context:
      "Hohe Regulatorik, Fokus auf Bestandskunden-Aktivierung, strukturierte Follow-ups und sichere Formulierungen. Kein Hype, sondern seriöser Nutzen. Bitte in Bulletpoints mit klarer Struktur.",
    outputFormat: "Sales-Script Bulletpoints",
  },
  {
    key: "network_social_solo",
    label: "Social Post – Network",
    description: "Instagram/LinkedIn Hook",
    vertical: "network",
    pkg: "solo",
    channel: "social_post",
    style: "social",
    task:
      "3–5 Social-Media-Hooks / kurze Posts für Network-Leader, die auf das Follow-up-Problem und Sales Flow AI einzahlen.",
    context:
      "Locker, direkt, keine Hype-Versprechen. Ziel: Aufmerksamkeit von Network-Leadern gewinnen, die viele Kontakte aber kein System haben.",
    outputFormat: "Liste von Hooks",
  },
  {
    key: "generic_landingpage_solo",
    label: "Landingpage – Solo",
    description: "Einzelkämpfer / Freelancer",
    vertical: "generic",
    pkg: "solo",
    channel: "landingpage",
    style: "standard",
    task:
      "Landingpage für Sales Flow AI Solo-Paket für Einzelkämpfer oder kleine Teams (1–3 Nutzer).",
    context:
      "Fokus: mehr Struktur im Alltag, konsequentere Follow-ups, weniger Kopf-Chaos. Keine Team-Features betonen, sondern persönlichen Output.",
    outputFormat: "Full Landingpage",
  },
];

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

function mapChannelToLabel(value: ChannelOption): string {
  switch (value) {
    case "landingpage":
      return "Landingpage";
    case "offer":
      return "Angebot";
    case "sales_script":
      return "Sales-Script";
    case "social_post":
      return "Social Post";
    default:
      return value;
  }
}

function mapStyleToLabel(value: StyleOption): string {
  switch (value) {
    case "standard":
      return "Standard";
    case "short":
      return "Kurz & knackig";
    case "detailed":
      return "Detailliert";
    case "social":
      return "Social";
    case "presentation":
      return "Präsentation";
    default:
      return value;
  }
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

const GtmCopyAssistantPage: React.FC = () => {
  const { loading, error, result, run, reset } = useGtmCopyAssistant();

  const [task, setTask] = useState("");
  const [context, setContext] = useState("");
  const [vertical, setVertical] = useState<VerticalOption>("generic");
  const [pkg, setPkg] = useState<PackageOption>("team");
  const [channel, setChannel] = useState<ChannelOption>("landingpage");
  const [style, setStyle] = useState<StyleOption>("standard");
  const [outputFormat, setOutputFormat] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Apply Preset (Schnellstart-Vorlage)
  const applyPreset = (preset: GtmPreset) => {
    setTask(preset.task);
    setContext(preset.context ?? "");
    setVertical(preset.vertical);
    setPkg(preset.pkg);
    setChannel(preset.channel);
    setStyle(preset.style);
    setOutputFormat(preset.outputFormat ?? "");
    // Ergebnis & Fehler nicht löschen – das macht reset() nur bei "Zurücksetzen"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;

    await run({
      task: task.trim(),
      context: context.trim() || undefined,
      vertical,
      package: pkg === "custom" ? undefined : pkg,
      channel: channel,
      style: style,
      output_format: outputFormat.trim() || undefined,
    });
  };

  const handleCopy = async () => {
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert("Konnte den Text nicht in die Zwischenablage kopieren.");
    }
  };

  const handleReset = () => {
    setTask("");
    setContext("");
    setOutputFormat("");
    setCopySuccess(false);
    reset();
  };

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GTM Copy Assistant</h1>
              <p className="text-sm text-slate-400">
                Landingpages, Angebote, Sales-Scripts & Social Posts – direkt aus deinem KI-Copiloten.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content: 2-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Formular */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <header className="mb-4">
              <h2 className="text-lg font-semibold">Was soll erstellt werden?</h2>
              <p className="mt-1 text-xs text-slate-400">
                Beschreibe, welchen Content du brauchst. Die KI erstellt ihn passgenau für Sales Flow AI.
              </p>
            </header>

            {/* Schnellstart-Vorlagen */}
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium text-slate-300">
                Schnellstart-Vorlagen
              </p>
              <p className="text-[11px] text-slate-500">
                Wähle eine Vorlage, um das Formular automatisch mit einem typischen Use-Case zu füllen. Du kannst alles danach noch anpassen.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {gtmPresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-200 transition hover:border-emerald-500 hover:bg-slate-800"
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Task */}
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Task *
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={3}
                  placeholder='z.B. "Landingpage für Sales Flow AI – Fokus: Team-Paket Immobilien" oder "1-seitiges Angebot für Network-Leader mit 20 Vertrieblern"'
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  required
                />
              </div>

              {/* Context */}
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Zusätzlicher Kontext (optional)
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={2}
                  placeholder="z.B. aktueller Engpass, besondere Wünsche, keine Preise anzeigen, etc."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>

              {/* Vertical & Package */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Branche / Vertical
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={vertical}
                    onChange={(e) => setVertical(e.target.value as VerticalOption)}
                  >
                    {verticalOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Paket / Ziel
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={pkg}
                    onChange={(e) => setPkg(e.target.value as PackageOption)}
                  >
                    {packageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Channel & Style */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Kanal / Format
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as ChannelOption)}
                  >
                    {channelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {mapChannelToLabel(opt.value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Stil
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as StyleOption)}
                  >
                    {styleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {mapStyleToLabel(opt.value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Output-Format (optional)
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  placeholder='z.B. "Full Landingpage", "Sektion: Hero + Problem", "Sales-Script Bulletpoints"'
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <p className="font-medium">Fehler</p>
                  <p className="mt-1 text-xs">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Zurücksetzen
                </button>
                <button
                  type="submit"
                  disabled={loading || !task.trim()}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generiere …
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Text generieren
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Ergebnis */}
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Generierter Text</h2>
                <p className="text-xs text-slate-400">
                  {result ? "Bereit zum Kopieren & Einfügen" : "Hier erscheint dein Content"}
                </p>
              </div>
              {result?.content && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    copySuccess
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  <Copy className="h-4 w-4" />
                  {copySuccess ? "Kopiert!" : "Kopieren"}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              {loading && !result && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                  <p className="mt-4 text-sm text-slate-400">
                    Die KI bereitet gerade deinen Text vor …
                  </p>
                </div>
              )}
              {!loading && !result && !error && (
                <div className="py-20 text-center">
                  <Sparkles className="mx-auto h-12 w-12 text-slate-700" />
                  <p className="mt-4 text-sm text-slate-500">
                    Noch kein Text generiert. Beschreibe links, was du brauchst, und klicke auf
                    "Text generieren".
                  </p>
                </div>
              )}
              {result?.content && (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-100">
                  {result.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GtmCopyAssistantPage;

