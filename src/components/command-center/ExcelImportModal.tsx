/**
 * Excel/CSV Import Modal Component
 *
 * Allows bulk import of leads from Excel/CSV files with intelligent column mapping.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Supported file types
const ACCEPTED_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'text/csv': '.csv',
  'text/comma-separated-values': '.csv'
};

const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_TYPES);

// Column mapping suggestions (German → English)
const COLUMN_MAPPINGS = {
  // Name
  'name': ['name', 'Name', 'Vorname', 'Nachname', 'Full Name', 'voller name'],
  'first_name': ['first_name', 'vorname', 'First Name'],
  'last_name': ['last_name', 'nachname', 'Last Name'],

  // Contact
  'email': ['email', 'e-mail', 'Email', 'E-Mail', 'mail'],
  'phone': ['phone', 'telefon', 'Phone', 'Telefon', 'tel', 'mobile'],
  'whatsapp': ['whatsapp', 'WhatsApp', 'wa'],

  // Company
  'company': ['company', 'firma', 'Company', 'Firma', 'unternehmen'],

  // Social Media
  'instagram': ['instagram', 'Instagram', 'insta', '@instagram'],
  'facebook': ['facebook', 'Facebook', 'fb'],
  'linkedin': ['linkedin', 'LinkedIn', 'linked in'],

  // Status & Notes
  'status': ['status', 'Status', 'zustand', 'State'],
  'notes': ['notes', 'notizen', 'Notes', 'Notizen', 'bemerkungen', 'comments'],
  'last_contact_at': ['last_contact', 'letzte_kontakt', 'last contact', 'contact date'],

  // Score/Temperature
  'score': ['score', 'bewertung', 'rating', 'punkte'],
};

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ColumnMapping {
  [key: string]: string;
}

interface PreviewData {
  headers: string[];
  rows: any[][];
  mapping: ColumnMapping;
}

interface ImportResult {
  total_processed: number;
  created: number;
  updated: number;
  duplicates_skipped: number;
  errors: number;
  leads: any[];
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  onImportComplete
}: ExcelImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'importing' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state
  const resetModal = useCallback(() => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setImportResult(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    // Validate file type
    if (!Object.keys(ACCEPTED_TYPES).includes(selectedFile.type) &&
        !ACCEPTED_EXTENSIONS.some(ext => selectedFile.name.toLowerCase().endsWith(ext))) {
      setError('Bitte wählen Sie eine gültige Excel (.xlsx, .xls) oder CSV (.csv) Datei aus.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);

    try {
      const data = await parseFile(selectedFile);
      const headers = data[0];
      const rows = data.slice(1, 6); // Preview first 5 rows

      // Auto-map columns
      const autoMapping = autoMapColumns(headers);

      setPreviewData({
        headers,
        rows,
        mapping: autoMapping
      });

      setColumnMapping(autoMapping);
      setStep('preview');
    } catch (err) {
      setError('Fehler beim Lesen der Datei. Bitte prüfen Sie das Format.');
      console.error('File parsing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Parse Excel/CSV file
  const parseFile = async (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let parsedData: any[][];

          if (file.name.toLowerCase().endsWith('.csv')) {
            // Parse CSV
            const csvText = data as string;
            parsedData = csvText.split('\n').map(row =>
              row.split(',').map(cell => cell.replace(/"/g, '').trim())
            );
          } else {
            // Parse Excel
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          }

          // Filter out empty rows
          parsedData = parsedData.filter(row =>
            row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
          );

          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('File reading failed'));

      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  // Auto-map columns based on headers
  const autoMapColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {};

    headers.forEach((header, index) => {
      const headerLower = String(header).toLowerCase().trim();

      // Find matching field
      for (const [field, keywords] of Object.entries(COLUMN_MAPPINGS)) {
        if (keywords.some(keyword => headerLower.includes(keyword.toLowerCase()))) {
          mapping[field] = header;
          break;
        }
      }
    });

    return mapping;
  };

  // Update column mapping
  const updateMapping = (field: string, header: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: header
    }));
  };

  // Start import
  const handleImport = async () => {
    if (!file || !previewData) return;

    setIsProcessing(true);
    setStep('importing');
    setError(null);

    try {
      // Parse complete file
      const allData = await parseFile(file);
      const headers = allData[0];
      const rows = allData.slice(1);

      // Convert to lead objects
      const leads = rows.map(row => {
        const lead: any = {};

        // Map columns according to user selection
        Object.entries(columnMapping).forEach(([field, header]) => {
          if (header) {
            const headerIndex = headers.indexOf(header);
            if (headerIndex !== -1) {
              const value = row[headerIndex];
              if (value !== null && value !== undefined && String(value).trim() !== '') {
                lead[field] = String(value).trim();
              }
            }
          }
        });

        return lead;
      }).filter(lead => lead.name || lead.first_name); // Must have a name

      console.log('Prepared leads for import:', leads);

      // Send to backend
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/leads/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leads,
          merge_duplicates: mergeDuplicates,
          update_existing: updateExisting
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setImportResult(result);
      setStep('result');

      // Refresh parent after short delay
      setTimeout(() => {
        onImportComplete();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Import fehlgeschlagen');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      ['Name', 'Email', 'Telefon', 'Firma', 'Instagram', 'Status', 'Notizen'],
      ['Max Müller', 'max@example.com', '+49123456', 'Tech GmbH', '@maxmueller', 'Interessiert', 'Sehr interessiert an unserem Produkt'],
      ['Anna Schmidt', 'anna@example.com', '+49987654', 'Marketing AG', '@annaschmidt', 'Termin vereinbart', 'Rückruf am 15.01.'],
      ['Tom Weber', 'tom@example.com', '+49111222', 'Startup GmbH', '@tomweber', 'Kein Interesse', 'Nicht budgetiert']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'leads_import_template.xlsx');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#14202c] border border-cyan-500/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">Excel/CSV Import</h2>
              <p className="text-gray-400 text-sm">
                {step === 'upload' && 'Datei hochladen'}
                {step === 'preview' && `${previewData?.rows.length || 0} Zeilen erkannt`}
                {step === 'mapping' && 'Spalten zuordnen'}
                {step === 'importing' && 'Importiere...'}
                {step === 'result' && 'Import abgeschlossen'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetModal(); onClose(); }}
            className="text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium mb-1">Excel-Vorlage herunterladen</h3>
                  <p className="text-gray-400 text-sm">Verwenden Sie diese Vorlage für korrekte Spaltennamen</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Vorlage
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-cyan-500/30 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/60 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                <Upload className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-white text-lg font-medium mb-2">
                  Excel oder CSV Datei hier ablegen
                </h3>
                <p className="text-gray-400 mb-4">
                  Oder klicken Sie hier, um eine Datei auszuwählen
                </p>
                <p className="text-gray-500 text-sm">
                  Unterstützt: .xlsx, .xls, .csv • Max 10MB
                </p>
              </div>

              {/* File Info */}
              {file && (
                <div className="flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && previewData && (
            <div className="space-y-6">
              {/* Column Mapping */}
              <div>
                <h3 className="text-white font-medium mb-4">Spalten zuordnen</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(COLUMN_MAPPINGS).map(([field, keywords]) => (
                    <div key={field} className="space-y-2">
                      <label className="block text-gray-400 text-sm capitalize">
                        {field.replace('_', ' ')}
                      </label>
                      <select
                        value={columnMapping[field] || ''}
                        onChange={(e) => updateMapping(field, e.target.value)}
                        className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500"
                      >
                        <option value="">Nicht zuordnen</option>
                        {previewData.headers.map((header, idx) => (
                          <option key={idx} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <h3 className="text-white font-medium mb-4">Vorschau (erste 5 Zeilen)</h3>
                <div className="bg-[#0a0a0f] border border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50">
                        <tr>
                          {previewData.headers.map((header, idx) => (
                            <th key={idx} className="px-3 py-2 text-left text-gray-400 text-sm font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-t border-gray-800/50">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-3 py-2 text-gray-300 text-sm">
                                {String(cell || '').slice(0, 50)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Import Options */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Import-Optionen</h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={mergeDuplicates}
                      onChange={(e) => setMergeDuplicates(e.target.checked)}
                      className="rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-gray-300 text-sm">Duplikate zusammenführen (empfohlen)</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="rounded border-gray-600 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-gray-300 text-sm">Bestehende Leads aktualisieren</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
              <h3 className="text-white text-lg font-medium mb-2">Importiere Leads...</h3>
              <p className="text-gray-400">Dies kann einen Moment dauern</p>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="space-y-6">
              {/* Success Summary */}
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Import erfolgreich!</h3>
                <p className="text-gray-400">Ihre Leads wurden erfolgreich importiert</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{importResult.created}</div>
                  <div className="text-sm text-green-300">Erstellt</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{importResult.updated}</div>
                  <div className="text-sm text-blue-300">Aktualisiert</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{importResult.duplicates_skipped}</div>
                  <div className="text-sm text-yellow-300">Duplikate</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{importResult.errors}</div>
                  <div className="text-sm text-red-300">Fehler</div>
                </div>
              </div>

              {/* Close Button */}
              <div className="text-center pt-4">
                <button
                  onClick={() => { resetModal(); onClose(); }}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
                >
                  Fertig
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Navigation */}
        {step !== 'result' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-800 flex-shrink-0">
            <button
              onClick={() => {
                if (step === 'preview') setStep('upload');
                else { resetModal(); onClose(); }
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              {step === 'upload' ? 'Abbrechen' : 'Zurück'}
            </button>

            {step === 'upload' && file && (
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Weiter
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importiere...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Import starten
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
