/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MLM IMPORT SERVICE                                                         ║
 * ║  Service für MLM CSV Import API Calls                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { API_CONFIG } from './apiConfig';

export interface ImportPreviewResponse {
  detected_format?: string;
  detected_columns: string[];
  suggested_mapping: Record<string, string>;
  sample_rows: any[];
  total_rows: number;
  estimated_duplicates: number;
}

export interface ImportProgress {
  current: number;
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
}

export interface ImportResult {
  batch_id: string;
  total_rows: number;
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
  error_details: any[];
}

class MLMImportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  /**
   * Erkennt das Format der CSV-Datei
   */
  async detectFormat(
    file: any,
    accessToken: string | null
  ): Promise<{ format: string; confidence: number }> {
    try {
      const formData = new FormData();
      
      // Handle clipboard vs file
      if (file.source === 'clipboard' && file.content) {
        // For clipboard, we need to create a blob
        const blob = new Blob([file.content], { type: 'text/csv' });
        formData.append('file', blob as any, file.name || 'clipboard.csv');
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: 'text/csv',
        } as any);
      }

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Use preview endpoint to detect format
      const response = await fetch(`${this.baseUrl}/mlm-import/preview`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Format-Erkennung fehlgeschlagen');
      }

      const data = await response.json();
      
      // Try to detect format from detected columns
      const format = this.detectFormatFromColumns(data.detected_columns);
      
      return {
        format,
        confidence: 0.8, // Could be improved with better detection
      };
    } catch (error: any) {
      throw new Error(`Format-Erkennung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Erstellt eine Vorschau des Imports
   */
  async getPreview(
    file: any,
    mlmCompany: string,
    accessToken: string | null
  ): Promise<ImportPreviewResponse> {
    try {
      const formData = new FormData();
      
      // Handle clipboard vs file
      if (file.source === 'clipboard' && file.content) {
        const blob = new Blob([file.content], { type: 'text/csv' });
        formData.append('file', blob as any, file.name || 'clipboard.csv');
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: 'text/csv',
        } as any);
      }
      
      formData.append('mlm_company', mlmCompany);

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.baseUrl}/mlm-import/preview`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Preview-Fehler');
      }

      const data = await response.json();
      
      // Detect format
      const detectedFormat = this.detectFormatFromColumns(data.detected_columns);
      
      return {
        ...data,
        detected_format: detectedFormat,
      };
    } catch (error: any) {
      throw new Error(`Preview-Fehler: ${error.message}`);
    }
  }

  /**
   * Führt den Import aus
   */
  async executeImport(
    file: any,
    mlmCompany: string,
    fieldMapping: Record<string, string>,
    skipDuplicates: boolean,
    syncMode: 'once' | 'weekly',
    accessToken: string | null,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    try {
      const formData = new FormData();
      
      // Handle clipboard vs file
      if (file.source === 'clipboard' && file.content) {
        const blob = new Blob([file.content], { type: 'text/csv' });
        formData.append('file', blob as any, file.name || 'clipboard.csv');
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: 'text/csv',
        } as any);
      }
      
      formData.append('mlm_company', mlmCompany);
      formData.append('field_mapping', JSON.stringify(fieldMapping));
      formData.append('skip_duplicates', skipDuplicates.toString());
      formData.append('sync_mode', syncMode);

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.baseUrl}/mlm-import/execute`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Import-Fehler');
      }

      const result = await response.json();
      
      // Simulate progress updates if callback provided
      if (onProgress) {
        const total = result.total_rows || 0;
        for (let i = 0; i <= total; i += Math.max(1, Math.floor(total / 10))) {
          onProgress({
            current: Math.min(i, total),
            total,
            imported: Math.floor((i / total) * result.imported),
            skipped: Math.floor((i / total) * result.skipped),
            errors: Math.floor((i / total) * result.errors),
            duplicates: Math.floor((i / total) * result.duplicates),
          });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return result;
    } catch (error: any) {
      throw new Error(`Import-Fehler: ${error.message}`);
    }
  }

  /**
   * Erkennt das Format basierend auf Spaltennamen
   */
  private detectFormatFromColumns(columns: string[]): string {
    const columnStr = columns.join(' ').toLowerCase();
    
    // doTERRA detection
    if (columnStr.includes('member id') || columnStr.includes('pv') || columnStr.includes('ov')) {
      return 'doTERRA Virtual Office';
    }
    
    // Herbalife detection
    if (columnStr.includes('distributor id') || columnStr.includes('vp') || columnStr.includes('ppv')) {
      return 'Herbalife MyHerbalife';
    }
    
    // Zinzino detection
    if (columnStr.includes('partner id') && columnStr.includes('zinzino')) {
      return 'Zinzino';
    }
    
    // PM-International detection
    if (columnStr.includes('partner-nr') || columnStr.includes('fitline')) {
      return 'PM-International (FitLine)';
    }
    
    return 'Standard CSV';
  }
}

export const mlmImportService = new MLMImportService();

