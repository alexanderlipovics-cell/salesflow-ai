/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  IMPORT CONTACTS SCREEN                                                    ║
 * ║  Universelles CSV Import System für MLM-Kontakte                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/ui';
import {
  AURA_COLORS,
  AURA_SHADOWS,
  GlassCard,
} from '../../components/aura';

// ═══════════════════════════════════════════════════════════════════════════
// MLM COMPANIES
// ═══════════════════════════════════════════════════════════════════════════

const MLM_COMPANIES = [
  {
    id: 'zinzino',
    name: 'Zinzino',
    icon: '🧬',
    description: 'Partner ID, Vorname, Nachname, Email, Telefon, Rang, Credits, Sponsor ID, Z4F',
  },
  {
    id: 'pm-international',
    name: 'PM-International (FitLine)',
    icon: '💊',
    description: 'Partner-Nr, Vorname, Nachname, Email, Telefon, Rang, Punkte, GV, Erstlinie, Sponsor, Autoship',
  },
  {
    id: 'doterra',
    name: 'doTERRA',
    icon: '🌿',
    description: 'Member ID, Vorname, Nachname, Email, Telefon, Rank, PV, OV, PGV, TV, Legs, LRP',
  },
  {
    id: 'herbalife',
    name: 'Herbalife',
    icon: '🥤',
    description: 'Distributor ID, Vorname, Nachname, Email, Telefon, Level, VP, PPV, TV, RO, Retail Customers',
  },
  {
    id: 'lr',
    name: 'LR',
    icon: '✨',
    description: 'LR Export Format',
  },
  {
    id: 'vorwerk',
    name: 'Vorwerk',
    icon: '🏠',
    description: 'Vorwerk Export Format',
  },
  {
    id: 'generic',
    name: 'Generic MLM',
    icon: '📊',
    description: 'Automatische Spalten-Erkennung mit GPT',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ImportContactsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Get access token from Supabase session
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  useEffect(() => {
    const getToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAccessToken(session?.access_token || null);
      } catch (error) {
        console.error('Error getting access token:', error);
        setAccessToken(null);
      }
    };
    if (user) {
      getToken();
    } else {
      setAccessToken(null);
    }
  }, [user]);
  
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [syncMode, setSyncMode] = useState<'once' | 'weekly'>('once');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE PICKER
  // ═══════════════════════════════════════════════════════════════════════════

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFile(result.assets[0]);
        showToast('✅ Datei ausgewählt', 'success');
      }
    } catch (error: any) {
      showToast(`Fehler: ${error.message}`, 'error');
    }
  }, [showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  const loadPreview = useCallback(async () => {
    if (!file || !selectedCompany) {
      Alert.alert('Fehler', 'Bitte wähle zuerst eine Firma und eine Datei aus.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'text/csv',
      } as any);
      formData.append('mlm_company', selectedCompany);

      // API URL: baseUrl enthält bereits /api/v1
      const apiUrl = `${API_CONFIG.baseUrl}/mlm-import/preview`;
      
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Preview-Fehler');
      }

      const data = await response.json();
      setPreview(data);
      setFieldMapping(data.suggested_mapping || {});
      showToast('✅ Vorschau geladen', 'success');
    } catch (error: any) {
      showToast(`Fehler: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [file, selectedCompany, user, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const executeImport = useCallback(async () => {
    if (!file || !selectedCompany) {
      Alert.alert('Fehler', 'Bitte wähle zuerst eine Firma und eine Datei aus.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'text/csv',
      } as any);
      formData.append('mlm_company', selectedCompany);
      formData.append('field_mapping', JSON.stringify(fieldMapping));
      formData.append('skip_duplicates', skipDuplicates.toString());
      formData.append('sync_mode', syncMode);

      // API URL: baseUrl enthält bereits /api/v1
      const apiUrl = `${API_CONFIG.baseUrl}/mlm-import/execute`;
      
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Import-Fehler');
      }

      const result = await response.json();
      
      Alert.alert(
        '✅ Import erfolgreich',
        `Importiert: ${result.imported}\nÜbersprungen: ${result.skipped}\nFehler: ${result.errors}\nDuplikate: ${result.duplicates}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      showToast(`Fehler: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [file, selectedCompany, fieldMapping, skipDuplicates, syncMode, user, navigation, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📥 CSV Import</Text>
        <Text style={styles.subtitle}>MLM-Kontakte importieren</Text>
      </View>

      {/* MLM Company Selection */}
      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>1. MLM-Unternehmen wählen</Text>
        <View style={styles.companyGrid}>
          {MLM_COMPANIES.map((company) => (
            <TouchableOpacity
              key={company.id}
              style={[
                styles.companyCard,
                selectedCompany === company.id && styles.companyCardSelected,
              ]}
              onPress={() => setSelectedCompany(company.id)}
            >
              <Text style={styles.companyIcon}>{company.icon}</Text>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyDescription}>{company.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {/* File Picker */}
      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>2. CSV-Datei auswählen</Text>
        <TouchableOpacity
          style={styles.fileButton}
          onPress={pickFile}
          disabled={loading}
        >
          <Text style={styles.fileButtonText}>
            {file ? `✅ ${file.name}` : '📁 Datei auswählen'}
          </Text>
        </TouchableOpacity>
      </GlassCard>

      {/* Preview Button */}
      {file && selectedCompany && (
        <GlassCard style={styles.section}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={loadPreview}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={AURA_COLORS.text.primary} />
            ) : (
              <Text style={styles.previewButtonText}>🔍 Vorschau laden</Text>
            )}
          </TouchableOpacity>
        </GlassCard>
      )}

      {/* Preview Results */}
      {preview && (
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>3. Vorschau</Text>
          <View style={styles.previewStats}>
            <Text style={styles.previewStat}>
              📊 Zeilen: {preview.total_rows}
            </Text>
            <Text style={styles.previewStat}>
              🔄 Duplikate: {preview.estimated_duplicates}
            </Text>
          </View>
          
          {/* Sample Rows */}
          {preview.sample_rows && preview.sample_rows.length > 0 && (
            <View style={styles.sampleRows}>
              <Text style={styles.sampleTitle}>Beispiel-Daten:</Text>
              {preview.sample_rows.slice(0, 3).map((row: any, idx: number) => (
                <View key={idx} style={styles.sampleRow}>
                  <Text style={styles.sampleRowText}>
                    {row.name || row.first_name || 'Unbekannt'}
                  </Text>
                  {row.email && (
                    <Text style={styles.sampleRowSubtext}>{row.email}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </GlassCard>
      )}

      {/* Sync Options */}
      {preview && (
        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>4. Sync-Optionen</Text>
          
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setSyncMode('once')}
          >
            <Text style={styles.optionText}>
              {syncMode === 'once' ? '✅' : '⚪'} Einmal-Import
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setSyncMode('weekly')}
          >
            <Text style={styles.optionText}>
              {syncMode === 'weekly' ? '✅' : '⚪'} Wöchentlicher Re-Import
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setSkipDuplicates(!skipDuplicates)}
          >
            <Text style={styles.optionText}>
              {skipDuplicates ? '✅' : '⚪'} Duplikate überspringen
            </Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {/* Execute Import */}
      {preview && (
        <TouchableOpacity
          style={[styles.importButton, loading && styles.importButtonDisabled]}
          onPress={executeImport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.importButtonText}>🚀 Import starten</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
  },
  section: {
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 16,
  },
  companyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  companyCard: {
    width: '48%',
    padding: 16,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    ...AURA_SHADOWS.md,
  },
  companyCardSelected: {
    borderColor: AURA_COLORS.accent.primary,
    backgroundColor: AURA_COLORS.surface.tertiary,
  },
  companyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  companyDescription: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
  },
  fileButton: {
    padding: 16,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 12,
    alignItems: 'center',
    ...AURA_SHADOWS.md,
  },
  fileButtonText: {
    fontSize: 16,
    color: AURA_COLORS.text.primary,
  },
  previewButton: {
    padding: 16,
    backgroundColor: AURA_COLORS.accent.primary,
    borderRadius: 12,
    alignItems: 'center',
    ...AURA_SHADOWS.lg,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  previewStat: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
  },
  sampleRows: {
    marginTop: 12,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
  },
  sampleRow: {
    padding: 12,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  sampleRowText: {
    fontSize: 14,
    color: AURA_COLORS.text.primary,
    fontWeight: '500',
  },
  sampleRowSubtext: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
    marginTop: 4,
  },
  optionRow: {
    padding: 16,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    color: AURA_COLORS.text.primary,
  },
  importButton: {
    padding: 20,
    backgroundColor: AURA_COLORS.accent.success,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    ...AURA_SHADOWS.lg,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

