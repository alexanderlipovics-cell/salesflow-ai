import React, { FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
// ggf. Pfad anpassen
import { supabase } from "@/lib/supabaseClient";

type LeadSourceKey =
  | "reactivation"
  | "linkedin"
  | "google_maps"
  | "directory"
  | "referrals";

interface SourceInfo {
  key: LeadSourceKey;
  label: string;
  description: string;
}

interface LeadFilters {
  industry?: string;
  region?: string;
  company_size?: string;
  radius_km?: number;
  last_contact_days?: number;
}

interface LeadResult {
  id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  source: string;
  score: number;
  reason: string;
  // Optional für Source-spezifische UI:
  linkedin_url?: string;
  address?: string;
  referred_by?: string;
}

interface LeadSearchResponse {
  leads: LeadResult[];
  total: number;
}

interface LeadImportResponse {
  imported: number;
  skipped: number;
  errors: string[];
}

const defaultFilters: LeadFilters = {
  industry: "",
  region: "",
  company_size: "",
  radius_km: 10,
  last_contact_days: 90,
};

const getScoreColorClass = (score: number): string => {
  if (score < 50) return "bg-red-500/10 text-red-300 border-red-500/40";
  if (score <= 70) return "bg-amber-400/10 text-amber-300 border-amber-500/40";
  return "bg-emerald-500/10 text-emerald-300 border-emerald-500/40";
};

const LeadDiscoveryPage: FC = () => {
  const navigate = useNavigate();

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const [selectedSource, setSelectedSource] =
    useState<LeadSourceKey>("reactivation");
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters);

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<LeadResult[]>([]);
  const [totalResults, setTotalResults] = useState<number | null>(null);

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    () => new Set()
  );
  const [previewLead, setPreviewLead] = useState<LeadResult | null>(null);

  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] =
    useState<LeadImportResponse | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const canSearch = !!selectedSource;

  // Schritt-Logik (Wizard)
  // 1: Source wählen, 2: Filter, 3: Suche, 4: Ergebnisse prüfen, 5: Import
  const currentStep = useMemo(() => {
    if (!selectedSource) return 1;
    if (!results.length && !isSearching && totalResults === null) return 2;
    if (isSearching) return 3;
    if (results.length && selectedLeadIds.size === 0) return 4;
    if (results.length && selectedLeadIds.size > 0) return 5;
    return 2;
  }, [selectedSource, results, isSearching, selectedLeadIds, totalResults]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Auth / Token
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error(error);
          setToast("Fehler beim Laden der Session.");
          return;
        }
        const token = data.session?.access_token ?? null;
        setAccessToken(token);
        if (!token) {
          setToast("Nicht eingeloggt – bitte neu einloggen.");
        }
      } catch (err) {
        console.error(err);
        setToast("Unerwarteter Auth-Fehler.");
      }
    };

    loadSession();
  }, []);

  // Sources laden
  useEffect(() => {
    const fetchSources = async () => {
      if (!accessToken) return;
      try {
        setSourcesLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/lead-discovery/sources`,
          {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: SourceInfo[] = await res.json();
        setSources(data);
      } catch (err) {
        console.error(err);
        setToast("Quellen konnten nicht geladen werden.");
      } finally {
        setSourcesLoading(false);
      }
    };

    fetchSources();
  }, [accessToken]);

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    if (!accessToken) throw new Error("Kein Auth-Token vorhanden.");

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${path}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(options.headers || {}),
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }

    return res.json();
  };

  const handleSourceChange = (source: LeadSourceKey) => {
    setSelectedSource(source);
    setResults([]);
    setTotalResults(null);
    setSelectedLeadIds(new Set());
    setPreviewLead(null);
    setImportFeedback(null);

    // Source-spezifische Defaults
    if (source === "reactivation") {
      setFilters((prev) => ({
        ...prev,
        last_contact_days: prev.last_contact_days || 90,
        radius_km: undefined,
      }));
    } else if (source === "google_maps") {
      setFilters((prev) => ({
        ...prev,
        radius_km: prev.radius_km || 10,
      }));
    }
  };

  const handleFilterChange = (
    key: keyof LeadFilters,
    value: string | number | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" ? undefined : value,
    }));
  };

  const handleSearch = async () => {
    if (!selectedSource || !accessToken) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      setResults([]);
      setTotalResults(null);
      setSelectedLeadIds(new Set());
      setPreviewLead(null);
      setImportFeedback(null);

      const body = {
        source: selectedSource,
        filters,
      };

      const data: LeadSearchResponse = await apiFetch(
        "/api/lead-discovery/search",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      setResults(data.leads);
      setTotalResults(data.total);
      if (!data.leads.length) {
        setToast("Keine Leads gefunden. Filter anpassen.");
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(
        err?.message || "Suche fehlgeschlagen. Bitte später erneut versuchen."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  };

  const selectAllLeads = () => {
    if (!results.length) return;
    setSelectedLeadIds(new Set(results.map((l) => l.id)));
  };

  const clearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  const handleImport = async (idsOverride?: string[]) => {
    const leadIds = idsOverride || Array.from(selectedLeadIds);
    if (!leadIds.length || !accessToken) return;

    try {
      setImporting(true);
      setImportFeedback(null);

      const body = {
        lead_ids: leadIds,
        source: selectedSource,
      };

      const data: LeadImportResponse = await apiFetch(
        "/api/lead-discovery/import",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      setImportFeedback(data);
      setToast(
        `Importiert: ${data.imported}, übersprungen: ${data.skipped}${
          data.errors.length ? " (Fehler siehe unten)" : ""
        }`
      );
    } catch (err: any) {
      console.error(err);
      setToast("Import fehlgeschlagen.");
    } finally {
      setImporting(false);
    }
  };

  const handleSingleImport = (id: string) => {
    handleImport([id]);
  };

  const getSourceLabel = (sourceKey: string): string => {
    const found = sources.find((s) => s.key === sourceKey);
    return found?.label || sourceKey;
  };

  const renderSourceSpecificInfo = (lead: LeadResult) => {
    if (lead.source === "reactivation") {
      return (
        <span className="text-[11px] text-slate-400">
          {lead.reason || "Länger nicht kontaktiert."}
        </span>
      );
    }
    if (lead.source === "linkedin") {
      return (
        <div className="text-[11px] text-slate-400">
          <div>{lead.reason}</div>
          {lead.email && <div>E-Mail: {lead.email}</div>}
        </div>
      );
    }
    if (lead.source === "google_maps") {
      return (
        <div className="text-[11px] text-slate-400">
          <div>{lead.reason}</div>
          {lead.address && <div>Adresse: {lead.address}</div>}
        </div>
      );
    }
    if (lead.source === "referrals") {
      return (
        <div className="text-[11px] text-slate-400">
          <div>{lead.reason}</div>
          {lead.referred_by && (
            <div>Empfohlen von: {lead.referred_by}</div>
          )}
        </div>
      );
    }
    return (
      <span className="text-[11px] text-slate-400">{lead.reason}</span>
    );
  };

  const averageScore = useMemo(() => {
    if (!results.length) return null;
    const sum = results.reduce((acc, r) => acc + (r.score || 0), 0);
    return Math.round(sum / results.length);
  }, [results]);

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Lead Discovery Engine
          </h1>
          <p className="text-sm text-slate-400">
            Finde neue Chancen über Reaktivierung, LinkedIn, Google Maps,
            Directories & Referrals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {averageScore !== null && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${getScoreColorClass(
                averageScore
              )}`}
            >
              Ø Score: {averageScore}/100
            </span>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-900/70 px-4 py-1.5 text-xs text-emerald-100 shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* Kein Token */}
      {!accessToken && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
            Du bist nicht eingeloggt. Bitte melde dich an, um die Lead
            Discovery Engine zu nutzen.
            <div className="mt-3">
              <button
                onClick={() => navigate("/login")}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
              >
                Zum Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {accessToken && (
        <div className="flex-1 overflow-hidden p-6">
          {/* Wizard Progress */}
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span
                className={`rounded-full px-2 py-0.5 ${
                  currentStep >= 1 ? "bg-emerald-600 text-white" : "bg-slate-800"
                }`}
              >
                1. Source
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  currentStep >= 2 ? "bg-emerald-600 text-white" : "bg-slate-800"
                }`}
              >
                2. Filter
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  currentStep >= 3 ? "bg-emerald-600 text-white" : "bg-slate-800"
                }`}
              >
                3. Suche
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  currentStep >= 4 ? "bg-emerald-600 text-white" : "bg-slate-800"
                }`}
              >
                4. Review
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  currentStep >= 5 ? "bg-emerald-600 text-white" : "bg-slate-800"
                }`}
              >
                5. Import
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {results.length
                ? `${results.length} Leads gefunden · ${selectedLeadIds.size} ausgewählt`
                : "Noch keine Leads geladen."}
            </div>
          </div>

          <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
            {/* Left: Source + Filters */}
            <div className="flex flex-col gap-4">
              {/* Sources */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">1. Quelle wählen</h2>
                  {sourcesLoading && (
                    <span className="text-[11px] text-slate-500">
                      Lädt…
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {sources.map((src) => {
                    const isActive = src.key === selectedSource;
                    return (
                      <button
                        key={src.key}
                        type="button"
                        onClick={() => handleSourceChange(src.key)}
                        className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-900"
                        }`}
                      >
                        <span className="text-[12px] font-semibold">
                          {src.label}
                        </span>
                        <span className="mt-1 text-[11px] text-slate-400">
                          {src.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filters */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-md flex-1 flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">
                    2. Filter setzen
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFilters(defaultFilters)}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Zurücksetzen
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">
                      Branche
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="z.B. Immobilien, Coaching…"
                      value={filters.industry || ""}
                      onChange={(e) =>
                        handleFilterChange("industry", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">
                      Region
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="z.B. Wien, DACH…"
                      value={filters.region || ""}
                      onChange={(e) =>
                        handleFilterChange("region", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">
                      Firmengröße
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={filters.company_size || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "company_size",
                          e.target.value || undefined
                        )
                      }
                    >
                      <option value="">Alle</option>
                      <option value="solo">Solo / Freelancer</option>
                      <option value="1-10">1–10</option>
                      <option value="11-50">11–50</option>
                      <option value="51-200">51–200</option>
                      <option value="200+">200+</option>
                    </select>
                  </div>

                  {selectedSource === "google_maps" && (
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Radius (km)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={filters.radius_km ?? ""}
                        onChange={(e) =>
                          handleFilterChange(
                            "radius_km",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                      />
                    </div>
                  )}

                  {selectedSource === "reactivation" && (
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Nicht kontaktiert seit (Tagen)
                      </label>
                      <input
                        type="number"
                        min={30}
                        max={730}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={filters.last_contact_days ?? 90}
                        onChange={(e) =>
                          handleFilterChange(
                            "last_contact_days",
                            Number(e.target.value) || 90
                          )
                        }
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    {searchError && (
                      <span className="text-red-400">{searchError}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!canSearch || isSearching}
                    onClick={handleSearch}
                    className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    {isSearching ? "Suche läuft…" : "3. Suche starten"}
                  </button>
                </div>
              </div>

              {/* Import Summary */}
              {importFeedback && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-200">
                  <div className="font-semibold mb-1">
                    Import-Ergebnis
                  </div>
                  <div>Importiert: {importFeedback.imported}</div>
                  <div>Übersprungen: {importFeedback.skipped}</div>
                  {importFeedback.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-red-300">
                      {importFeedback.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Right: Results + Preview + Import */}
            <div className="flex flex-col gap-4">
              {/* Results List */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex-1 flex flex-col min-h-[260px]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">
                      4. Ergebnisse prüfen
                    </h2>
                    {totalResults !== null && (
                      <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300">
                        {totalResults} gefunden
                      </span>
                    )}
                  </div>
                  {results.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllLeads}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 hover:border-emerald-500"
                      >
                        Alle auswählen
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-600"
                      >
                        Auswahl löschen
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {!results.length && !isSearching && (
                    <div className="text-xs text-slate-500">
                      Noch keine Ergebnisse. Starte eine Suche.
                    </div>
                  )}

                  {isSearching && (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="animate-pulse rounded-lg border border-slate-800 bg-slate-900/70 p-3"
                        >
                          <div className="mb-2 h-3 w-1/2 rounded bg-slate-800" />
                          <div className="mb-1 h-2 w-1/3 rounded bg-slate-800" />
                          <div className="mb-2 h-2 w-2/3 rounded bg-slate-800" />
                          <div className="mt-2 h-6 w-20 rounded bg-slate-800" />
                        </div>
                      ))}
                    </div>
                  )}

                  {results.map((lead) => {
                    const isSelected = selectedLeadIds.has(lead.id);
                    const scoreClass = getScoreColorClass(lead.score);

                    return (
                      <div
                        key={lead.id}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs transition-colors ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/5"
                            : "border-slate-800 bg-slate-900/70 hover:border-slate-600"
                        }`}
                      >
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-0"
                          />
                        </div>
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setPreviewLead(lead)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-[13px] font-semibold">
                                {lead.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {lead.company || "–"}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                Quelle: {getSourceLabel(lead.source)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${scoreClass}`}
                              >
                                {lead.score}/100
                              </span>
                            </div>
                          </div>
                          <div className="mt-1">
                            {renderSourceSpecificInfo(lead)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewLead(lead)}
                            className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSingleImport(lead.id)}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] text-white hover:bg-emerald-500"
                          >
                            Import
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview + Batch Import */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col md:flex-row gap-4">
                {/* Preview */}
                <div className="md:w-1/2">
                  <h3 className="text-xs font-semibold text-slate-300 mb-2">
                    Lead-Preview
                  </h3>
                  {previewLead ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
                      <div className="mb-1 text-[13px] font-semibold">
                        {previewLead.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mb-1">
                        {previewLead.company}
                      </div>
                      <div className="text-[11px] text-slate-400 mb-1">
                        Quelle: {getSourceLabel(previewLead.source)} · Score:{" "}
                        {previewLead.score}/100
                      </div>
                      <div className="mt-1 text-[11px] text-slate-300">
                        {previewLead.reason}
                      </div>
                      {previewLead.email && (
                        <div className="mt-1 text-[11px] text-slate-400">
                          E-Mail: {previewLead.email}
                        </div>
                      )}
                      {previewLead.phone && (
                        <div className="mt-1 text-[11px] text-slate-400">
                          Telefon: {previewLead.phone}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Wähle einen Lead für die Vorschau.
                    </div>
                  )}
                </div>

                {/* Batch Import */}
                <div className="md:w-1/2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-300 mb-2">
                      5. Import
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Wähle einzelne Leads oder importiere alle gefundenen
                      Leads dieser Quelle.
                    </p>
                    <ul className="text-[11px] text-slate-400 list-disc pl-4 space-y-1">
                      <li>Import setzt source & discovered_at im Kontakt.</li>
                      <li>
                        Reaktivierung: Kontakte bleiben, werden nur markiert.
                      </li>
                      <li>
                        Andere Quellen nutzen Mapping aus lead_enrichments
                        (MVP).
                      </li>
                    </ul>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!results.length || importing}
                      onClick={() => handleImport(results.map((r) => r.id))}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                    >
                      {importing ? "Importiere…" : "Alle importieren"}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedLeadIds.size || importing}
                      onClick={() => handleImport()}
                      className="rounded-md bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-800/60"
                    >
                      {importing
                        ? "Importiere Auswahl…"
                        : `Auswahl importieren (${selectedLeadIds.size})`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDiscoveryPage;

