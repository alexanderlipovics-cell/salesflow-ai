import { useCallback, useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

type ParsedContact = {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  notes?: string | null;
  source?: string | null;
  warm_score?: number;
};

type ParseResponse = {
  success: boolean;
  total_rows: number;
  columns_detected?: Record<string, string>;
  preview: ParsedContact[];
  all_contacts: ParsedContact[];
  message?: string;
};

type ImportError = { contact?: string; error: string };

type ImportResponse = {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  message?: string;
};

type ImportState = "idle" | "preview" | "importing" | "done" | "error";

const ImportPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const [state, setState] = useState<ImportState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<ParsedContact[]>([]);
  const [temperature, setTemperature] = useState<string>("cold");
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number>(0);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);

  const resetImport = () => {
    setParseResult(null);
    setSelectedContacts([]);
    setFileName(null);
    setState("idle");
    setErrorMessage(null);
    setImportMessage(null);
    setImportedCount(0);
    setImportErrors([]);
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!token) {
        setErrorMessage("Kein Token gefunden. Bitte erneut einloggen.");
        setState("error");
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setImportMessage(null);
      setImportErrors([]);
      setImportedCount(0);

      const formData = new FormData();
      formData.append("file", file);

      const endpoint = file.name.toLowerCase().endsWith(".vcf")
        ? "/api/csv-import/parse-vcf"
        : "/api/csv-import/parse";

      try {
        const res = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data: ParseResponse = await res.json();

        if (!res.ok || data.success === false) {
          throw new Error(
            (data as any)?.detail ||
              (data as any)?.message ||
              "Konnte Datei nicht parsen"
          );
        }

        setFileName(file.name);
        setParseResult(data);
        setSelectedContacts(data.all_contacts || []);
        setState("preview");
      } catch (err: any) {
        setErrorMessage(err?.message || "Fehler beim Parsen der Datei");
        setState("error");
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!parseResult || selectedContacts.length === 0) {
      setErrorMessage("Keine Kontakte zum Importieren vorhanden.");
      setState("error");
      return;
    }

    if (!token) {
      setErrorMessage("Kein Token gefunden. Bitte erneut einloggen.");
      setState("error");
      return;
    }

    setState("importing");
    setErrorMessage(null);
    setIsLoading(true);
    setImportErrors([]);
    setImportMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/csv-import/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: selectedContacts,
          default_temperature: temperature,
          skip_duplicates: skipDuplicates,
        }),
      });

      const data: ImportResponse = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(
          (data as any)?.detail ||
            (data as any)?.message ||
            "Import fehlgeschlagen"
        );
      }

      setImportedCount(data.imported || 0);
      setImportMessage(
        data.message || `Import abgeschlossen (${data.imported} Kontakte).`
      );
      setImportErrors(data.errors || []);
      setState("done");
    } catch (err: any) {
      setErrorMessage(err?.message || "Import fehlgeschlagen");
      setState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const previewHeaders = [
    "name",
    "first_name",
    "last_name",
    "email",
    "phone",
    "company",
    "position",
    "warm_score",
    "notes",
  ];

  const headerLabels: Record<string, string> = {
    name: "Name",
    first_name: "Vorname",
    last_name: "Nachname",
    email: "E-Mail",
    phone: "Telefon",
    company: "Firma",
    position: "Position",
    warm_score: "Warm Score",
    notes: "Notizen",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24">
        {/* Header */}
        <header className="rounded-2xl border border-white/5 bg-slate-950/70 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-400">
            Import & Setup
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <UploadCloud className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                CSV / VCF Lead Import
              </h1>
              <p className="text-sm text-slate-400">
                Lade eine CSV- oder VCF-Datei hoch, prüfe die Vorschau und
                importiere die Leads gesammelt.
              </p>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-auto rounded p-1 hover:bg-red-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Idle / Retry State */}
        {(state === "idle" || state === "error") && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-12 text-center transition hover:border-emerald-500/50 hover:bg-slate-950/80"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.vcf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <UploadCloud className="mx-auto h-12 w-12 text-slate-500" />
            <p className="mt-4 text-lg font-medium text-slate-300">
              Datei hierher ziehen oder klicken zum Auswählen
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Unterstützt: .csv (UTF-8 empfohlen) und .vcf (vCard)
            </p>
            <p className="mt-4 text-xs text-slate-600">
              Automatische Spaltenerkennung, Vorschau & Duplikat-Check
            </p>
          </div>
        )}

        {/* Preview State */}
        {state === "preview" && parseResult && (
          <>
            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-medium text-white">{fileName}</p>
                  <p className="text-xs text-slate-400">
                    {parseResult.total_rows} Zeilen erkannt
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Vorschau bereit
                </div>
                <button
                  onClick={resetImport}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Andere Datei
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h2 className="text-sm font-semibold text-white">
                  Erkannte Spalten
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Automatische Zuordnung basierend auf Spaltennamen.
                </p>
                <div className="mt-3 space-y-2">
                  {parseResult.columns_detected &&
                  Object.keys(parseResult.columns_detected).length > 0 ? (
                    Object.entries(parseResult.columns_detected).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200"
                        >
                          <span className="font-medium text-slate-300">
                            {headerLabels[key] || key}
                          </span>
                          <span className="text-slate-400">{value}</span>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-sm text-slate-400">
                      Keine Zuordnung erkannt. Wir verwenden Standardfelder.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h2 className="text-sm font-semibold text-white">
                  Import-Einstellungen
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Temperatur & Duplikat-Handling vor dem Import wählen.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                      Temperatur
                    </label>
                    <div className="relative mt-2">
                      <select
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 pr-10 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="cold">Cold</option>
                        <option value="warm">Warm</option>
                        <option value="hot">Hot</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                    />
                    <div>
                      <p className="font-medium text-white">
                        Duplikate überspringen
                      </p>
                      <p className="text-xs text-slate-400">
                        Prüft E-Mail & Telefonnummer (letzte 8 Ziffern).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Vorschau (erste {Math.min(10, parseResult.preview.length)}{" "}
                    Kontakte)
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Warm Score wird automatisch anhand der vorhandenen Felder
                    berechnet.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                  {parseResult.total_rows} insgesamt
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {previewHeaders.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500"
                        >
                          {headerLabels[header] || header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.preview.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50">
                        {previewHeaders.map((header) => (
                          <td
                            key={header}
                            className="whitespace-nowrap px-3 py-2 text-slate-300"
                          >
                            {(row as any)?.[header] ?? (
                              <span className="text-slate-600">–</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-500 py-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Wird gestartet..." : `Import starten (${parseResult.total_rows} Leads)`}
            </button>
          </>
        )}

        {/* Importing */}
        {state === "importing" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-400" />
            <p className="mt-4 text-lg font-medium text-white">
              Import läuft...
            </p>
            {parseResult && (
              <p className="mt-1 text-sm text-slate-400">
                {parseResult.total_rows} Kontakte in Warteschlange
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Duplikate werden übersprungen, fehlende Felder automatisch
              ergänzt.
            </p>
          </div>
        )}

        {/* Done */}
        {state === "done" && (
          <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-bold text-white">
              Import abgeschlossen!
            </h2>
            <p className="mt-2 text-lg text-emerald-200">
              {importedCount} Leads erfolgreich importiert
            </p>
            {importMessage && (
              <p className="text-sm text-slate-300">{importMessage}</p>
            )}
            {importErrors.length > 0 && (
              <div className="mx-auto max-w-3xl rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-left">
                <p className="text-sm font-semibold text-amber-200">
                  Einige Kontakte konnten nicht importiert werden:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-100">
                  {importErrors.map((err, idx) => (
                    <li key={idx}>
                      {err.contact ? `${err.contact}: ` : ""}
                      {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={resetImport}
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Weitere importieren
              </button>
              <a
                href="/hunter"
                className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Zum Hunter-Board →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPage;

