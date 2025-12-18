import React, { useState, useCallback } from "react";
import { Upload, FileText, Check, AlertCircle, Download, X } from "lucide-react";

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  preview?: any[];
}

export default function CSVImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.split("\n");
    const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());

    const data = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = line.split(/[,;]/);
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i]?.trim() || "";
        });
        return row;
      });

    return { headers, data };
  };

  const mapZinzinoData = (data: any[]) => {
    return data.map((row) => ({
      name:
        row["name"] ||
        row["partner name"] ||
        row["partnername"] ||
        `${row["vorname"] || ""} ${row["nachname"] || ""}`.trim(),
      email: row["email"] || row["e-mail"] || "",
      rank: row["rank"] || row["rang"] || row["level"] || "Partner",
      leg: row["leg"] || row["bein"] || row["position"] || "left",
      credits: parseInt(row["credits"] || row["punkte"] || row["volume"] || "0"),
      status:
        row["status"] ||
        (row["active"] === "yes" ? "active" : row["active"] === "no" ? "inactive" : "inactive"),
      joined_at: row["joined"] || row["datum"] || row["registration date"] || null,
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "text/csv" || droppedFile?.name.endsWith(".csv")) {
      void handleFile(droppedFile);
    }
  }, []);

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);

    const text = await selectedFile.text();
    const { data } = parseCSV(text);
    const mapped = mapZinzinoData(data);

    setPreview(mapped.slice(0, 5));
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      const { data } = parseCSV(text);
      const mapped = mapZinzinoData(data);

      const response = await fetch("/api/network/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_members: mapped }),
      });

      const result = await response.json();
      setResult(result);

      if (result.success) {
        setTimeout(() => onImportComplete(), 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        imported: 0,
        errors: ["Import fehlgeschlagen. Bitte prüfe das Dateiformat."],
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `Name,Email,Rank,Leg,Credits,Status,Joined
Maria Schmidt,maria@example.com,Bronze,left,120,active,2024-08-15
Thomas Keller,thomas@example.com,Q-Team,right,45,active,2024-09-20
Peter Huber,peter@example.com,Partner,left,0,inactive,2024-07-01`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_import_template.csv";
    a.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team aus CSV importieren</h2>
          <p className="text-sm text-gray-500">
            Exportiere dein Team aus dem Zinzino Backoffice und lade es hier hoch
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <Download className="w-4 h-4" />
          Template
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-green-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">CSV-Datei hierher ziehen oder</p>
            <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              Datei auswählen
              <input
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>

      {preview && preview.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Vorschau (erste 5 Einträge)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500">Rang</th>
                  <th className="text-left py-2 px-3 text-gray-500">Bein</th>
                  <th className="text-left py-2 px-3 text-gray-500">Credits</th>
                  <th className="text-left py-2 px-3 text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="py-2 px-3">{row.name || "-"}</td>
                    <td className="py-2 px-3">{row.rank}</td>
                    <td className="py-2 px-3">{row.leg}</td>
                    <td className="py-2 px-3">{row.credits}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          row.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            result.success ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
          }`}
        >
          {result.success ? (
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Import erfolgreich!</p>
                <p className="text-sm text-green-600">{result.imported} Team-Mitglieder importiert</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">Import fehlgeschlagen</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {file && !result?.success && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="mt-6 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
        >
          {importing ? "Importiere..." : `Team importieren`}
        </button>
      )}

      <details className="mt-6">
        <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
          📖 Wie exportiere ich aus Zinzino Backoffice?
        </summary>
        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <p>
            <strong>1.</strong> Logge dich ins Zinzino Backoffice ein
          </p>
          <p>
            <strong>2.</strong> Gehe zu "My Team" oder "Genealogy"
          </p>
          <p>
            <strong>3.</strong> Klicke auf "Export" oder "Download CSV"
          </p>
          <p>
            <strong>4.</strong> Lade die Datei hier hoch
          </p>
          <p className="text-gray-500 mt-2">
            Tipp: Der Import erkennt automatisch die Zinzino Spaltenbezeichnungen.
          </p>
        </div>
      </details>
    </div>
  );
}

