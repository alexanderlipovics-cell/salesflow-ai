import { useState } from "react";

type ImportSummary = {
  total_rows: number;
  imported_count: number;
  updated_count: number;
  needs_action_count: number;
  without_last_contact_count: number;
  errors?: string[] | null;
  total: number;
  with_ai_status: number;
  without_status: number;
  auto_scheduled_count: number;
  needs_manual_action_count: number;
};

const formatNumber = (value: number | undefined) =>
  typeof value === "number" ? value.toLocaleString("de-DE") : "0";

export function ImportCustomersPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<(ImportSummary & { message: string }) | null>(
    null,
  );

  const handleUpload = async () => {
    if (!file) {
      setError("Bitte zuerst eine CSV-Datei auswählen.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/customers", {
        method: "POST",
        body: formData,
      });

      const data: ImportSummary = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.detail || "Fehler beim Import.");
      }
      setSummary({
        ...data,
        message: `Import abgeschlossen: ${formatNumber(
          data.imported_count,
        )} von ${formatNumber(data.total_rows)} Kontakten importiert.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unbekannter Fehler beim Import.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/50">
      <header className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
          Import
        </p>
        <h2 className="text-lg font-semibold text-slate-100">Bestandskunden importieren</h2>
        <p className="text-sm text-slate-400">
          Lade eine CSV-Datei hoch (z.&nbsp;B. aus deinem bestehenden CRM), um sofort mit
          deinen Kontakten zu arbeiten.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
        <input
          type="file"
          accept=".csv"
          className="block w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-950 hover:border-slate-500"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setSummary(null);
            setError(null);
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Import läuft..." : "Import starten"}
          </button>
          {file && (
            <span className="text-xs text-slate-400">
              Ausgewählt: <span className="text-slate-100">{file.name}</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-4 space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-900/20 p-4 text-sm text-emerald-100">
          <p className="font-semibold text-emerald-200">{summary.message}</p>
          <dl className="grid gap-1 text-xs text-emerald-100 sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <dt className="text-emerald-300/80">Gesamtzeilen</dt>
              <dd>{formatNumber(summary.total_rows)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-emerald-300/80">Importiert</dt>
              <dd>{formatNumber(summary.imported_count)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-emerald-300/80">Aktualisiert</dt>
              <dd>{formatNumber(summary.updated_count)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-emerald-300/80">Brauchen Aktion</dt>
              <dd>{formatNumber(summary.needs_action_count)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-emerald-300/80">Ohne Status</dt>
              <dd>{formatNumber(summary.without_status)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-emerald-300/80">Auto geplante Aktionen</dt>
              <dd>{formatNumber(summary.auto_scheduled_count)}</dd>
            </div>
          </dl>

          {!!summary.errors?.length && (
            <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-900/20 p-3 text-amber-100">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Hinweise</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                {summary.errors.slice(0, 3).map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
                {summary.errors.length > 3 && (
                  <li>… {summary.errors.length - 3} weitere Meldungen</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ImportCustomersPanel;

