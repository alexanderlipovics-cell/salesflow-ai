/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DATA IMPORT SCREEN                                                        ║
 * ║  CSV/Excel Import für Bestandskunden                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 * - Datei-Upload (CSV, Excel)
 * - Automatische Spaltenerkennung
 * - Feldmapping-Vorschau
 * - Import-Fortschritt
 * - Ergebnis-Zusammenfassung
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';

// Types
interface FieldMapping {
  csv_column: string;
  db_field: string;
}

interface PreviewRow {
  row_number: number;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
  is_duplicate: boolean;
}

interface PreviewResponse {
  detected_columns: string[];
  suggested_mappings: Record<string, string>;
  preview_rows: PreviewRow[];
  total_rows: number;
  estimated_duplicates: number;
}

interface ImportResult {
  import_id: string;
  status: string;
  total_rows: number;
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
}

// Feldbezeichnungen für UI
const FIELD_LABELS: Record<string, string> = {
  first_name: 'Vorname',
  last_name: 'Nachname',
  name: 'Vollständiger Name',
  email: 'E-Mail',
  phone: 'Telefon',
  company: 'Firma',
  position: 'Position',
  status: 'Status',
  source: 'Quelle',
  notes: 'Notizen',
  city: 'Stadt',
  country: 'Land',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tags: 'Tags',
};

