import React, { useState, useCallback } from "react";
import { Upload, X, FileSpreadsheet, Check } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportLeadsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ImportLeadsDialog({ isOpen, onClose, onImportComplete }: ImportLeadsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);

  const leadFields = [
    { key: "name", label: "Name", required: true },
    { key: "email", label: "Email", required: false },
    { key: "phone", label: "Telefon", required: false },
    { key: "company", label: "Firma", required: false },
    { key: "status", label: "Status", required: false },
    { key: "temperature", label: "Temperatur (cold/warm/hot)", required: false },
    { key: "notes", label: "Notizen", required: false },
    { key: "source", label: "Quelle", required: false },
  ];

  const autoMapColumns = useCallback((fields: string[]) => {
    const autoMapping: Record<string, string> = {};
    fields.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes("name") || lower.includes("vorname")) autoMapping["name"] = header;
      if (lower.includes("email") || lower.includes("mail")) autoMapping["email"] = header;
      if (lower.includes("phone") || lower.includes("telefon") || lower.includes("tel")) autoMapping["phone"] = header;
      if (lower.includes("firma") || lower.includes("company") || lower.includes("unternehmen")) autoMapping["company"] = header;
      if (lower.includes("status")) autoMapping["status"] = header;
      if (lower.includes("notiz") || lower.includes("note")) autoMapping["notes"] = header;
    });
    setMapping(autoMapping);
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setResult(null);

      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "xlsx" || fileExtension === "xls") {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[]; // rows as arrays

        const fileHeaders = (jsonData[0] as string[]) || [];
        const rows = jsonData.slice(1, 6).map((row: any) => {
          const obj: Record<string, any> = {};
          fileHeaders.forEach((h, i) => {
            obj[h] = row?.[i];
          });
          return obj;
        });

        setHeaders(fileHeaders);
        setPreview(rows);
        autoMapColumns(fileHeaders);
      } else {
        Papa.parse(selectedFile, {
          header: true,
          preview: 5,
          skipEmptyLines: true,
          complete: (results) => {
            const fields = results.meta.fields || [];
            setHeaders(fields);
            setPreview(results.data as any[]);
            autoMapColumns(fields);
          },
        });
      }
    },
    [autoMapColumns]
  );

  const handleImport = async () => {
    if (!file || !mapping.name) return;

    setImporting(true);

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    let allRows: any[] = [];

    if (fileExtension === "xlsx" || fileExtension === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[];
      const fileHeaders = (jsonData[0] as string[]) || [];
      allRows = jsonData.slice(1).map((row: any) => {
        const obj: Record<string, any> = {};
        fileHeaders.forEach((h, i) => {
          obj[h] = row?.[i];
        });
        return obj;
      });
    } else {
      await new Promise<void>((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            allRows = results.data as any[];
            resolve();
          },
        });
      });
    }

    const leads = allRows
      .map((row: any) => ({
        name: row[mapping.name] || "Unbekannt",
        email: mapping.email ? row[mapping.email] : null,
        phone: mapping.phone ? row[mapping.phone] : null,
        company: mapping.company ? row[mapping.company] : null,
        status: mapping.status ? row[mapping.status] : "new",
        temperature: mapping.temperature ? row[mapping.temperature] : "warm",
        notes: mapping.notes ? row[mapping.notes] : null,
        source: mapping.source ? row[mapping.source] : "csv_import",
      }))
      .filter((lead) => lead.name && lead.name !== "Unbekannt");

    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ leads }),
      });

      const data = await response.json();
      setResult({ success: data.imported || leads.length, errors: data.errors || 0 });

      setTimeout(() => {
        onImportComplete();
        onClose();
        setFile(null);
        setPreview([]);
        setMapping({});
      }, 2000);
    } catch (error) {
      setResult({ success: 0, errors: allRows.length });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl mx-4 border border-slate-800 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Leads importieren
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {!file && (
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-white mb-2">CSV-Datei hierher ziehen</p>
              <p className="text-gray-500 text-sm mb-4">oder klicken zum Auswählen</p>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer inline-block">
                Datei auswählen
              </label>
            </div>
          )}

          {file && !result && (
            <>
              <div className="mb-4 p-3 bg-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-white">{file.name}</span>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview([]);
                    setMapping({});
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-white font-medium mb-3">Spalten zuordnen:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {leadFields.map((field) => (
                    <div key={field.key} className="flex flex-col">
                      <label className="text-sm text-gray-400 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={mapping[field.key] || ""}
                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="">-- Nicht importieren --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-white font-medium mb-2">Vorschau (erste 5 Zeilen):</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        {headers.slice(0, 5).map((h) => (
                          <th key={h} className="text-left py-2 px-2 text-gray-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-slate-800">
                          {headers.slice(0, 5).map((h) => (
                            <td key={h} className="py-2 px-2 text-white truncate max-w-[150px]">
                              {row[h]}
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
                disabled={!mapping.name || importing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importiere...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Leads importieren
                  </>
                )}
              </button>
            </>
          )}

          {result && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Import abgeschlossen!</h3>
              <p className="text-gray-400">
                {result.success} Leads erfolgreich importiert
                {result.errors > 0 && `, ${result.errors} Fehler`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

