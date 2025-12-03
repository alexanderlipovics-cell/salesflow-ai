import { FormEvent, useState } from "react";
import { useUser } from "../context/UserContext";

export type LeadSuggestionCandidate = {
  id: string;
  name: string;
  company: string;
  role: string;
  website_url: string | null;
  impressum_url: string | null;
  region: string | null;
  source: string | null;
  notes: string | null;
  selected: boolean;
};

// Beispiel: Lead-Hunter Output für 10 Network-Leads
/*
Kaiser,
10 neue Network-Leads (gemischte Firmen)

1️⃣ Manuela Frabetti – Aurora Global Network
Firma: Aurora Global Network
Plattform: Instagram
Handle: @manuela.aurora
Bio (kurz): Baut ein 120-Personen-Team mit Fokus auf Health-SaaS Add-ons
Profil: https://instagram.com/manuela.aurora

2️⃣ Fabio Conti – Elevate Circle
Firma: Elevate Circle
Plattform: Facebook
Handle: @fabiocontiofficial
Bio (kurz): Ex-Consultant, jetzt Network-Leader mit wöchentlichen Masterminds
Profil: https://facebook.com/fabiocontiofficial

3️⃣ Saskia Halden – Momentum Tribe
Firma: Momentum Tribe
Plattform: Instagram
Handle: @saskia.momentum
Bio (kurz): Führt Remote-Vertriebsteams in DACH, Schwerpunkt Female Founders
Profil: https://instagram.com/saskia.momentum

4️⃣ Jonas Klee – Vertex Connect
Firma: Vertex Connect
Plattform: LinkedIn
Handle: @jonas-klee
Bio (kurz): Baut Hybrid-Teams für FinTech-Produkte, 8 Länder aktiv
Profil: https://www.linkedin.com/in/jonas-klee

5️⃣ Emilia Duarte – Zenith Rise Partners
Firma: Zenith Rise Partners
Plattform: Instagram
Handle: @emilia.zenith
Bio (kurz): Scale-Coach für Networker mit Fokus auf Content-Automation
Profil: https://instagram.com/emilia.zenith

6️⃣ Felix Hartwig – Pulse Affiliate Group
Firma: Pulse Affiliate Group
Plattform: Facebook
Handle: @felixhartwig.sales
Bio (kurz): 15 Jahre Network-Erfahrung, baut neue Teams für BioTech-Produkte
Profil: https://facebook.com/felixhartwig.sales

7️⃣ Natalia Romero – Nova Reach Collective
Firma: Nova Reach Collective
Plattform: Instagram
Handle: @natalia.novareach
Bio (kurz): Führt zweisprachige Teams (ES/DE) für Premium-Cosmetics
Profil: https://instagram.com/natalia.novareach

8️⃣ Daniel Seidel – Peakwave Network
Firma: Peakwave Network
Plattform: LinkedIn
Handle: @daniel-seidel
Bio (kurz): Spezialisiert auf B2B-Abos im IT-Security-Networking
Profil: https://www.linkedin.com/in/daniel-seidel

9️⃣ Mira Solberg – Atlas Flow Alliance
Firma: Atlas Flow Alliance
Plattform: Instagram
Handle: @mira.atlasflow
Bio (kurz): Baut Community-Events für Networker in Berlin & Zürich
Profil: https://instagram.com/mira.atlasflow

🔟 Henrik Danner – Horizon Sync Labs
Firma: Horizon Sync Labs
Plattform: Facebook
Handle: @henrikdanner
Bio (kurz): Skaliert High-Ticket-Networks via Paid Ads und Webinare
Profil: https://facebook.com/henrikdanner

Ich verbuche für dich im System: +10 neue Network-Leads (gemischte Firmen, Fokus DACH).
Sag mir einfach, wenn du mit den Nachrichten starten willst – z.B.: „Block 1: 5 DMs vorbereiten“.
*/