export default function DataImportScreen({ navigation }: any) {
  const { user, session } = useAuth();
  
  // State
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Datei auswählen
  const pickDocument = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        await uploadForPreview(file);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Fehler', 'Datei konnte nicht ausgewählt werden');
    }
  }, []);

  // Preview-Upload
  const uploadForPreview = async (file: DocumentPicker.DocumentPickerAsset) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'text/csv',
        name: file.name,
      } as any);

      const response = await fetch(`${API_CONFIG.baseUrl}/import/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Preview fehlgeschlagen');
      }

      const data: PreviewResponse = await response.json();
      setPreview(data);
      setMappings(data.suggested_mappings);
      setStep('preview');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error: any) {
      console.error('Preview error:', error);
      Alert.alert('Fehler', error.message || 'Datei konnte nicht verarbeitet werden');
    } finally {
      setIsLoading(false);
    }
  };

  // Import ausführen
  const executeImport = async () => {
    if (!selectedFile || !preview) return;
    
    setStep('importing');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || 'text/csv',
        name: selectedFile.name,
      } as any);
      
      const config = {
        field_mappings: Object.entries(mappings).map(([csv_column, db_field]) => ({
          csv_column,
          db_field,
        })),
        skip_duplicates: skipDuplicates,
        default_status: 'warm',
        default_source: 'csv_import',
        tags: ['importiert'],
      };
      
      formData.append('config', JSON.stringify(config));

      const response = await fetch(`${API_CONFIG.baseUrl}/import/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Import fehlgeschlagen');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep('result');
      
      Haptics.notificationAsync(
        result.status === 'completed' 
          ? Haptics.NotificationFeedbackType.Success 
          : Haptics.NotificationFeedbackType.Warning
      );
      
    } catch (error: any) {
      console.error('Import error:', error);
      Alert.alert('Fehler', error.message || 'Import fehlgeschlagen');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Import (ohne Preview)
  const quickImport = async () => {
    if (!selectedFile) return;
    
    setStep('importing');
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || 'text/csv',
        name: selectedFile.name,
      } as any);

      const response = await fetch(`${API_CONFIG.baseUrl}/import/quick-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Import fehlgeschlagen');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep('result');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error: any) {
      console.error('Quick import error:', error);
      Alert.alert('Fehler', error.message || 'Import fehlgeschlagen');
      setStep('upload');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset
  const resetImport = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreview(null);
    setMappings({});
    setImportResult(null);
  };

  // Render Upload Step
  const renderUploadStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.heroSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-upload" size={48} color="#3B82F6" />
        </View>
        <Text style={styles.heroTitle}>Bestandskunden importieren</Text>
        <Text style={styles.heroSubtitle}>
          Importiere deine existierenden Kontakte per CSV oder Excel-Datei
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.uploadArea} 
        onPress={pickDocument}
        activeOpacity={0.7}
      >
        <Ionicons name="document-attach" size={40} color="#64748B" />
        <Text style={styles.uploadTitle}>Datei auswählen</Text>
        <Text style={styles.uploadSubtitle}>CSV, XLS oder XLSX</Text>
        
        {selectedFile && (
          <View style={styles.selectedFile}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
          </View>
        )}
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Datei wird analysiert...</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#3B82F6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Unterstützte Formate</Text>
          <Text style={styles.infoText}>
            • CSV (mit Semikolon oder Komma){'\n'}
            • Excel (.xlsx, .xls){'\n'}
            • Erste Zeile = Spaltenüberschriften
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="shield-checkmark" size={24} color="#22C55E" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Automatische Erkennung</Text>
          <Text style={styles.infoText}>
            Wir erkennen automatisch Spalten wie Name, E-Mail, Telefon und ordnen sie richtig zu.
          </Text>
        </View>
      </View>
    </View>
  );

  // Render Preview Step
  const renderPreviewStep = () => (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>Import-Vorschau</Text>
        <Text style={styles.previewSubtitle}>
          {preview?.total_rows} Kontakte gefunden • {preview?.estimated_duplicates} mögliche Duplikate
        </Text>
      </View>

      {/* Mapping */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feld-Zuordnung</Text>
        <Text style={styles.sectionSubtitle}>Diese Spalten wurden erkannt:</Text>
        
        {Object.entries(mappings).map(([csvCol, dbField]) => (
          <View key={csvCol} style={styles.mappingRow}>
            <View style={styles.mappingCol}>
              <Text style={styles.mappingLabel}>CSV</Text>
              <Text style={styles.mappingValue}>{csvCol}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#64748B" />
            <View style={styles.mappingCol}>
              <Text style={styles.mappingLabel}>Feld</Text>
              <Text style={styles.mappingValue}>{FIELD_LABELS[dbField] || dbField}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Preview Rows */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vorschau der ersten Einträge</Text>
        
        {preview?.preview_rows.slice(0, 5).map((row) => (
          <View 
            key={row.row_number} 
            style={[
              styles.previewRow,
              row.is_duplicate && styles.previewRowDuplicate,
              row.errors.length > 0 && styles.previewRowError,
            ]}
          >
            <View style={styles.previewRowHeader}>
              <Text style={styles.previewRowNumber}>Zeile {row.row_number}</Text>
              {row.is_duplicate && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Duplikat</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.previewRowData}>
              {row.data.name || `${row.data.first_name || ''} ${row.data.last_name || ''}`.trim() || 'Kein Name'}
            </Text>
            {row.data.email && (
              <Text style={styles.previewRowMeta}>{row.data.email}</Text>
            )}
            {row.data.phone && (
              <Text style={styles.previewRowMeta}>{row.data.phone}</Text>
            )}
            
            {row.warnings.length > 0 && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={14} color="#F59E0B" />
                <Text style={styles.warningText}>{row.warnings[0]}</Text>
              </View>
            )}
            
            {row.errors.length > 0 && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{row.errors[0]}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Options */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.optionRow}
          onPress={() => setSkipDuplicates(!skipDuplicates)}
        >
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Duplikate überspringen</Text>
            <Text style={styles.optionDescription}>
              Kontakte die bereits existieren werden nicht erneut importiert
            </Text>
          </View>
          <View style={[styles.checkbox, skipDuplicates && styles.checkboxChecked]}>
            {skipDuplicates && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={resetImport}
        >
          <Text style={styles.secondaryButtonText}>Abbrechen</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={executeImport}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {preview?.total_rows} Kontakte importieren
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render Importing Step
  const renderImportingStep = () => (
    <View style={styles.centerContainer}>
      <View style={styles.importingAnimation}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <View style={styles.progressDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { animationDelay: `${i * 200}ms` }]} />
          ))}
        </View>
      </View>
      <Text style={styles.importingTitle}>Import läuft...</Text>
      <Text style={styles.importingSubtitle}>
        Deine Kontakte werden importiert. Das kann einen Moment dauern.
      </Text>
    </View>
  );

  // Render Result Step
  const renderResultStep = () => (
    <View style={styles.centerContainer}>
      <View style={[
        styles.resultIcon,
        importResult?.status === 'completed' ? styles.resultIconSuccess : styles.resultIconPartial
      ]}>
        <Ionicons 
          name={importResult?.status === 'completed' ? 'checkmark-circle' : 'alert-circle'} 
          size={64} 
          color="#fff" 
        />
      </View>
      
      <Text style={styles.resultTitle}>
        {importResult?.status === 'completed' ? 'Import abgeschlossen!' : 'Import teilweise erfolgreich'}
      </Text>
      
      <View style={styles.resultStats}>
        <View style={styles.resultStat}>
          <Text style={styles.resultStatNumber}>{importResult?.imported || 0}</Text>
          <Text style={styles.resultStatLabel}>Importiert</Text>
        </View>
        <View style={styles.resultStat}>
          <Text style={styles.resultStatNumber}>{importResult?.duplicates || 0}</Text>
          <Text style={styles.resultStatLabel}>Duplikate</Text>
        </View>
        <View style={styles.resultStat}>
          <Text style={[styles.resultStatNumber, { color: '#EF4444' }]}>
            {importResult?.errors || 0}
          </Text>
          <Text style={styles.resultStatLabel}>Fehler</Text>
        </View>
      </View>

      <View style={styles.resultActions}>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={resetImport}
        >
          <Ionicons name="add-circle" size={20} color="#3B82F6" />
          <Text style={styles.secondaryButtonText}>Weitere importieren</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Leads')}
        >
          <Ionicons name="people" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Zu meinen Leads</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daten importieren</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressBar}>
        {['upload', 'preview', 'importing', 'result'].map((s, i) => (
          <View key={s} style={styles.progressStep}>
            <View style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              ['preview', 'importing', 'result'].indexOf(step) >= i && styles.progressDotCompleted,
            ]}>
              {['preview', 'importing', 'result'].indexOf(step) > i && (
                <Ionicons name="checkmark" size={12} color="#fff" />
              )}
            </View>
            {i < 3 && <View style={[
              styles.progressLine,
              ['preview', 'importing', 'result'].indexOf(step) > i && styles.progressLineCompleted,
            ]} />}
          </View>
        ))}
      </View>

      {/* Content */}
      {step === 'upload' && renderUploadStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}
      {step === 'result' && renderResultStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: '#3B82F6',
  },
  progressDotCompleted: {
    backgroundColor: '#22C55E',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  progressLineCompleted: {
    backgroundColor: '#22C55E',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 280,
  },
  uploadArea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  selectedFileName: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
  previewHeader: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  mappingCol: {
    flex: 1,
  },
  mappingLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mappingValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 2,
  },
  previewRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  previewRowDuplicate: {
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  previewRowError: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  previewRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewRowNumber: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  previewRowData: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  previewRowMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#D97706',
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 40,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  importingAnimation: {
    marginBottom: 24,
  },
  progressDots: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  importingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  importingSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultIconSuccess: {
    backgroundColor: '#22C55E',
  },
  resultIconPartial: {
    backgroundColor: '#F59E0B',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  resultStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#22C55E',
  },
  resultStatLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  resultActions: {
    width: '100%',
    gap: 12,
  },
});

