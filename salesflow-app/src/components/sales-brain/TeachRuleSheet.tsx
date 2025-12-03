/**
 * 🧠 TeachRuleSheet
 * =================
 * Bottom Sheet das erscheint wenn der User einen KI-Vorschlag
 * stark verändert hat.
 *
 * "Das war anders als mein Vorschlag. Soll ich das als neue Regel lernen?"
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import type {
  OverrideEvent,
  RuleScope,
  CreateRulePayload,
} from "../../api/types/salesBrain";

// =============================================================================
// CONSTANTS
// =============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  background: "#0A0A0A",
  sheet: "#111827",
  sheetBorder: "#1F2937",
  text: "#F9FAFB",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  userButton: "#1D4ED8",
  teamButton: "#9333EA",
  ignoreButton: "#374151",
  ignoreBorder: "#4B5563",
  inputBorder: "#374151",
  inputBackground: "#1F2937",
  original: "#EF4444",
  final: "#10B981",
  overlay: "rgba(0, 0, 0, 0.5)",
};

// =============================================================================
// PROPS
// =============================================================================

interface TeachRuleSheetProps {
  visible: boolean;
  overrideEvent: OverrideEvent | null;
  onClose: () => void;
  onSubmitRule: (payload: CreateRulePayload) => Promise<void> | void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TeachRuleSheet({
  visible,
  overrideEvent,
  onClose,
  onSubmitRule,
}: TeachRuleSheetProps) {
  // State
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Animation
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setNote("");
      setIsSubmitting(false);
      setShowDiff(false);
    }
  }, [visible]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleSelectScope = useCallback(
    async (selectedScope: RuleScope) => {
      if (!overrideEvent || isSubmitting) return;

      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const payload: CreateRulePayload = {
        scope: selectedScope,
        override: overrideEvent,
        note: note.trim() || undefined,
      };

      try {
        await onSubmitRule(payload);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        console.error("Failed to submit rule", e);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsSubmitting(false);
        setNote("");
        onClose();
      }
    },
    [overrideEvent, note, isSubmitting, onSubmitRule, onClose]
  );

  const handleIgnore = useCallback(() => {
    Haptics.selectionAsync();
    onClose();
  }, [onClose]);

  const toggleDiff = useCallback(() => {
    setShowDiff((prev) => !prev);
    Haptics.selectionAsync();
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (!overrideEvent) return null;

  const similarityPercent = Math.round(overrideEvent.similarityScore * 100);
  const isLowSimilarity = overrideEvent.similarityScore < 0.5;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Overlay */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleIgnore}
        />

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>🧠</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Das war anders als mein Vorschlag</Text>
                <Text style={styles.subtitle}>
                  Soll ich das als neue Regel lernen?
                </Text>
              </View>
            </View>

            {/* Similarity Badge */}
            <View style={styles.similarityContainer}>
              <View
                style={[
                  styles.similarityBadge,
                  isLowSimilarity && styles.similarityBadgeLow,
                ]}
              >
                <Text style={styles.similarityText}>
                  {similarityPercent}% Ähnlichkeit
                </Text>
              </View>
              <TouchableOpacity style={styles.diffToggle} onPress={toggleDiff}>
                <Ionicons
                  name={showDiff ? "eye-off" : "eye"}
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.diffToggleText}>
                  {showDiff ? "Ausblenden" : "Vergleich zeigen"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Diff View (Optional) */}
            {showDiff && (
              <View style={styles.diffContainer}>
                <View style={styles.diffBox}>
                  <View style={styles.diffLabel}>
                    <View style={[styles.diffDot, { backgroundColor: COLORS.original }]} />
                    <Text style={styles.diffLabelText}>Mein Vorschlag</Text>
                  </View>
                  <Text style={styles.diffText} numberOfLines={4}>
                    {overrideEvent.originalText}
                  </Text>
                </View>

                <View style={styles.diffArrow}>
                  <Ionicons name="arrow-down" size={16} color={COLORS.textMuted} />
                </View>

                <View style={styles.diffBox}>
                  <View style={styles.diffLabel}>
                    <View style={[styles.diffDot, { backgroundColor: COLORS.final }]} />
                    <Text style={styles.diffLabelText}>Deine Version</Text>
                  </View>
                  <Text style={styles.diffTextFinal} numberOfLines={4}>
                    {overrideEvent.finalText}
                  </Text>
                </View>
              </View>
            )}

            {/* Note Input */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>
                Wofür gilt das? <Text style={styles.noteOptional}>(optional)</Text>
              </Text>
              <Text style={styles.noteHint}>
                z.B. "Einwand: zu teuer", "Terminanfrage", "kalter Erstkontakt"
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Kurzer Kommentar..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.noteInput}
                multiline
                maxLength={150}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {/* Ignore */}
              <TouchableOpacity
                style={styles.ignoreButton}
                onPress={handleIgnore}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.ignoreButtonText}>Ignorieren</Text>
              </TouchableOpacity>

              {/* Scope Buttons */}
              <View style={styles.scopeButtons}>
                <TouchableOpacity
                  style={[styles.scopeButton, styles.userButton]}
                  onPress={() => handleSelectScope("user")}
                  disabled={isSubmitting}
                >
                  <Ionicons name="person" size={14} color={COLORS.text} />
                  <Text style={styles.scopeButtonText}>Nur für mich</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.scopeButton, styles.teamButton]}
                  onPress={() => handleSelectScope("team")}
                  disabled={isSubmitting}
                >
                  <Ionicons name="people" size={14} color={COLORS.text} />
                  <Text style={styles.scopeButtonText}>Für mein Team</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Context Info */}
            {overrideEvent.context && (
              <View style={styles.contextInfo}>
                <Text style={styles.contextLabel}>Kontext:</Text>
                <View style={styles.contextTags}>
                  {overrideEvent.context.channel && (
                    <View style={styles.contextTag}>
                      <Text style={styles.contextTagText}>
                        {overrideEvent.context.channel}
                      </Text>
                    </View>
                  )}
                  {overrideEvent.context.useCase && (
                    <View style={styles.contextTag}>
                      <Text style={styles.contextTagText}>
                        {overrideEvent.context.useCase}
                      </Text>
                    </View>
                  )}
                  {overrideEvent.context.leadStatus && (
                    <View style={styles.contextTag}>
                      <Text style={styles.contextTagText}>
                        {overrideEvent.context.leadStatus}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    backgroundColor: COLORS.sheet,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopWidth: 1,
    borderColor: COLORS.sheetBorder,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
  },
  content: {
    padding: 20,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconEmoji: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Similarity
  similarityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  similarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  similarityBadgeLow: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  similarityText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  diffToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  diffToggleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Diff
  diffContainer: {
    marginBottom: 16,
  },
  diffBox: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  diffLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diffLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  diffText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  diffTextFinal: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  diffArrow: {
    alignItems: "center",
    paddingVertical: 6,
  },

  // Note
  noteContainer: {
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  noteOptional: {
    fontWeight: "400",
    color: COLORS.textMuted,
  },
  noteHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 56,
    textAlignVertical: "top",
  },

  // Actions
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  ignoreButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ignoreBorder,
    backgroundColor: COLORS.ignoreButton,
    gap: 6,
  },
  ignoreButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  scopeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  scopeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    gap: 6,
  },
  userButton: {
    backgroundColor: COLORS.userButton,
  },
  teamButton: {
    backgroundColor: COLORS.teamButton,
  },
  scopeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },

  // Context
  contextInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
    marginBottom: 20,
  },
  contextLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  contextTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  contextTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.inputBackground,
  },
  contextTagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

