/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - NEXT STEP WIDGET                                                ║
 * ║  "Nächster Schritt" Auswahl für No-Lead-Left-Behind                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from './theme';
import Card from './Card';
import {
  DISC_DESCRIPTIONS,
  DECISION_STATE_CONFIG,
  CHANNEL_CONFIG,
  QUICK_CONTACT_OPTIONS,
  formatNextContactDate,
} from '../types/personality';
import {
  upsertContactPlan,
  createAIContactPlan,
} from '../services/personalityService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} NextStepWidgetProps
 * @property {string} leadId
 * @property {string} leadName
 * @property {string} workspaceId
 * @property {string} userId
 * @property {'D'|'I'|'S'|'G'} [discStyle]
 * @property {number} [discConfidence]
 * @property {import('../types/personality').DecisionState} [decisionState]
 * @property {string} [lastContactAt]
 * @property {'whatsapp'|'phone'|'email'|'social'|'meeting'} [preferredChannel]
 * @property {Object} [companyContext]
 * @property {string} [lastConversationSummary]
 * @property {() => void} [onPlanCreated]
 * @property {() => void} [onSkip]
 * @property {() => void} [onClose]
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Widget zur Auswahl des nächsten Schritts mit einem Lead
 * @param {NextStepWidgetProps} props
 */
