import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CsvRow = Record<string, string>;

type FieldMapping = {
  name: string | null;
  phone: string | null;
  instagram: string | null;
  company: string | null;
  vertical: string | null;
};

type ImportState = "idle" | "preview" | "importing" | "done" | "error";

const VERTICAL_OPTIONS = [
  { value: "generic", label: "Generic (Standard)" },
  { value: "network", label: "Network Marketing" },
  { value: "immo", label: "Immobilien" },
  { value: "finance", label: "Finanzen" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ImportPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Data
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  // Mapping
  const [mapping, setMapping] = useState<FieldMapping>({
    name: null,
    phone: null,
    instagram: null,
    company: null,
    vertical: null,
  });
  const [defaultVertical, setDefaultVertical] = useState<string>("generic");

  // Import State
  const [state, setState] = useState<ImportState>("idle");
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // File Handling
  // ───────────────────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMessage("Bitte nur .csv Dateien hochladen.");
      setState("error");
      return;
    }

    setFileName(file.name);
    setErrorMessage(null);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrorMessage(`CSV Fehler: ${results.errors[0].message}`);
          setState("error");
          return;
        }

        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);

        // Auto-detect mapping based on common column names
        const autoMapping: FieldMapping = {
          name: headers.find((h) =>
            /^(name|vorname|nachname|kontakt|full.?name)$/i.test(h)
          ) || null,
          phone: headers.find((h) =>
            /^(phone|telefon|tel|handy|mobile|nummer)$/i.test(h)
          ) || null,
          instagram: headers.find((h) =>
            /^(instagram|insta|ig|social)$/i.test(h)
          ) || null,
          company: headers.find((h) =>
            /^(company|firma|unternehmen|business)$/i.test(h)
          ) || null,
          vertical: headers.find((h) =>
            /^(vertical|branche|kategorie|type)$/i.test(h)
          ) || null,
        };

        setMapping(autoMapping);
        setState("preview");
      },
      error: (error) => {
        setErrorMessage(`Fehler beim Lesen: ${error.message}`);
        setState("error");
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const resetImport = () => {
    setCsvHeaders([]);
    setCsvData([]);
    setFileName(null);
    setMapping({ name: null, phone: null, instagram: null, company: null, vertical: null });
    setProgress(0);
    setImportedCount(0);
    setErrorMessage(null);
    setState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Import Logic
  // ───────────────────────────────────────────────────────────────────────────

  const startImport = async () => {
    if (!mapping.name) {
      setErrorMessage("Bitte mindestens das Feld 'Name' zuordnen.");
      return;
    }

    setState("importing");
    setProgress(0);
    setImportedCount(0);
    setErrorMessage(null);

    const total = csvData.length;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      const row = csvData[i];

      // Extract values from CSV row based on mapping
      const leadData = {
        name: mapping.name ? row[mapping.name]?.trim() || null : null,
        phone: mapping.phone ? row[mapping.phone]?.trim() || null : null,
        instagram: mapping.instagram ? row[mapping.instagram]?.trim() || null : null,
        company: mapping.company ? row[mapping.company]?.trim() || null : null,
        vertical: mapping.vertical
          ? row[mapping.vertical]?.trim()?.toLowerCase() || defaultVertical
          : defaultVertical,
        status: "new",
        source: "csv_import",
      };

      // Skip rows without name
      if (!leadData.name) {
        setProgress(Math.round(((i + 1) / total) * 100));
        continue;
      }

      try {
        // 1. Insert Lead
        const { data: newLead, error: leadError } = await supabaseClient
          .from("leads")
          .insert(leadData)
          .select("id")
          .single();

        if (leadError) {
          console.error("Lead insert error:", leadError);
          continue;
        }

        // 2. Create Hunter Task for this Lead
        if (newLead?.id) {
          const { error: taskError } = await supabaseClient
            .from("lead_tasks")
            .insert({
              lead_id: newLead.id,
              task_type: "hunter",
              status: "open",
              note: `Importiert aus ${fileName}`,
            });

          if (taskError) {
            console.error("Task insert error:", taskError);
          }
        }

        successCount++;
      } catch (err) {
        console.error("Import error for row:", row, err);
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      setImportedCount(successCount);
    }

    setState("done");
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 p-4 pb-24">
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
              <h1 className="text-2xl font-semibold text-white">CSV Lead Import</h1>
              <p className="text-sm text-slate-400">
                Importiere Leads aus einer CSV-Datei direkt ins Hunter-Board.
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

        {/* State: Idle - Drag & Drop Zone */}
        {state === "idle" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-12 text-center transition hover:border-emerald-500/50 hover:bg-slate-950/80"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <UploadCloud className="mx-auto h-12 w-12 text-slate-500" />
            <p className="mt-4 text-lg font-medium text-slate-300">
              CSV-Datei hierher ziehen
            </p>
            <p className="mt-1 text-sm text-slate-500">
              oder klicken zum Auswählen
            </p>
            <p className="mt-4 text-xs text-slate-600">
              Unterstützt: .csv mit Kopfzeile
            </p>
          </div>
        )}

        {/* State: Preview - Show Data & Mapping */}
        {state === "preview" && (
          <>
            {/* File Info */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-medium text-white">{fileName}</p>
                  <p className="text-xs text-slate-400">{csvData.length} Zeilen gefunden</p>
                </div>
              </div>
              <button
                onClick={resetImport}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Andere Datei
              </button>
            </div>

            {/* Mapping Interface */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="text-lg font-semibold text-white">Spalten zuordnen</h2>
              <p className="mt-1 text-sm text-slate-400">
                Ordne die CSV-Spalten den Datenbank-Feldern zu.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* Name (Required) */}
                <MappingSelect
                  label="Name"
                  required
                  value={mapping.name}
                  options={csvHeaders}
                  onChange={(v) => setMapping((m) => ({ ...m, name: v }))}
                />

                {/* Phone */}
                <MappingSelect
                  label="Telefon"
                  value={mapping.phone}
                  options={csvHeaders}
                  onChange={(v) => setMapping((m) => ({ ...m, phone: v }))}
                />

                {/* Instagram */}
                <MappingSelect
                  label="Instagram"
                  value={mapping.instagram}
                  options={csvHeaders}
                  onChange={(v) => setMapping((m) => ({ ...m, instagram: v }))}
                />

                {/* Company */}
                <MappingSelect
                  label="Firma"
                  value={mapping.company}
                  options={csvHeaders}
                  onChange={(v) => setMapping((m) => ({ ...m, company: v }))}
                />

                {/* Vertical from CSV */}
                <MappingSelect
                  label="Vertical (aus CSV)"
                  value={mapping.vertical}
                  options={csvHeaders}
                  onChange={(v) => setMapping((m) => ({ ...m, vertical: v }))}
                />

                {/* Default Vertical */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Standard-Vertical
                  </label>
                  <div className="relative mt-2">
                    <select
                      value={defaultVertical}
                      onChange={(e) => setDefaultVertical(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 pr-10 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {VERTICAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="text-lg font-semibold text-white">Vorschau (erste 5 Zeilen)</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {csvHeaders.slice(0, 6).map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50">
                        {csvHeaders.slice(0, 6).map((header) => (
                          <td key={header} className="whitespace-nowrap px-3 py-2 text-slate-300">
                            {row[header] || <span className="text-slate-600">–</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Button */}
            <button
              onClick={startImport}
              disabled={!mapping.name}
              className="w-full rounded-xl bg-emerald-500 py-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import starten ({csvData.length} Leads)
            </button>
          </>
        )}

        {/* State: Importing - Progress */}
        {state === "importing" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-400" />
            <p className="mt-4 text-lg font-medium text-white">Import läuft...</p>
            <p className="mt-1 text-sm text-slate-400">
              {importedCount} von {csvData.length} Leads importiert
            </p>

            {/* Progress Bar */}
            <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-emerald-400">{progress}%</p>
          </div>
        )}

        {/* State: Done - Success */}
        {state === "done" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-bold text-white">Import abgeschlossen!</h2>
            <p className="mt-2 text-lg text-emerald-200">
              {importedCount} Leads erfolgreich importiert
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Die Leads sind jetzt im Hunter-Board verfügbar.
            </p>

            <div className="mt-8 flex justify-center gap-4">
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

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Select Component
// ─────────────────────────────────────────────────────────────────────────────

type MappingSelectProps = {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  required?: boolean;
};

const MappingSelect = ({ label, value, options, onChange, required }: MappingSelectProps) => (
  <div>
    <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative mt-2">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 pr-10 text-sm text-white focus:border-emerald-500 focus:outline-none"
      >
        <option value="">– Nicht zuordnen –</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  </div>
);

export default ImportPage;
