import { FormEvent, useState } from "react";

export type LeadSuggestionCandidate = {
  id: string;
  name: string;
  company: string;
  role: string;
  website_url: string;
  impressum_url: string;
  region: string;
  source: string;
  notes: string;
};

export function LeadHunterPage() {
  const [industry, setIndustry] = useState<string>("network_marketing");
  const [region, setRegion] = useState<string>("DACH");
  const [query, setQuery] = useState<string>("");
  const [minTeamSize, setMinTeamSize] = useState<number | undefined>(10);
  const [maxResults, setMaxResults] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<LeadSuggestionCandidate[]>([]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
            website_url: entry.website_url ?? "",
            impressum_url: entry.impressum_url ?? "",
            region: entry.region ?? "",
            source: entry.source ?? "",
            notes: entry.notes ?? "",
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Vorschläge ({candidates.length})</h2>
          <p className="text-xs text-slate-500">
            Klicke auf die Links, um Website/Impressum zu prüfen, bevor du sie übernimmst.
          </p>
        </div>

        {candidates.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Vorschläge. Starte eine Suche oben.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
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
                    <td className="px-2 py-2 text-xs max-w-xs">
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