export function LeadHunterPage() {
  const user = useUser();
  const userName = user?.name?.trim();
  const [industry, setIndustry] = useState<string>("network_marketing");
  const [region, setRegion] = useState<string>("DACH");
  const [query, setQuery] = useState<string>("");
  const [minTeamSize, setMinTeamSize] = useState<number | undefined>(10);
  const [maxResults, setMaxResults] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<LeadSuggestionCandidate[]>([]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaveMessage(null);
    setLoading(true);
    setCandidates([]);

    try {
      const response = await fetch("/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "lead_hunter",
          data: {
            industry,
            user_name: userName || undefined,
            lead_hunter: {
              query: query || undefined,
              industry,
              region,
              min_team_size: minTeamSize ?? undefined,
              max_results: maxResults,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { action: string; reply: string };

      let parsed: unknown;
      try {
        parsed = JSON.parse(payload.reply);
      } catch (parseError) {
        throw new Error("Die AI-Antwort konnte nicht als JSON geparst werden.");
      }

      const list = Array.isArray((parsed as { candidates?: unknown }).candidates)
        ? ((parsed as { candidates?: LeadSuggestionCandidate[] }).candidates as unknown[])
        : [];

      setCandidates(
        list.map((item, index) => {
          const entry = item as Partial<LeadSuggestionCandidate>;
          return {
            id: `${index}`,
            name: entry.name ?? "",
            company: entry.company ?? "",
            role: entry.role ?? "",
            website_url: entry.website_url ?? null,
            impressum_url: entry.impressum_url ?? null,
            region: entry.region ?? null,
            source: entry.source ?? "lead_hunter",
            notes: entry.notes ?? null,
            selected: false,
          };
        })
      );
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Lead-Hunter.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSelected() {
    setSaveMessage(null);
    const selectedCandidates = candidates.filter((candidate) => candidate.selected);

    if (selectedCandidates.length === 0) {
      setSaveMessage("Keine Kandidaten ausgewählt.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        candidates: selectedCandidates.map((candidate) => ({
          name: candidate.name || null,
          company: candidate.company || null,
          role: candidate.role || null,
          website_url: candidate.website_url || null,
          impressum_url: candidate.impressum_url || null,
          region: candidate.region || null,
          source: candidate.source || "lead_hunter_ui",
          notes: candidate.notes || null,
        })),
      };

      const response = await fetch("/leads/from-hunter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const summary = (await response.json()) as { total: number; inserted: number };
      setSaveMessage(`Leads gespeichert: ${summary.inserted} von ${summary.total}.`);

      setCandidates((prev) => prev.map((candidate) => ({ ...candidate, selected: false })));
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Fehler beim Speichern der Leads.";
      setSaveMessage(message);
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = candidates.filter((candidate) => candidate.selected).length;
  const allSelected = candidates.length > 0 && selectedCount === candidates.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Lead-Hunter · Research</h1>
          <p className="text-sm text-slate-400">
            Lass die KI Vorschläge für neue Kontakte machen – du prüfst und entscheidest.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-5"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Branche
          </label>
          <input
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="z.B. network_marketing, real_estate"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Region
          </label>
          <input
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="z.B. DACH, Wien"
          />
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Such-Query
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder='z.B. "Network Leader in DACH mit Team 50+"'
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Min. Teamgröße
          </label>
          <input
            type="number"
            value={minTeamSize ?? ""}
            onChange={(event) =>
              setMinTeamSize(event.target.value ? Number(event.target.value) : undefined)
            }
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Max. Ergebnisse
          </label>
          <input
            type="number"
            value={maxResults}
            onChange={(event) => setMaxResults(Number(event.target.value || 20))}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-end md:col-span-1">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Suche..." : "Leads vorschlagen"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Vorschläge ({candidates.length})
            </h2>
            <p className="text-xs text-slate-500">
              Wähle die Kontakte aus, die du als Leads speichern möchtest.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveMessage && <span className="text-xs text-emerald-400">{saveMessage}</span>}
            <button
              type="button"
              disabled={saving || selectedCount === 0}
              onClick={handleSaveSelected}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-500/70 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Speichere..." : "Auswahl als Leads übernehmen"}
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Vorschläge. Starte eine Suche oben.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                      checked={allSelected}
                      onChange={(event) => {
                        const { checked } = event.target;
                        setCandidates((prev) =>
                          prev.map((candidate) => ({ ...candidate, selected: checked }))
                        );
                      }}
                    />
                  </th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Firma</th>
                  <th className="px-2 py-2">Rolle</th>
                  <th className="px-2 py-2">Region</th>
                  <th className="px-2 py-2">Website</th>
                  <th className="px-2 py-2">Impressum</th>
                  <th className="px-2 py-2">Notiz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-900/80">
                    <td className="px-2 py-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                        checked={candidate.selected}
                        onChange={(event) => {
                          const { checked } = event.target;
                          setCandidates((prev) =>
                            prev.map((item) =>
                              item.id === candidate.id ? { ...item, selected: checked } : item
                            )
                          );
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 text-xs">{candidate.name}</td>
                    <td className="px-2 py-2 text-xs">{candidate.company}</td>
                    <td className="px-2 py-2 text-xs">{candidate.role}</td>
                    <td className="px-2 py-2 text-xs">{candidate.region}</td>
                    <td className="px-2 py-2 text-xs">
                      {candidate.website_url ? (
                        <a
                          href={candidate.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          Website
                        </a>
                      ) : (
                        <span className="text-slate-500">–</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {candidate.impressum_url ? (
                        <a
                          href={candidate.impressum_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          Impressum
                        </a>
                      ) : (
                        <span className="text-slate-500">–</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <span className="line-clamp-2">
                        {candidate.notes}
                        {candidate.source ? ` ${candidate.source}` : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeadHunterPage;
