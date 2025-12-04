/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  IMPORT PREVIEW SCREEN                                                      ║
 * ║  Vorschau des CSV Imports mit Format-Erkennung und Mapping                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui';
import { supabase } from '../../services/supabase';
import { mlmImportService, ImportPreviewResponse } from '../../services/mlmImportService';
import {
  AURA_COLORS,
  AURA_SHADOWS,
  GlassCard,
} from '../../components/aura';

interface ImportPreviewScreenProps {
  navigation: any;
  route: {
    params: {
      file: any;
      source: 'file' | 'clipboard';
    };
  };
}

const MLM_COMPANIES = [
  { id: 'doterra', name: 'doTERRA', icon: '🌿' },
  { id: 'herbalife', name: 'Herbalife', icon: '🥤' },
  { id: 'zinzino', name: 'Zinzino', icon: '🧬' },
  { id: 'pm-international', name: 'PM-International', icon: '💊' },
  { id: 'lr', name: 'LR', icon: '✨' },
  { id: 'vorwerk', name: 'Vorwerk', icon: '🏠' },
  { id: 'generic', name: 'Standard CSV', icon: '📊' },
];

export default function ImportPreviewScreen({ navigation, route }: ImportPreviewScreenProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { file, source } = route.params;

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('generic');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ACCESS TOKEN
  // ═══════════════════════════════════════════════════════════════════════════

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
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    loadPreview();
  }, [selectedCompany]);

  const loadPreview = useCallback(async () => {
    if (!file || !selectedCompany) return;

    setLoading(true);
    try {
      const previewData = await mlmImportService.getPreview(
        { ...file, source },
        selectedCompany,
        accessToken
      );
      
      setPreview(previewData);
      setFieldMapping(previewData.suggested_mapping || {});
      
      // Auto-detect company if format was detected
      if (previewData.detected_format) {
        const detectedCompany = detectCompanyFromFormat(previewData.detected_format);
        if (detectedCompany) {
          setSelectedCompany(detectedCompany);
        }
      }
    } catch (error: any) {
      showToast(`Fehler: ${error.message}`, 'error');
      Alert.alert('Fehler', error.message);
    } finally {
      setLoading(false);
    }
  }, [file, selectedCompany, accessToken, source, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // START IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const startImport = useCallback(() => {
    if (!preview) {
      Alert.alert('Fehler', 'Bitte warte, bis die Vorschau geladen ist.');
      return;
    }

    navigation.navigate('ImportProgress', {
      file: { ...file, source },
      mlmCompany: selectedCompany,
      fieldMapping,
      preview,
    });
  }, [preview, file, selectedCompany, fieldMapping, source, navigation]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const detectCompanyFromFormat = (format: string): string | null => {
    const formatLower = format.toLowerCase();
    if (formatLower.includes('doterra')) return 'doterra';
    if (formatLower.includes('herbalife')) return 'herbalife';
    if (formatLower.includes('zinzino')) return 'zinzino';
    if (formatLower.includes('pm-international') || formatLower.includes('fitline')) return 'pm-international';
    return null;
  };

  const getFieldStatus = (field: string): 'found' | 'missing' | 'conflict' => {
    if (!preview) return 'missing';
    
    const mapped = Object.values(fieldMapping).includes(field);
    const detected = preview.detected_columns.some(col => 
      col.toLowerCase().includes(field.toLowerCase())
    );
    
    if (mapped && detected) return 'found';
    if (detected && !mapped) return 'conflict';
    return 'missing';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading && !preview) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AURA_COLORS.accent.primary} />
        <Text style={styles.loadingText}>Analysiere CSV-Datei...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📋 Import-Vorschau</Text>
        {preview?.detected_format && (
          <View style={styles.formatBadge}>
            <Text style={styles.formatBadgeText}>
              {preview.detected_format} erkannt ✓
            </Text>
          </View>
        )}
      </View>

      {/* MLM Company Selection */}
      <GlassCard style={styles.section}>
        <Text style={styles.sectionTitle}>MLM-Unternehmen</Text>
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
            </TouchableOpacity>
          ))}
        </View>
      </GlassCard>

      {/* Preview Stats */}
      {preview && (
        <>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Übersicht</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{preview.total_rows}</Text>
                <Text style={styles.statLabel}>Kontakte</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{preview.estimated_duplicates}</Text>
                <Text style={styles.statLabel}>Duplikate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {preview.total_rows - preview.estimated_duplicates}
                </Text>
                <Text style={styles.statLabel}>Neu</Text>
              </View>
            </View>
          </GlassCard>

          {/* Field Mapping Overview */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Feld-Mapping</Text>
            <View style={styles.mappingList}>
              {['name', 'email', 'phone', 'mlm_id', 'rank', 'sponsor'].map((field) => {
                const status = getFieldStatus(field);
                return (
                  <View key={field} style={styles.mappingItem}>
                    <Text style={styles.mappingField}>{field}</Text>
                    <View style={styles.mappingStatus}>
                      {status === 'found' && (
                        <Text style={styles.mappingStatusFound}>✓ Gefunden</Text>
                      )}
                      {status === 'missing' && (
                        <Text style={styles.mappingStatusMissing}>- Fehlt</Text>
                      )}
                      {status === 'conflict' && (
                        <Text style={styles.mappingStatusConflict}>⚠ Konflikt</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          {/* Sample Rows Preview */}
          {preview.sample_rows && preview.sample_rows.length > 0 && (
            <GlassCard style={styles.section}>
              <Text style={styles.sectionTitle}>Vorschau (erste 5 Kontakte)</Text>
              <View style={styles.sampleTable}>
                {preview.sample_rows.slice(0, 5).map((row: any, idx: number) => (
                  <View key={idx} style={styles.sampleRow}>
                    <Text style={styles.sampleRowName}>
                      {row.name || row.first_name || 'Unbekannt'}
                    </Text>
                    {row.email && (
                      <Text style={styles.sampleRowEmail}>{row.email}</Text>
                    )}
                    {row.phone && (
                      <Text style={styles.sampleRowPhone}>{row.phone}</Text>
                    )}
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          {/* Import Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {preview.total_rows - preview.estimated_duplicates} Kontakte werden importiert
            </Text>
          </View>

          {/* Start Import Button */}
          <TouchableOpacity
            style={styles.importButton}
            onPress={startImport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.importButtonText}>🚀 Import starten</Text>
            )}
          </TouchableOpacity>
        </>
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.bg.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
    marginBottom: 12,
  },
  formatBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: AURA_COLORS.accent.success,
    borderRadius: 20,
  },
  formatBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    width: '30%',
    padding: 12,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    ...AURA_SHADOWS.md,
  },
  companyCardSelected: {
    borderColor: AURA_COLORS.accent.primary,
    backgroundColor: AURA_COLORS.surface.tertiary,
  },
  companyIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AURA_COLORS.accent.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
  },
  mappingList: {
    gap: 12,
  },
  mappingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 8,
  },
  mappingField: {
    fontSize: 14,
    fontWeight: '500',
    color: AURA_COLORS.text.primary,
    textTransform: 'capitalize',
  },
  mappingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mappingStatusFound: {
    fontSize: 12,
    color: AURA_COLORS.accent.success,
    fontWeight: '600',
  },
  mappingStatusMissing: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
  mappingStatusConflict: {
    fontSize: 12,
    color: AURA_COLORS.accent.warning,
    fontWeight: '600',
  },
  sampleTable: {
    gap: 8,
  },
  sampleRow: {
    padding: 12,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 8,
  },
  sampleRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  sampleRowEmail: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
  },
  sampleRowPhone: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
    marginTop: 2,
  },
  summaryCard: {
    padding: 16,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  importButton: {
    padding: 20,
    backgroundColor: AURA_COLORS.accent.success,
    borderRadius: 12,
    alignItems: 'center',
    ...AURA_SHADOWS.lg,
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

