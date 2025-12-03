import React, { useState } from "react";

type Vertical = "network_marketing" | "immo" | "finance" | "generic";
type SuggestionType = "customer_nearby" | "lead_nearby" | "cafe";

interface PhoenixSuggestion {
  type: SuggestionType;
  title: string;
  subtitle?: string;
  reason: string;
  distance_km?: number;
  lead_id?: string;
  address?: string;
}

interface PhoenixResponse {
  summary: string;
  suggestions: PhoenixSuggestion[];
}

const env =
  (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env ?? {};

const BACKEND_URL = env.VITE_BACKEND_URL || "http://localhost:8001";

type QuickMode = "networker" | "immo" | "cafes";

interface QuickContext {
  vertical: Vertical;
  minutes: number;
  location: string;
}

function buildWhatsappMessageForSuggestion(
  suggestion: PhoenixSuggestion,
  ctx: QuickContext | null
): string {
  const location = ctx?.location || "hier in der Gegend";
  const minutes = ctx?.minutes ?? 30;

  const intro = `Hey [Name], ich bin gerade in ${location} unterwegs und hab noch etwa ${minutes} Minuten Zeit zwischen zwei Terminen.`;

  // Standard-CTA für alles
  const outro =
    "Wenn du magst, können wir die Zeit nutzen und kurz sprechen – ganz entspannt und unverbindlich.";

  if (!ctx) {
    return (
      intro +
      "\n\n" +
      "Ich wollte die Zeit nutzen, um mich mal wieder bei dir zu melden und zu hören, wie es bei dir aktuell aussieht." +
      "\n\n" +
      outro
    );
  }

  if (ctx.vertical === "network_marketing") {
    if (suggestion.type === "lead_nearby") {
      return (
        intro +
        "\n\n" +
        "Da ist mir unser letztes Gespräch eingefallen – wir hatten ja über deine Ziele und das Thema zusätzliches Einkommen gesprochen. Wie fühlt sich das Thema für dich aktuell an – ist das noch spannend für dich?" +
        "\n\n" +
        outro
      );
    }
    if (suggestion.type === "customer_nearby") {
      return (
        intro +
        "\n\n" +
        "Ich wollte einfach kurz bei dir einchecken und fragen, wie es dir mit den Produkten und generell gerade geht. Gibt es etwas, wobei ich dich unterstützen kann oder irgendetwas, das wir optimieren sollten?" +
        "\n\n" +
        outro
      );
    }
  }

  if (ctx.vertical === "immo") {
    if (suggestion.type === "lead_nearby") {
      return (
        intro +
        "\n\n" +
        "Mir ist eingefallen, dass wir ja wegen deiner Immobiliensuche bzw. -planung in Kontakt waren. Ist das Thema Immobilie bei dir aktuell noch präsent oder hat sich etwas verändert?" +
        "\n\n" +
        outro
      );
    }
    if (suggestion.type === "customer_nearby") {
      return (
        intro +
        "\n\n" +
        "Ich wollte die Gelegenheit nutzen, um kurz nachzufragen, wie es dir mit deinem Kauf/Verkauf im Nachhinein geht und ob es aktuell etwas gibt, wobei ich dich unterstützen kann – Marktupdate, Bewertung, zweite Immobilie etc." +
        "\n\n" +
        outro
      );
    }
  }

  if (ctx.vertical === "finance") {
    if (suggestion.type === "lead_nearby") {
      return (
        intro +
        "\n\n" +
        "Wir hatten ja schon einmal über deine Finanz- bzw. Vorsorge-Situation gesprochen. Ich könnte dir spontan ein kurzes Update geben, worauf man aktuell unbedingt achten sollte – hättest du grundsätzlich Interesse?" +
        "\n\n" +
        outro
      );
    }
    if (suggestion.type === "customer_nearby") {
      return (
        intro +
        "\n\n" +
        "Ich wollte kurz nachhaken, ob deine aktuelle Lösung für dich noch gut passt oder ob es Themen gibt, bei denen wir optimieren sollten (Sicherheit, Rendite, Liquidität)." +
        "\n\n" +
        outro
      );
    }
  }

  if (suggestion.type === "cafe") {
    // Für Cafés macht ein DM-Text keinen Sinn – hier geben wir eine kleine Selbst-Instruktion aus.
    return (
      "Mini-Plan für die nächsten Minuten:\n\n" +
      "- Such dir einen ruhigen Platz in einem Café in " +
      location +
      ".\n" +
      "- Schreib 3–5 Voice-Nachrichten oder DMs an warme Kontakte.\n" +
      "- Fokus: nachfragen, wie es ihnen geht, und 1 konkreten nächsten Schritt anbieten."
    );
  }

  // Fallback generisch
  return (
    intro +
    "\n\n" +
    "Ich wollte die Zeit nutzen, um mich mal wieder kurz bei dir zu melden und zu hören, wie es bei dir aussieht und ob es gerade ein Thema gibt, bei dem ich dich unterstützen kann." +
    "\n\n" +
    outro
  );
}

export function PhoenixQuickActionsPanel() {
  const [location, setLocation] = useState("Wien, 3. Bezirk");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PhoenixResponse | null>(null);
  const [activeMode, setActiveMode] = useState<QuickMode | null>(null);
  const [ctx, setCtx] = useState<QuickContext | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function runQuick(mode: QuickMode) {
    if (!location.trim()) {
      setError("Bitte gib einen Standort ein (z.B. Stadt oder Bezirk).");
      return;
    }

    setActiveMode(mode);
    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedIndex(null);
    setMessage("");
    setCopied(false);

    let vertical: Vertical = "generic";
    let minutes = 30;

    if (mode === "networker") {
      vertical = "network_marketing";
      minutes = 30;
    } else if (mode === "immo") {
      vertical = "immo";
      minutes = 30;
    } else if (mode === "cafes") {
      vertical = "generic";
      minutes = 45;
    }

    setCtx({
      vertical,
      minutes,
      location: location.trim(),
    });

    try {
      const res = await fetch(`${BACKEND_URL}/phoenix/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "DEMO-USER-ID", // TODO: später aus Auth holen
          vertical,
          mode: "too_early",
          time_window_minutes: minutes,
          location: { description: location },
          max_suggestions: 3,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as PhoenixResponse;

      if (mode === "cafes") {
        const onlyCafes = data.suggestions.filter((s) => s.type === "cafe");
        setResponse({
          ...data,
          suggestions: onlyCafes.length > 0 ? onlyCafes : data.suggestions,
        });
      } else if (mode === "networker" || mode === "immo") {
        const nonCafe = data.suggestions.filter((s) => s.type !== "cafe");
        setResponse({
          ...data,
          suggestions: nonCafe.length > 0 ? nonCafe : data.suggestions,
        });
      } else {
        setResponse(data);
      }
    } catch (err: any) {
      setError(err.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateMessage(suggestion: PhoenixSuggestion, index: number) {
    const text = buildWhatsappMessageForSuggestion(suggestion, ctx);
    setSelectedIndex(index);
    setMessage(text);
    setCopied(false);
  }

  async function handleCopy() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-100">
            Phönix · Schnellaktionen
          </h2>
          <p className="text-xs text-slate-400">
            So nutzt du Phönix: 1️⃣ Standort eingeben · 2️⃣ Zeitfenster wählen · 3️⃣ Option anklicken · 4️⃣
            „WhatsApp-Text für Option“ drücken und senden.
          </p>
          <p className="text-xs text-slate-400">
            Für Außendienst & Network: kurze Zeitfenster nutzen – mit einem Klick.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase text-slate-400">
          Standort (z.B. Stadt / Bezirk)
        </label>
        <input
          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="z.B. Wien, 3. Bezirk"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runQuick("networker")}
          disabled={loading}
          className={`rounded-xl px-3 py-2 text-xs font-medium ${
            activeMode === "networker"
              ? "bg-emerald-500 text-black"
              : "bg-slate-800 text-slate-100 hover:bg-slate-700"
          } disabled:opacity-50`}
        >
          30 Min · 3 Networker in der Nähe
        </button>
        <button
          type="button"
          onClick={() => runQuick("immo")}
          disabled={loading}
          className={`rounded-xl px-3 py-2 text-xs font-medium ${
            activeMode === "immo"
              ? "bg-emerald-500 text-black"
              : "bg-slate-800 text-slate-100 hover:bg-slate-700"
          } disabled:opacity-50`}
        >
          30 Min · 3 Immo-Kontakte in der Nähe
        </button>
        <button
          type="button"
          onClick={() => runQuick("cafes")}
          disabled={loading}
          className={`rounded-xl px-3 py-2 text-xs font-medium ${
            activeMode === "cafes"
              ? "bg-emerald-500 text-black"
              : "bg-slate-800 text-slate-100 hover:bg-slate-700"
          } disabled:opacity-50`}
        >
          45 Min · 3 Cafés / Spots zum Arbeiten
        </button>
      </div>

      {loading && (
        <div className="text-xs text-slate-400">Phönix sucht Optionen…</div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {response && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">{response.summary}</p>
          <div className="space-y-2">
            {response.suggestions.map((s, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-100">
                    {idx + 1}️⃣ {s.title}
                  </span>
                  {s.distance_km != null && (
                    <span className="text-[10px] text-slate-400">
                      ~{s.distance_km.toFixed(1)} km
                    </span>
                  )}
                </div>
                {s.subtitle && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    {s.subtitle}
                  </div>
                )}
                {s.address && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    {s.address}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-slate-300">
                  {s.reason}
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateMessage(s, idx)}
                  className="mt-3 rounded-lg border border-emerald-500/70 px-3 py-1.5 text-[11px] text-emerald-200 hover:bg-emerald-500/10"
                >
                  WhatsApp-Text für Option {idx + 1} erstellen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="space-y-2">
          <label className="text-xs uppercase text-slate-400">
            Vorschlag für WhatsApp / DM (Platzhalter [Name] bitte anpassen)
          </label>
          <textarea
            className="w-full min-h-[140px] rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm"
            value={message}
            readOnly
          />
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {copied ? "Kopiert ✅" : "In Zwischenablage kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}
