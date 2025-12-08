import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface FileDropzoneProps {
  file: File | null;
  onFileSelected: (file: File) => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  file,
  onFileSelected,
  onNext
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return 'Nur CSV und Excel-Dateien (.csv, .xlsx, .xls) sind erlaubt';
    }

    if (file.size > maxSize) {
      return 'Datei ist zu groß. Maximale Größe: 10MB';
    }

    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const selectedFile = files[0];
      const validationError = validateFile(selectedFile);

      if (validationError) {
        setError(validationError);
        return;
      }

      onFileSelected(selectedFile);
    }
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const validationError = validateFile(selectedFile);

      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onFileSelected(selectedFile);
    }
  }, [onFileSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = () => {
    onFileSelected(null as any);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-full ${isDragOver ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <Upload className={`w-8 h-8 ${isDragOver ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                {isDragOver ? 'Datei hier ablegen' : 'Datei hierhin ziehen oder klicken'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                CSV oder Excel-Dateien (.csv, .xlsx, .xls) bis 10MB
              </p>
            </div>

            <div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input">
                <Button variant="outline" className="cursor-pointer">
                  Datei auswählen
                </Button>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Supported Formats */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Unterstützte Formate
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• CSV-Dateien (.csv) - Komma oder Semikolon getrennt</li>
          <li>• Excel-Dateien (.xlsx, .xls) - alle Versionen</li>
          <li>• Maximale Dateigröße: 10MB</li>
          <li>• Empfohlen: UTF-8 Kodierung für CSV-Dateien</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={onNext}
          disabled={!file || !!error}
          className="px-6"
        >
          Weiter
        </Button>
      </div>
    </div>
  );
};

export default FileDropzone;
