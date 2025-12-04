/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  IMPORT PROGRESS SCREEN                                                    ║
 * ║  Fortschrittsanzeige während des CSV Imports                              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui';
import { supabase } from '../../services/supabase';
import { mlmImportService, ImportProgress, ImportResult } from '../../services/mlmImportService';
import {
  AURA_COLORS,
  AURA_SHADOWS,
  GlassCard,
} from '../../components/aura';

interface ImportProgressScreenProps {
  navigation: any;
  route: {
    params: {
      file: any;
      mlmCompany: string;
      fieldMapping: Record<string, string>;
      preview: any;
    };
  };
}

export default function ImportProgressScreen({ navigation, route }: ImportProgressScreenProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { file, mlmCompany, fieldMapping, preview } = route.params;

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: preview?.total_rows || 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    duplicates: 0,
  });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  // EXECUTE IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (accessToken) {
      executeImport();
    }
  }, [accessToken]);

  const executeImport = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const importResult = await mlmImportService.executeImport(
        file,
        mlmCompany,
        fieldMapping,
        true, // skipDuplicates
        'once', // syncMode
        accessToken,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setResult(importResult);
      setProgress({
        current: importResult.total_rows,
        total: importResult.total_rows,
        imported: importResult.imported,
        skipped: importResult.skipped,
        errors: importResult.errors,
        duplicates: importResult.duplicates,
      });
    } catch (error: any) {
      setError(error.message);
      showToast(`Import-Fehler: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [file, mlmCompany, fieldMapping, accessToken, showToast]);

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATE TO CONTACTS
  // ═══════════════════════════════════════════════════════════════════════════

  const navigateToContacts = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        { name: 'MainTabs' },
        { name: 'Kontakte' },
      ],
    });
  }, [navigation]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const progressPercent = progress.total > 0 
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Import läuft...</Text>
        {loading && (
          <Text style={styles.subtitle}>
            Bitte warte, während deine Kontakte importiert werden
          </Text>
        )}
      </View>

      {/* Progress Bar */}
      <GlassCard style={styles.progressCard}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progressPercent}%
          </Text>
        </View>
        <Text style={styles.progressDetail}>
          Importiere Kontakt {progress.current} von {progress.total}
        </Text>
      </GlassCard>

      {/* Live Counters */}
      <View style={styles.countersGrid}>
        <GlassCard style={styles.counterCard}>
          <Text style={styles.counterValue}>{progress.imported}</Text>
          <Text style={styles.counterLabel}>Erfolgreich</Text>
        </GlassCard>
        <GlassCard style={styles.counterCard}>
          <Text style={[styles.counterValue, styles.counterValueSkipped]}>
            {progress.skipped}
          </Text>
          <Text style={styles.counterLabel}>Übersprungen</Text>
        </GlassCard>
        <GlassCard style={styles.counterCard}>
          <Text style={[styles.counterValue, styles.counterValueError]}>
            {progress.errors}
          </Text>
          <Text style={styles.counterLabel}>Fehler</Text>
        </GlassCard>
        <GlassCard style={styles.counterCard}>
          <Text style={[styles.counterValue, styles.counterValueDuplicate]}>
            {progress.duplicates}
          </Text>
          <Text style={styles.counterLabel}>Duplikate</Text>
        </GlassCard>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AURA_COLORS.accent.primary} />
          <Text style={styles.loadingText}>Import läuft...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorTitle}>❌ Import fehlgeschlagen</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={executeImport}
          >
            <Text style={styles.retryButtonText}>🔄 Erneut versuchen</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {/* Success State */}
      {result && !loading && !error && (
        <>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>✅ Import abgeschlossen</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{result.imported}</Text>
                <Text style={styles.summaryStatLabel}>Importiert</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{result.skipped}</Text>
                <Text style={styles.summaryStatLabel}>Übersprungen</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{result.errors}</Text>
                <Text style={styles.summaryStatLabel}>Fehler</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{result.duplicates}</Text>
                <Text style={styles.summaryStatLabel}>Duplikate</Text>
              </View>
            </View>
          </GlassCard>

          <TouchableOpacity
            style={styles.viewContactsButton}
            onPress={navigateToContacts}
          >
            <Text style={styles.viewContactsButtonText}>
              👥 Kontakte anzeigen
            </Text>
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
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
    textAlign: 'center',
  },
  progressCard: {
    marginBottom: 20,
    padding: 20,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AURA_COLORS.accent.success,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
  },
  progressDetail: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    textAlign: 'center',
  },
  countersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  counterCard: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AURA_COLORS.accent.success,
    marginBottom: 4,
  },
  counterValueSkipped: {
    color: AURA_COLORS.text.muted,
  },
  counterValueError: {
    color: AURA_COLORS.accent.error,
  },
  counterValueDuplicate: {
    color: AURA_COLORS.accent.warning,
  },
  counterLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
  },
  errorCard: {
    padding: 20,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AURA_COLORS.accent.error,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: AURA_COLORS.accent.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  summaryCard: {
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  summaryStat: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.accent.primary,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.secondary,
  },
  viewContactsButton: {
    padding: 20,
    backgroundColor: AURA_COLORS.accent.success,
    borderRadius: 12,
    alignItems: 'center',
    ...AURA_SHADOWS.lg,
  },
  viewContactsButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

