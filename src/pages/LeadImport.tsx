import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import ImportWizard from '../components/import/ImportWizard';
import { Button } from '../components/ui/button';

const LeadImport = () => {
  const navigate = useNavigate();
  const [isComplete, setIsComplete] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleImportComplete = (result: any) => {
    setImportResult(result);
    setIsComplete(true);
  };

  if (isComplete && importResult) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/lead-list')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Lead Liste
            </Button>
          </div>

          {/* Success/Error Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center mb-6">
              {importResult.errors && importResult.errors.length > 0 ? (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Import teilweise erfolgreich
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Einige Leads konnten nicht importiert werden
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Import erfolgreich!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Deine Kontakte wurden erfolgreich importiert
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {importResult.total_rows || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Gesamt Zeilen
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.imported || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Importiert
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {importResult.duplicates?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Duplikate
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importResult.errors?.length || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Fehler
                </div>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Fehler:
                </h3>
                <div className="space-y-2">
                  {importResult.errors.map((error: any, index: number) => (
                    <div
                      key={index}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3"
                    >
                      <div className="text-sm text-red-700 dark:text-red-400">
                        {error.message}
                      </div>
                      {error.row && (
                        <div className="text-xs text-red-600 dark:text-red-500 mt-1">
                          Zeile: {error.row}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicates */}
            {importResult.duplicates && importResult.duplicates.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Übersprungene Duplikate:
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {importResult.duplicates.slice(0, 5).map((duplicate: any, index: number) => (
                    <div
                      key={index}
                      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3"
                    >
                      <div className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                        {duplicate.name || 'Unbekannt'}
                      </div>
                      <div className="text-xs text-yellow-700 dark:text-yellow-500">
                        {duplicate.duplicate_reason}
                      </div>
                    </div>
                  ))}
                  {importResult.duplicates.length > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                      ... und {importResult.duplicates.length - 5} weitere
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate('/lead-list')}>
                Leads ansehen
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsComplete(false);
                  setImportResult(null);
                }}
              >
                Weitere Datei importieren
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/lead-list')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Lead Liste
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Kontakte importieren
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Lade deine Excel/CSV-Datei hoch und importiere deine Kontakte als Leads
            </p>
          </div>
        </div>

        {/* Import Wizard */}
        <ImportWizard onComplete={handleImportComplete} />
      </div>
    </div>
  );
};

export default LeadImport;
