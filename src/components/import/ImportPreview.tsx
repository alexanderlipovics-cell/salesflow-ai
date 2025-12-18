import React, { useEffect } from 'react';
import { Eye, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface ImportPreviewProps {
  previewData: any[];
  onPreview: () => void;
  onImport: () => void;
  totalRows: number;
  isImporting: boolean;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const ImportPreview: React.FC<ImportPreviewProps> = ({
  previewData,
  onPreview,
  onImport,
  totalRows,
  isImporting,
  onPrev
}) => {
  useEffect(() => {
    // Auto-generate preview when component mounts
    if (previewData.length === 0) {
      onPreview();
    }
  }, [onPreview, previewData.length]);

  const hasErrors = previewData.some(row => row.error);
  const validRows = previewData.filter(row => !row.error);

  return (
    <div className="space-y-6">
      {/* Preview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Gesamt Zeilen
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {totalRows}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Vorschau OK
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {validRows.length}
              </p>
            </div>
          </div>
        </div>

        {hasErrors && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Fehler
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {previewData.filter(row => row.error).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Daten-Vorschau (erste 5 Zeilen)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            So werden deine Daten importiert
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">#</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">E-Mail</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Telefon</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Firma</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                    {row.preview_row || index + 1}
                  </td>
                  {row.error ? (
                    <td colSpan={6} className="p-3">
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-700 dark:text-red-400">
                            Fehler: {row.error}
                          </span>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                        {row.name || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                        {row.email || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                        {row.phone || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                        {row.company || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-white">
                        {row.status || 'new'}
                      </td>
                      <td className="p-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Settings */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Import-Einstellungen
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Duplikate werden automatisch übersprungen (E-Mail oder Telefon)</li>
          <li>• Leere Pflichtfelder werden mit Standardwerten gefüllt</li>
          <li>• Status wird auf "new" gesetzt, falls nicht zugeordnet</li>
          <li>• Alle Leads werden als "csv_import" markiert</li>
        </ul>
      </div>

      {/* Import Warnings */}
      {totalRows > 1000 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Große Datei erkannt
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Du importierst {totalRows} Zeilen. Das kann einen Moment dauern.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onPrev} disabled={isImporting}>
          Zurück
        </Button>
        <Button
          onClick={onImport}
          disabled={isImporting || hasErrors}
          className="px-6"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importiere...
            </>
          ) : (
            `Import starten (${totalRows} Zeilen)`
          )}
        </Button>
      </div>
    </div>
  );
};

export default ImportPreview;
