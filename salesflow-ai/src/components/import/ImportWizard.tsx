import React, { useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import FileDropzone from './FileDropzone';
import ColumnMapper from './ColumnMapper';
import ImportPreview from './ImportPreview';

interface ImportWizardProps {
  onComplete: (result: any) => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

const ImportWizard: React.FC<ImportWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [suggestedMapping, setSuggestedMapping] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const steps: Step[] = [
    {
      id: 'upload',
      title: 'Datei hochladen',
      description: 'Wähle deine CSV oder Excel-Datei aus',
      component: FileDropzone
    },
    {
      id: 'mapping',
      title: 'Spalten zuordnen',
      description: 'Ordne die Spalten aus deiner Datei den Lead-Feldern zu',
      component: ColumnMapper
    },
    {
      id: 'preview',
      title: 'Vorschau & Import',
      description: 'Überprüfe die Daten und starte den Import',
      component: ImportPreview
    }
  ];

  const handleFileSelected = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);

    try {
      // Detect columns and suggested mapping
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/leads/import/columns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Fehler beim Analysieren der Datei');
      }

      const data = await response.json();
      setColumns(data.columns || []);
      setSuggestedMapping(data.suggested_mapping || {});
      setTotalRows(data.row_count || 0);

      // Auto-apply suggested mapping
      setMapping(data.suggested_mapping || {});
    } catch (error) {
      console.error('Error detecting columns:', error);
      // Fallback: just set the file
    }
  }, []);

  const handleMappingChange = useCallback((newMapping: Record<string, string>) => {
    setMapping(newMapping);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!file || !mapping) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));

      const response = await fetch('/api/leads/import/preview', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Vorschau');
      }

      const data = await response.json();

      if (data.success) {
        setPreviewData(data.preview || []);
        setTotalRows(data.total_rows || 0);
      } else {
        throw new Error(data.error || 'Vorschau fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error creating preview:', error);
      alert('Fehler beim Erstellen der Vorschau: ' + error);
    }
  }, [file, mapping]);

  const handleImport = useCallback(async () => {
    if (!file || !mapping) return;

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('skip_duplicates', 'true');

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Import fehlgeschlagen');
      }

      const result = await response.json();
      onComplete(result);
    } catch (error) {
      console.error('Import error:', error);
      alert('Import fehlgeschlagen: ' + error);
    } finally {
      setIsImporting(false);
    }
  }, [file, mapping, onComplete]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentComponent = steps[currentStep].component;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Step Indicator */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index < currentStep
                  ? 'bg-green-500 border-green-500 text-white'
                  : index === currentStep
                    ? 'border-blue-500 text-blue-500'
                    : 'border-gray-300 text-gray-400'
              }`}>
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {steps[currentStep].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        <CurrentComponent
          file={file}
          onFileSelected={handleFileSelected}
          columns={columns}
          suggestedMapping={suggestedMapping}
          mapping={mapping}
          onMappingChange={handleMappingChange}
          previewData={previewData}
          onPreview={handlePreview}
          onImport={handleImport}
          totalRows={totalRows}
          isImporting={isImporting}
          onNext={nextStep}
          onPrev={prevStep}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === steps.length - 1}
        />
      </div>
    </div>
  );
};

export default ImportWizard;
