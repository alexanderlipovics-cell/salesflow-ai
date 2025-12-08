import React from 'react';
import { ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface ColumnMapperProps {
  columns: string[];
  suggestedMapping: Record<string, string>;
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const LEAD_FIELDS = {
  name: { label: 'Name', required: true, description: 'Vorname Nachname' },
  email: { label: 'E-Mail', required: false, description: 'E-Mail-Adresse' },
  phone: { label: 'Telefon', required: false, description: 'Telefonnummer' },
  company: { label: 'Firma', required: false, description: 'Firmenname' },
  status: { label: 'Status', required: false, description: 'Lead-Status' },
  notes: { label: 'Notizen', required: false, description: 'Zusätzliche Informationen' }
};

const ColumnMapper: React.FC<ColumnMapperProps> = ({
  columns,
  suggestedMapping,
  mapping,
  onMappingChange,
  onNext
}) => {
  const handleFieldMapping = (leadField: string, csvColumn: string) => {
    const newMapping = { ...mapping };

    // Remove existing mapping for this CSV column
    Object.keys(newMapping).forEach(field => {
      if (newMapping[field] === csvColumn) {
        delete newMapping[field];
      }
    });

    // Set new mapping
    if (csvColumn) {
      newMapping[leadField] = csvColumn;
    } else {
      delete newMapping[leadField];
    }

    onMappingChange(newMapping);
  };

  const getMappedColumn = (leadField: string): string => {
    return mapping[leadField] || '';
  };

  const isFieldMapped = (leadField: string): boolean => {
    return !!mapping[leadField];
  };

  const isColumnUsed = (csvColumn: string): boolean => {
    return Object.values(mapping).includes(csvColumn);
  };

  const getRequiredFieldsCount = (): number => {
    return Object.values(LEAD_FIELDS).filter(field => field.required).length;
  };

  const getMappedRequiredFieldsCount = (): number => {
    return Object.entries(LEAD_FIELDS)
      .filter(([field, config]) => config.required && mapping[field])
      .length;
  };

  const canProceed = (): boolean => {
    return getMappedRequiredFieldsCount() === getRequiredFieldsCount();
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pflichtfelder zugeordnet
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {getMappedRequiredFieldsCount()} von {getRequiredFieldsCount()}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(getMappedRequiredFieldsCount() / getRequiredFieldsCount()) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Mapping Interface */}
      <div className="space-y-4">
        {Object.entries(LEAD_FIELDS).map(([field, config]) => (
          <div key={field} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {isFieldMapped(field) ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : config.required ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {config.label}
                    {config.required && <span className="text-red-500 ml-1">*</span>}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {config.description}
                  </p>
                </div>
              </div>

              {suggestedMapping[field] && !mapping[field] && (
                <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                  Vorschlag: {suggestedMapping[field]}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={getMappedColumn(field)}
                onChange={(e) => handleFieldMapping(field, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Nicht zuordnen</option>
                {columns.map(column => (
                  <option
                    key={column}
                    value={column}
                    disabled={isColumnUsed(column) && getMappedColumn(field) !== column}
                  >
                    {column}
                  </option>
                ))}
              </select>

              {getMappedColumn(field) && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <ArrowRight className="w-4 h-4" />
                  <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {getMappedColumn(field)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Unmapped Columns Warning */}
      {columns.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Nicht zugeordnete Spalten
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Diese Spalten aus deiner Datei werden nicht importiert:
          </p>
          <div className="flex flex-wrap gap-2">
            {columns
              .filter(col => !Object.values(mapping).includes(col))
              .map(col => (
                <span
                  key={col}
                  className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded"
                >
                  {col}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onPrev}>
          Zurück
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed()}
          className="px-6"
        >
          Vorschau
        </Button>
      </div>
    </div>
  );
};

export default ColumnMapper;
