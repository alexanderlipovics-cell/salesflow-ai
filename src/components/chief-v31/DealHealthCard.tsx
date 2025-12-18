/**
 * DealHealthCard Component
 * Deal Medic: Zeigt Deal-Gesundheit und Warnungen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { 
  checkDealHealth, 
  getDealPostMortem,
  DealHealth,
  DealPostMortem,
} from '../../services/chiefV31Service';

interface DealHealthCardProps {
  leadId: string;
  leadName: string;
  leadStatus?: string;
  onIntervene?: (message: string) => void;
  compact?: boolean;
}

const HEALTH_CONFIG = {
  healthy: {
    emoji: '💚',
    label: 'Gesund',
    color: COLORS.success,
    bg: COLORS.successBg,
  },
  warning: {
    emoji: '⚠️',
    label: 'Warnung',
    color: COLORS.warning,
    bg: COLORS.warningBg,
  },
  critical: {
    emoji: '🚨',
    label: 'Kritisch',
    color: COLORS.error,
    bg: COLORS.errorBg,
  },
};

const DealHealthCard: React.FC<DealHealthCardProps> = ({
  leadId,
  leadName,
  leadStatus,
  onIntervene,
  compact = false,
}) => {
  const [health, setHealth] = useState<DealHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPostMortem, setShowPostMortem] = useState(false);
  const [postMortem, setPostMortem] = useState<DealPostMortem | null>(null);
  const [loadingPostMortem, setLoadingPostMortem] = useState(false);

  useEffect(() => {
    loadHealth();
  }, [leadId]);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const result = await checkDealHealth(leadId);
      setHealth(result);
    } catch (error) {
      console.error('Failed to check deal health:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPostMortem = async () => {
    try {
      setLoadingPostMortem(true);
      const result = await getDealPostMortem(leadId, leadName);
      setPostMortem(result);
      setShowPostMortem(true);
    } catch (error) {
      console.error('Failed to load post-mortem:', error);
    } finally {
      setLoadingPostMortem(false);
    }
  };

  const handleIntervene = () => {
    if (health?.intervention_message && onIntervene) {
      onIntervene(health.intervention_message);
    }
  };

  if (loading) {
    return compact ? null : (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!health) return null;

  const config = HEALTH_CONFIG[health.risk_level];

  // Healthy leads - minimal display
  if (!health.at_risk) {
    if (compact) return null;
    
    return (
      <View style={[styles.container, styles.healthyContainer]}>
        <Text style={styles.healthyEmoji}>💚</Text>
        <Text style={styles.healthyText}>Deal sieht gut aus</Text>
      </View>
    );
  }

  // Compact mode for at-risk
  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.compactBadge, { backgroundColor: config.bg }]}
        onPress={() => setShowPostMortem(true)}
      >
        <Text style={styles.compactEmoji}>{config.emoji}</Text>
        <Text style={[styles.compactText, { color: config.color }]}>
          {health.warnings.length} Warnung{health.warnings.length > 1 ? 'en' : ''}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <View style={[styles.container, { borderLeftColor: config.color }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={styles.statusEmoji}>{config.emoji}</Text>
            <Text style={[styles.statusLabel, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.leadName}>{leadName}</Text>
        </View>

        {/* Warnings */}
        <View style={styles.warningsSection}>
          <Text style={styles.warningsTitle}>Warnsignale:</Text>
          {health.warnings.map((warning, index) => (
            <View key={index} style={styles.warningItem}>
              <Text style={styles.warningBullet}>•</Text>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>

        {/* Intervention */}
        {health.intervention_message && (
          <View style={styles.interventionSection}>
            <Text style={styles.interventionTitle}>💡 Empfohlene Intervention:</Text>
            <Text style={styles.interventionText}>"{health.intervention_message}"</Text>
            
            <View style={styles.actionButtons}>
              {onIntervene && (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleIntervene}
                >
                  <Text style={styles.sendButtonText}>📤 Jetzt senden</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={loadPostMortem}
                disabled={loadingPostMortem}
              >
                <Text style={styles.analyzeButtonText}>
                  {loadingPostMortem ? '⏳...' : '🔍 Analyse'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Post-Mortem Modal */}
      <Modal
        visible={showPostMortem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPostMortem(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>💔 Deal Analyse</Text>
              <Text style={styles.modalSubtitle}>{leadName}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowPostMortem(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {postMortem ? (
              <>
                {/* Death Cause */}
                <View style={styles.deathCauseSection}>
                  <Text style={styles.sectionTitle}>🎯 Hauptproblem</Text>
                  <View style={styles.deathCauseCard}>
                    <Text style={styles.deathCauseText}>{postMortem.death_cause}</Text>
                  </View>
                </View>

                {/* Critical Errors */}
                {postMortem.critical_errors.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔴 Kritische Fehler</Text>
                    {postMortem.critical_errors.map((error, index) => (
                      <View key={index} style={styles.errorCard}>
                        <View style={styles.errorHeader}>
                          <Text style={styles.errorName}>{error.name}</Text>
                          <Text style={styles.errorDay}>Tag {error.day}</Text>
                        </View>
                        <Text style={styles.errorProblem}>❌ {error.problem}</Text>
                        <View style={styles.betterSection}>
                          <Text style={styles.betterLabel}>✅ Besser:</Text>
                          <Text style={styles.betterText}>"{error.better}"</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Patterns */}
                {postMortem.patterns.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📈 Erkannte Patterns</Text>
                    {postMortem.patterns.map((pattern, index) => (
                      <View key={index} style={styles.patternCard}>
                        <Text style={styles.patternText}>{pattern}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Learnings */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💡 Learnings</Text>
                  {postMortem.learnings.map((learning, index) => (
                    <View key={index} style={styles.learningItem}>
                      <Text style={styles.learningNumber}>{index + 1}</Text>
                      <Text style={styles.learningText}>{learning}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Analysiere Deal...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  healthyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderLeftColor: COLORS.success,
  },
  healthyEmoji: {
    fontSize: 20,
  },
  healthyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.success,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  statusEmoji: {
    fontSize: 14,
  },
  statusLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  leadName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  warningsSection: {
    marginBottom: SPACING.md,
  },
  warningsTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  warningItem: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  warningBullet: {
    ...TYPOGRAPHY.body,
    color: COLORS.warning,
  },
  warningText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  interventionSection: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  interventionTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  interventionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sendButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  sendButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    fontSize: 14,
  },
  analyzeButton: {
    backgroundColor: COLORS.borderLight,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  analyzeButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
    fontSize: 14,
  },
  // Compact styles
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  compactEmoji: {
    fontSize: 12,
  },
  compactText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  modalSubtitle: {
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
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  deathCauseSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  deathCauseCard: {
    backgroundColor: COLORS.errorBg,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  deathCauseText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  errorCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  errorName: {
    ...TYPOGRAPHY.label,
    color: COLORS.error,
  },
  errorDay: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  errorProblem: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  betterSection: {
    backgroundColor: COLORS.successBg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  betterLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  betterText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  patternCard: {
    backgroundColor: COLORS.warningBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  patternText: {
    ...TYPOGRAPHY.body,
    color: COLORS.warning,
  },
  learningItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  learningNumber: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '700',
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: COLORS.primaryBg,
    borderRadius: 12,
  },
  learningText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
});

export default DealHealthCard;

