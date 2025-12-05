/**
 * ObjectionAnalyzer Component
 * Signal Detector: Analysiert ob ein Einwand echt oder Vorwand ist
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Clipboard,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { analyzeObjection, ObjectionAnalysis } from '../../services/chiefV31Service';

interface ObjectionAnalyzerProps {
  visible: boolean;
  onClose: () => void;
  leadId?: string;
  initialObjection?: string;
  onResponseSelect?: (response: string) => void;
}

const TYPE_CONFIG = {
  real: {
    emoji: '✅',
    label: 'Echter Einwand',
    color: COLORS.success,
    bg: COLORS.successBg,
    advice: 'Direkt auf das Thema eingehen und konkrete Lösung bieten.',
  },
  pretense: {
    emoji: '🟡',
    label: 'Wahrscheinlich Vorwand',
    color: COLORS.warning,
    bg: COLORS.warningBg,
    advice: 'NICHT auf den Vorwand eingehen. Zum echten Problem durchdringen.',
  },
  buying_signal: {
    emoji: '🔥',
    label: 'Verstecktes Kaufsignal',
    color: COLORS.primary,
    bg: COLORS.primaryBg,
    advice: 'Der Kunde ist interessiert! Jetzt zum Abschluss führen.',
  },
};

const ObjectionAnalyzer: React.FC<ObjectionAnalyzerProps> = ({
  visible,
  onClose,
  leadId,
  initialObjection = '',
  onResponseSelect,
}) => {
  const [objection, setObjection] = useState(initialObjection);
  const [result, setResult] = useState<ObjectionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!objection.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const analysis = await analyzeObjection(objection, leadId);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Analyse fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, [objection, leadId]);

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    // TODO: Show toast
  };

  const handleUseResponse = (response: string) => {
    if (onResponseSelect) {
      onResponseSelect(response);
      onClose();
    } else {
      handleCopy(response);
    }
  };

  const typeConfig = result ? TYPE_CONFIG[result.objection_type] : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🎯 Signal Detector</Text>
            <Text style={styles.headerSubtitle}>Einwand oder Vorwand?</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Was hat der Kunde gesagt?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="z.B. 'Das ist mir zu teuer' oder 'Ich habe keine Zeit'"
              placeholderTextColor={COLORS.textMuted}
              value={objection}
              onChangeText={setObjection}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                (!objection.trim() || loading) && styles.buttonDisabled,
              ]}
              onPress={handleAnalyze}
              disabled={!objection.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.analyzeButtonText}>🔍 Analysieren</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorSection}>
              <Text style={styles.errorText}>❌ {error}</Text>
            </View>
          )}

          {/* Result */}
          {result && typeConfig && (
            <View style={styles.resultSection}>
              {/* Type Badge */}
              <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
                <Text style={styles.typeEmoji}>{typeConfig.emoji}</Text>
                <View>
                  <Text style={[styles.typeLabel, { color: typeConfig.color }]}>
                    {typeConfig.label}
                  </Text>
                  <Text style={styles.confidenceText}>
                    {Math.round(result.confidence * 100)}% Confidence
                  </Text>
                </View>
              </View>

              {/* Real Problem (if pretense) */}
              {result.real_problem && (
                <View style={styles.realProblemSection}>
                  <Text style={styles.sectionTitle}>🔍 Das wahre Problem:</Text>
                  <Text style={styles.realProblemText}>{result.real_problem}</Text>
                </View>
              )}

              {/* Advice */}
              <View style={styles.adviceSection}>
                <Text style={styles.sectionTitle}>💡 Strategie:</Text>
                <Text style={styles.adviceText}>{typeConfig.advice}</Text>
              </View>

              {/* Recommended Response */}
              <View style={styles.responseSection}>
                <Text style={styles.sectionTitle}>✅ Empfohlene Antwort:</Text>
                <View style={styles.responseCard}>
                  <Text style={styles.responseText}>{result.recommended_response}</Text>
                  <View style={styles.responseActions}>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopy(result.recommended_response)}
                    >
                      <Text style={styles.copyButtonText}>📋 Kopieren</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.useButton}
                      onPress={() => handleUseResponse(result.recommended_response)}
                    >
                      <Text style={styles.useButtonText}>✨ Verwenden</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Alternative Response */}
              {result.alternative_response && (
                <View style={styles.responseSection}>
                  <Text style={styles.sectionTitle}>🔄 Alternative:</Text>
                  <View style={[styles.responseCard, styles.alternativeCard]}>
                    <Text style={styles.responseText}>{result.alternative_response}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopy(result.alternative_response)}
                    >
                      <Text style={styles.copyButtonText}>📋 Kopieren</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Quick Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Quick-Guide: Einwand vs. Vorwand</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipEmoji}>✅</Text>
              <Text style={styles.tipText}>
                <Text style={styles.tipBold}>ECHT</Text>: Kunde hat konkrete Fragen, 
                nennt Alternativen, will verhandeln
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipEmoji}>🟡</Text>
              <Text style={styles.tipText}>
                <Text style={styles.tipBold}>VORWAND</Text>: Kam plötzlich, war vorher 
                skeptisch, keine konkreten Fragen
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipEmoji}>🔥</Text>
              <Text style={styles.tipText}>
                <Text style={styles.tipBold}>TEST</Text>: "Angenommen [Einwand] wäre 
                kein Thema - wärst du dann dabei?"
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  inputSection: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 100,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  analyzeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  analyzeButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorSection: {
    backgroundColor: COLORS.errorBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
  },
  resultSection: {
    marginBottom: SPACING.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  typeEmoji: {
    fontSize: 32,
  },
  typeLabel: {
    ...TYPOGRAPHY.h4,
    fontWeight: '700',
  },
  confidenceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  realProblemSection: {
    backgroundColor: COLORS.warningBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  realProblemText: {
    ...TYPOGRAPHY.body,
    color: COLORS.warning,
    fontWeight: '600',
  },
  adviceSection: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  adviceText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  responseSection: {
    marginBottom: SPACING.md,
  },
  responseCard: {
    backgroundColor: COLORS.successBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  alternativeCard: {
    backgroundColor: COLORS.card,
    borderLeftColor: COLORS.textMuted,
  },
  responseText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  responseActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  copyButton: {
    backgroundColor: COLORS.borderLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  copyButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  useButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  useButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
  },
  tipsSection: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  tipsTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tipEmoji: {
    fontSize: 16,
  },
  tipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  tipBold: {
    fontWeight: '700',
    color: COLORS.text,
  },
});

export default ObjectionAnalyzer;

