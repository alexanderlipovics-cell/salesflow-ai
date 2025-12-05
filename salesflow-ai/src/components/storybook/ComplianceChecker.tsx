/**
 * ComplianceChecker Component
 * Prüft Texte auf Compliance-Verstöße in Echtzeit
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

interface Violation {
  rule_name: string;
  severity: 'block' | 'warn' | 'suggest';
  description: string;
  example_bad?: string;
  example_good?: string;
  matched_pattern?: string;
}

interface ComplianceResult {
  compliant: boolean;
  violations: Violation[];
  violation_count: number;
  has_blockers: boolean;
}

interface ComplianceCheckerProps {
  visible: boolean;
  onClose: () => void;
  onCheck: (text: string) => Promise<ComplianceResult>;
  companyName?: string;
  initialText?: string;
}

const SEVERITY_CONFIG = {
  block: {
    icon: '🚫',
    label: 'Blockiert',
    color: COLORS.error,
    bg: COLORS.errorBg,
    description: 'Diese Formulierung ist nicht erlaubt.',
  },
  warn: {
    icon: '⚠️',
    label: 'Warnung',
    color: COLORS.warning,
    bg: COLORS.warningBg,
    description: 'Überdenke diese Formulierung.',
  },
  suggest: {
    icon: '💡',
    label: 'Vorschlag',
    color: COLORS.info,
    bg: COLORS.infoBg,
    description: 'Es gibt eine bessere Alternative.',
  },
};

const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({
  visible,
  onClose,
  onCheck,
  companyName,
  initialText = '',
}) => {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-check on text change (debounced)
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (text.length > 10) {
      const timer = setTimeout(() => {
        handleCheck();
      }, 500);
      setDebounceTimer(timer);
    } else {
      setResult(null);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [text]);

  const handleCheck = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const checkResult = await onCheck(text);
      setResult(checkResult);
    } catch (error) {
      console.error('Compliance check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    if (!result) return null;
    
    if (result.compliant) {
      return {
        icon: '✅',
        label: 'Compliance OK',
        color: COLORS.success,
        bg: COLORS.successBg,
      };
    }
    
    if (result.has_blockers) {
      return {
        icon: '🚫',
        label: 'Verstöße gefunden',
        color: COLORS.error,
        bg: COLORS.errorBg,
      };
    }
    
    return {
      icon: '⚠️',
      label: 'Hinweise',
      color: COLORS.warning,
      bg: COLORS.warningBg,
    };
  };

  const statusConfig = getStatusConfig();

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
            <Text style={styles.headerTitle}>🛡️ Compliance-Check</Text>
            {companyName && (
              <Text style={styles.companyName}>{companyName}</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Text Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Text prüfen:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Füge hier deinen Text ein..."
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>{text.length} Zeichen</Text>
              {loading && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
            </View>
          </View>

          {/* Status Badge */}
          {statusConfig && (
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              {result && result.violation_count > 0 && (
                <Text style={[styles.violationCount, { color: statusConfig.color }]}>
                  ({result.violation_count})
                </Text>
              )}
            </View>
          )}

          {/* Violations */}
          {result && result.violations.length > 0 && (
            <View style={styles.violationsContainer}>
              <Text style={styles.violationsTitle}>
                Gefundene Probleme:
              </Text>
              {result.violations.map((violation, index) => {
                const config = SEVERITY_CONFIG[violation.severity];
                return (
                  <View
                    key={index}
                    style={[styles.violationCard, { borderLeftColor: config.color }]}
                  >
                    <View style={styles.violationHeader}>
                      <Text style={styles.violationIcon}>{config.icon}</Text>
                      <Text style={[styles.violationLabel, { color: config.color }]}>
                        {config.label}
                      </Text>
                    </View>
                    
                    <Text style={styles.violationRuleName}>
                      {violation.rule_name.replace(/_/g, ' ')}
                    </Text>
                    
                    <Text style={styles.violationDescription}>
                      {violation.description}
                    </Text>

                    {violation.example_bad && (
                      <View style={styles.exampleContainer}>
                        <Text style={styles.exampleLabel}>❌ Nicht:</Text>
                        <Text style={styles.exampleBad}>
                          {violation.example_bad}
                        </Text>
                      </View>
                    )}

                    {violation.example_good && (
                      <View style={styles.exampleContainer}>
                        <Text style={styles.exampleLabel}>✅ Besser:</Text>
                        <Text style={styles.exampleGood}>
                          {violation.example_good}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Compliant Message */}
          {result && result.compliant && (
            <View style={styles.compliantContainer}>
              <Text style={styles.compliantIcon}>🎉</Text>
              <Text style={styles.compliantTitle}>Alles in Ordnung!</Text>
              <Text style={styles.compliantText}>
                Dein Text enthält keine Compliance-Verstöße.
              </Text>
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tipps für compliance-konforme Texte:</Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>• Keine Heilversprechen oder medizinischen Claims</Text>
              <Text style={styles.tipItem}>• Keine garantierten Einkommen</Text>
              <Text style={styles.tipItem}>• "Kann helfen" statt "heilt"</Text>
              <Text style={styles.tipItem}>• Disclaimer bei Erfolgsgeschichten</Text>
              <Text style={styles.tipItem}>• Als Partner/Berater kennzeichnen</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.clearButton]}
            onPress={() => {
              setText('');
              setResult(null);
            }}
          >
            <Text style={styles.clearButtonText}>🗑️ Leeren</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.checkButton,
              (!text.trim() || loading) && styles.buttonDisabled,
            ]}
            onPress={handleCheck}
            disabled={!text.trim() || loading}
          >
            <Text style={styles.checkButtonText}>
              {loading ? '⏳ Prüfe...' : '🛡️ Jetzt prüfen'}
            </Text>
          </TouchableOpacity>
        </View>
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
  companyName: {
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
  inputContainer: {
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
    minHeight: 150,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  charCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statusIcon: {
    fontSize: 20,
  },
  statusLabel: {
    ...TYPOGRAPHY.label,
  },
  violationCount: {
    ...TYPOGRAPHY.label,
  },
  violationsContainer: {
    marginBottom: SPACING.lg,
  },
  violationsTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  violationCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  violationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  violationIcon: {
    fontSize: 16,
  },
  violationLabel: {
    ...TYPOGRAPHY.label,
  },
  violationRuleName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textTransform: 'capitalize',
  },
  violationDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  exampleContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
  },
  exampleLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  exampleBad: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    fontStyle: 'italic',
  },
  exampleGood: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.success,
    fontStyle: 'italic',
  },
  compliantContainer: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  compliantIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  compliantTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.success,
    marginBottom: SPACING.sm,
  },
  compliantText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
  },
  tipsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tipsTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tipsList: {
    gap: SPACING.xs,
  },
  tipItem: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  footerButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: COLORS.borderLight,
  },
  clearButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
  },
  checkButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ComplianceChecker;

