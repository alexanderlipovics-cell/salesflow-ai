import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type Vertical = "network_marketing" | "immo" | "finance" | "coaching" | "generic";

interface PhoenixSuggestion {
  type: "customer_nearby" | "lead_nearby" | "cafe";
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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";

const PhoenixPage = () => {
  const { user } = useAuth();
  const [vertical, setVertical] = useState<Vertical>("network_marketing");
  const [location, setLocation] = useState("Wien, 3. Bezirk");
  const [minutes, setMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PhoenixResponse | null>(null);

  const userId = user?.id ?? "DEMO-USER-ID";

  async function handleFetch() {
    if (!location.trim()) {
      setError("Bitte gib einen Standort ein.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${BACKEND_URL}/phoenix/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
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
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Phönix · Ich bin zu früh</h1>
      <p className="text-sm text-slate-400">
        Du bist im Außendienst zu früh beim Termin? Phönix sucht dir Kunden in der Nähe
        oder passende Spots, um die Zeit sinnvoll zu nutzen.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-xs uppercase text-slate-400">Branche</label>
          <select
            className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm"
            value={vertical}
            onChange={(e) => setVertical(e.target.value as Vertical)}
          >
            <option value="network_marketing">Network-Marketing</option>
            <option value="immo">Immobilien</option>
            <option value="finance">Finanzberatung</option>
            <option value="coaching">Coaching / Beratung</option>
            <option value="generic">Allgemein</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-slate-400">
            Standort (Beschreibung)
          </label>
          <input
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="z.B. Wien, 3. Bezirk"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-slate-400">Zeitfenster (Minuten)</label>
          <input
            type="number"
            min={10}
            max={120}
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value) || 30)}
          />
        </div>
      </div>

      <button
        onClick={handleFetch}
        disabled={loading}
        className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
      >
        {loading ? "Suche Vorschläge..." : "Phönix starten"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {response && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{response.summary}</p>
          <div className="space-y-3">
            {response.suggestions.map((s, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {idx + 1}️⃣ {s.title}
                  </span>
                  {s.distance_km != null && (
                    <span className="text-xs text-slate-400">
                      ~{s.distance_km.toFixed(1)} km
                    </span>
                  )}
                </div>
                {s.subtitle && (
                  <div className="mt-1 text-xs text-slate-400">{s.subtitle}</div>
                )}
                {s.address && (
                  <div className="mt-1 text-xs text-slate-400">{s.address}</div>
                )}
                <div className="mt-2 text-xs text-slate-300">{s.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoenixPage;