const NextStepWidget = ({
  leadId,
  leadName,
  workspaceId,
  userId,
  discStyle,
  discConfidence,
  decisionState = 'no_decision',
  lastContactAt,
  preferredChannel = 'whatsapp',
  companyContext,
  lastConversationSummary,
  onPlanCreated,
  onSkip,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(preferredChannel);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  // DISG Info
  const discInfo = discStyle ? DISC_DESCRIPTIONS[discStyle] : null;
  const decisionInfo = DECISION_STATE_CONFIG[decisionState];

  // Handler: Quick Option wählen
  const handleQuickOption = useCallback(async (days) => {
    setIsLoading(true);
    try {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);

      await upsertContactPlan(leadId, workspaceId, userId, {
        nextContactAt: nextDate.toISOString(),
        nextChannel: selectedChannel,
        planType: 'manual_choice',
        reasoning: `Manuell gewählt: in ${days} Tagen`,
      });

      onPlanCreated?.();
    } catch (error) {
      console.error('Failed to create plan:', error);
    } finally {
      setIsLoading(false);
    }
  }, [leadId, workspaceId, userId, selectedChannel, onPlanCreated]);

  // Handler: AI entscheiden lassen
  const handleAiDecide = useCallback(async () => {
    setIsLoading(true);
    try {
      const plan = await createAIContactPlan(leadId, workspaceId, userId, {
        leadName,
        leadStatus: 'contacted',
        decisionState,
        lastContactAt,
        channel: selectedChannel,
        discProfile: discStyle ? {
          dominant_style: discStyle,
          disc_d: discStyle === 'D' ? 0.8 : 0.2,
          disc_i: discStyle === 'I' ? 0.8 : 0.2,
          disc_s: discStyle === 'S' ? 0.8 : 0.2,
          disc_g: discStyle === 'G' ? 0.8 : 0.2,
          confidence: discConfidence || 0.5,
        } : undefined,
        lastConversationSummary: lastConversationSummary || 'Letztes Gespräch',
        companyContext: companyContext || {
          company_name: 'AURA',
          product_name: 'Produkt',
          product_short_benefit: 'Nutzen',
        },
      });

      if (plan?.suggested_message) {
        setAiSuggestion({
          message: plan.suggested_message,
          tone: plan.suggested_message_tone,
          nextDate: plan.next_contact_at,
          reasoning: plan.reasoning,
        });
        setShowAiSuggestion(true);
      } else {
        // Fallback: Einfach 3 Tage vorschlagen
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + 3);
        setAiSuggestion({
          message: `Hey ${leadName}! Wollte kurz nachhören, ob du noch Fragen hast? 😊`,
          tone: 'freundlich',
          nextDate: fallbackDate.toISOString(),
          reasoning: 'Standard Follow-up nach 3 Tagen',
        });
        setShowAiSuggestion(true);
      }

      onPlanCreated?.();
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      // Fallback bei Fehler: Template-basierter Vorschlag
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 3);
      setAiSuggestion({
        message: `Hey ${leadName}! Wollte kurz nachhören, wie es bei dir aussieht? 😊`,
        tone: 'freundlich',
        nextDate: fallbackDate.toISOString(),
        reasoning: 'Standard Follow-up (KI nicht verfügbar)',
      });
      setShowAiSuggestion(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    leadId,
    leadName,
    workspaceId,
    userId,
    decisionState,
    lastContactAt,
    selectedChannel,
    discStyle,
    discConfidence,
    lastConversationSummary,
    companyContext,
    onPlanCreated,
  ]);

  // Handler: Skip
  const handleSkip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  return (
    <Card style={styles.container} variant="elevated">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>🔄</Text>
          <View>
            <Text style={styles.title}>Nächster Schritt</Text>
            <Text style={styles.subtitle}>mit {leadName}</Text>
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DISG Badge */}
      {discInfo && (
        <View style={[styles.discBadge, { backgroundColor: discInfo.bgColor }]}>
          <Text style={[styles.discText, { color: discInfo.color }]}>
            {discInfo.emoji} {discInfo.name}
            {discConfidence && ` (${Math.round(discConfidence * 100)}%)`}
          </Text>
          <Text style={styles.discHint}>{discInfo.communication_style}</Text>
        </View>
      )}

      {/* Decision State Badge */}
      {decisionInfo && decisionState !== 'no_decision' && (
        <View style={[styles.decisionBadge, { backgroundColor: decisionInfo.bgColor }]}>
          <Text style={[styles.decisionText, { color: decisionInfo.color }]}>
            {decisionInfo.emoji} {decisionInfo.label}
          </Text>
          <Text style={styles.decisionHint}>{decisionInfo.action_hint}</Text>
        </View>
      )}

      {/* Channel Selector */}
      <TouchableOpacity
        style={styles.channelSelector}
        onPress={() => setShowChannelPicker(true)}
      >
        <Text style={styles.channelLabel}>Kanal:</Text>
        <View style={styles.channelValue}>
          <Text style={styles.channelEmoji}>
            {CHANNEL_CONFIG[selectedChannel]?.emoji}
          </Text>
          <Text style={styles.channelText}>
            {CHANNEL_CONFIG[selectedChannel]?.label}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </View>
      </TouchableOpacity>

      {/* Quick Options */}
      <Text style={styles.sectionLabel}>Wann meldest du dich?</Text>
      <View style={styles.optionsGrid}>
        {QUICK_CONTACT_OPTIONS.slice(0, 4).map((option) => (
          <TouchableOpacity
            key={option.days}
            style={styles.optionButton}
            onPress={() => handleQuickOption(option.days)}
            disabled={isLoading}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={styles.optionLabel}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Button */}
      <TouchableOpacity
        style={[styles.aiButton, isLoading && styles.aiButtonDisabled]}
        onPress={handleAiDecide}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.aiButtonContent}>
            <ActivityIndicator size="small" color={COLORS.backgroundDark} />
            <Text style={styles.aiButtonText}>Analysiere...</Text>
          </View>
        ) : (
          <View style={styles.aiButtonContent}>
            <Text style={styles.aiButtonEmoji}>🤖</Text>
            <Text style={styles.aiButtonText}>KI entscheiden lassen</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Kein Follow-up nötig</Text>
      </TouchableOpacity>

      {/* AI Suggestion Modal */}
      <Modal
        visible={showAiSuggestion}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAiSuggestion(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAiSuggestion(false)}
        >
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 KI-Vorschlag</Text>
              <TouchableOpacity onPress={() => setShowAiSuggestion(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {aiSuggestion && (
              <>
                <View style={styles.suggestionMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Nächster Kontakt</Text>
                    <Text style={styles.metaValue}>
                      {formatNextContactDate(aiSuggestion.nextDate)}
                    </Text>
                  </View>
                  {aiSuggestion.tone && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Ton</Text>
                      <Text style={styles.metaValue}>{aiSuggestion.tone}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.messageBox}>
                  <Text style={styles.messageLabel}>Vorgeschlagene Nachricht:</Text>
                  <Text style={styles.messageText}>{aiSuggestion.message}</Text>
                </View>

                {aiSuggestion.reasoning && (
                  <Text style={styles.reasoningText}>
                    💡 {aiSuggestion.reasoning}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    // TODO: Implement copy to clipboard
                    setShowAiSuggestion(false);
                  }}
                >
                  <Text style={styles.copyButtonText}>📋 Nachricht kopieren</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowAiSuggestion(false)}
            >
              <Text style={styles.doneButtonText}>Verstanden</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Channel Picker Modal */}
      <Modal
        visible={showChannelPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChannelPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowChannelPicker(false)}
        >
          <Pressable style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Kanal wählen</Text>
            {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.pickerOption,
                  selectedChannel === key && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setSelectedChannel(key);
                  setShowChannelPicker(false);
                }}
              >
                <Text style={styles.pickerEmoji}>{config.emoji}</Text>
                <Text style={styles.pickerLabel}>{config.label}</Text>
                {selectedChannel === key && (
                  <Text style={styles.pickerCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeText: {
    fontSize: 20,
    color: COLORS.textMuted,
  },

  // DISG Badge
  discBadge: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  discText: {
    ...TYPOGRAPHY.label,
    marginBottom: 2,
  },
  discHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },

  // Decision State Badge
  decisionBadge: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  decisionText: {
    ...TYPOGRAPHY.label,
    marginBottom: 2,
  },
  decisionHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },

  // Channel Selector
  channelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  channelLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
  },
  channelValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  channelEmoji: {
    fontSize: 18,
  },
  channelText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  chevron: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },

  // Section Label
  sectionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  // Options Grid
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionEmoji: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  optionLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    fontWeight: '500',
  },

  // AI Button
  aiButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  aiButtonDisabled: {
    opacity: 0.7,
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aiButtonEmoji: {
    fontSize: 20,
  },
  aiButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.backgroundDark,
  },

  // Skip Button
  skipButton: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  skipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 20,
    color: COLORS.textMuted,
    padding: SPACING.xs,
  },

  // Suggestion Meta
  suggestionMeta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metaItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  metaLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    ...TYPOGRAPHY.label,
    color: COLORS.text,
  },

  // Message Box
  messageBox: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  messageLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  messageText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 22,
  },

  // Reasoning
  reasoningText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
  },

  // Copy Button
  copyButton: {
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },

  // Done Button
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },

  // Picker Modal
  pickerContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.xl,
  },
  pickerTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xs,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.infoBg,
  },
  pickerEmoji: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  pickerLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  pickerCheck: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default NextStepWidget;

