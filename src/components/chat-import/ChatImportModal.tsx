/**
 * ChatImportModal V2
 * ===================
 * Modal für den Import von Chatverläufen mit Conversation Intelligence
 *
 * Features:
 * - Chat-Text einfügen
 * - KI-Analyse mit Claude
 * - Lead-Extraktion mit Status & Deal-State
 * - Template Extraction Preview
 * - Objection Detection Preview
 * - Next Action Planning
 * - Learning Case Option
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { API_CONFIG } from "../../services/apiConfig";
import { useAuth } from "../../context/AuthContext";
import type {
  ChatImportResult,
  Channel,
  LeadStatus,
  DealState,
  ActionType,
  SaveImportResponse,
} from "../../api/types/chatImport";

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = {
  background: "#0A0A0A",
  card: "#1C1C1E",
  cardBorder: "#2C2C2E",
  primary: "#34C759",
  primaryDark: "#248A3D",
  secondary: "#007AFF",
  warning: "#FF9500",
  error: "#FF3B30",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
};

const CHANNELS: { id: Channel; label: string; icon: string }[] = [
  { id: "whatsapp", label: "WhatsApp", icon: "📱" },
  { id: "instagram_dm", label: "Instagram", icon: "📸" },
  { id: "facebook_messenger", label: "Facebook", icon: "💬" },
  { id: "telegram", label: "Telegram", icon: "✈️" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "email", label: "E-Mail", icon: "📧" },
  { id: "other", label: "Andere", icon: "💭" },
];

// =============================================================================
// PROPS
// =============================================================================

interface ChatImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: SaveImportResponse) => void;
  defaultChannel?: Channel;
  defaultVerticalId?: string;
  defaultCompanyId?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ChatImportModal({
  visible,
  onClose,
  onSuccess,
  defaultChannel,
  defaultVerticalId,
  defaultCompanyId,
}: ChatImportModalProps) {
  // Auth
  const { getAccessToken } = useAuth();
  
  // State
  const [step, setStep] = useState<"input" | "analyzing" | "preview" | "saving">("input");
  const [rawText, setRawText] = useState("");
  const [channel, setChannel] = useState<Channel>(defaultChannel || "whatsapp");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ChatImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [extractTemplates, setExtractTemplates] = useState(true);
  const [extractObjections, setExtractObjections] = useState(true);
  const [createContactPlan, setCreateContactPlan] = useState(true);
  const [saveAsLearningCase, setSaveAsLearningCase] = useState(false);

  // Overrides
  const [nameOverride, setNameOverride] = useState("");
  const [statusOverride, setStatusOverride] = useState<LeadStatus | null>(null);
  const [dealStateOverride, setDealStateOverride] = useState<DealState | null>(null);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleAnalyze = useCallback(async () => {
    if (!rawText.trim()) return;

    setIsAnalyzing(true);
    setStep("analyzing");
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_CONFIG.baseUrl}/chat-import/analyze`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          raw_text: rawText,
          channel: channel,
          vertical_id: defaultVerticalId,
          company_id: defaultCompanyId,
          extract_templates: extractTemplates,
          extract_objections: extractObjections,
          create_contact_plan: createContactPlan,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result: ChatImportResult = await response.json();
      setAnalysisResult(result);
      setStep("preview");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || "Analyse fehlgeschlagen");
      setStep("input");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [rawText, channel, defaultVerticalId, defaultCompanyId, extractTemplates, extractObjections, createContactPlan, getAccessToken]);

  const handleSave = useCallback(async () => {
    if (!analysisResult) return;

    setStep("saving");

    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_CONFIG.baseUrl}/chat-import/save`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          import_result: analysisResult,
          raw_text: rawText,
          lead_name_override: nameOverride || undefined,
          lead_status_override: statusOverride || undefined,
          deal_state_override: dealStateOverride || undefined,
          create_lead: true,
          create_contact_plan: createContactPlan,
          save_templates: extractTemplates,
          save_objections: extractObjections,
          save_as_learning_case: saveAsLearningCase,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save Error: ${response.status}`);
      }

      const result: SaveImportResponse = await response.json();

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess?.(result);
        handleClose();
      } else {
        throw new Error(result.message || "Speichern fehlgeschlagen");
      }
    } catch (e: any) {
      setError(e.message || "Speichern fehlgeschlagen");
      setStep("preview");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [analysisResult, rawText, nameOverride, statusOverride, dealStateOverride, createContactPlan, extractTemplates, extractObjections, saveAsLearningCase, onSuccess, getAccessToken]);

  const handleClose = useCallback(() => {
    setStep("input");
    setRawText("");
    setAnalysisResult(null);
    setError(null);
    setNameOverride("");
    setStatusOverride(null);
    setDealStateOverride(null);
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    setStep("input");
    setAnalysisResult(null);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setRawText(text);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.error("Paste error:", e);
    }
  }, []);

  const copyMessage = useCallback(async (text: string) => {
    try {
      await Clipboard.setString(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Copy error:", e);
    }
  }, []);

  // =============================================================================
  // RENDER: INPUT STEP
  // =============================================================================

  const renderInputStep = () => (
    <>
      <Text style={styles.subtitle}>
        Füge deinen Chatverlauf hier ein. CHIEF analysiert automatisch Lead-Daten,
        Status und schlägt den nächsten Schritt vor.
      </Text>

      {/* Channel Selection */}
      <Text style={styles.sectionTitle}>Kanal</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.channelScroll}>
        {CHANNELS.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            style={[styles.channelChip, channel === ch.id && styles.channelChipActive]}
            onPress={() => setChannel(ch.id)}
          >
            <Text style={styles.channelIcon}>{ch.icon}</Text>
            <Text style={[styles.channelLabel, channel === ch.id && styles.channelLabelActive]}>
              {ch.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chat Input */}
      <View style={styles.inputHeader}>
        <Text style={styles.sectionTitle}>Chatverlauf</Text>
        <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
          <Ionicons name="clipboard-outline" size={16} color={COLORS.primary} />
          <Text style={styles.pasteButtonText}>Einfügen</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.textArea}
        value={rawText}
        onChangeText={setRawText}
        placeholder="Kopiere den gesamten Chatverlauf hier rein...

Beispiel:
Ich: Hey Nadja! 👋
Nadja: Hi, wer bist du?
Ich: Ich bin Alex von WinStage...
"
        placeholderTextColor={COLORS.textMuted}
        multiline
        textAlignVertical="top"
      />

      {/* Options */}
      <View style={styles.optionsContainer}>
        <Text style={styles.optionsTitle}>Optionen</Text>

        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Templates extrahieren</Text>
            <Text style={styles.optionHint}>Beste Nachrichten speichern</Text>
          </View>
          <Switch
            value={extractTemplates}
            onValueChange={setExtractTemplates}
            trackColor={{ false: "#3A3A3C", true: COLORS.primary }}
          />
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Einwände erkennen</Text>
            <Text style={styles.optionHint}>Für Objection Brain</Text>
          </View>
          <Switch
            value={extractObjections}
            onValueChange={setExtractObjections}
            trackColor={{ false: "#3A3A3C", true: COLORS.primary }}
          />
        </View>

        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Follow-up planen</Text>
            <Text style={styles.optionHint}>Automatisch in Daily Flow</Text>
          </View>
          <Switch
            value={createContactPlan}
            onValueChange={setCreateContactPlan}
            trackColor={{ false: "#3A3A3C", true: COLORS.primary }}
          />
        </View>

        <View style={[styles.optionRow, styles.optionRowLast]}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Als Learning Case</Text>
            <Text style={styles.optionHint}>Für Living OS Training</Text>
          </View>
          <Switch
            value={saveAsLearningCase}
            onValueChange={setSaveAsLearningCase}
            trackColor={{ false: "#3A3A3C", true: "#FFD700" }}
          />
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>Abbrechen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, !rawText.trim() && styles.buttonDisabled]}
          onPress={handleAnalyze}
          disabled={!rawText.trim() || isAnalyzing}
        >
          <Ionicons name="sparkles" size={18} color="#FFF" />
          <Text style={styles.primaryButtonText}>Analysieren</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // =============================================================================
  // RENDER: ANALYZING STEP
  // =============================================================================

  const renderAnalyzingStep = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.analyzingText}>KI analysiert den Chat...</Text>
      <Text style={styles.analyzingSubtext}>
        Lead-Extraktion • Status • Templates • Einwände
      </Text>
    </View>
  );

  // =============================================================================
  // RENDER: PREVIEW STEP
  // =============================================================================

  const renderPreviewStep = () => {
    if (!analysisResult) return null;

    const {
      lead_candidate,
      lead_status,
      deal_state,
      next_action,
      conversation_summary,
      extracted_templates,
      detected_objections,
      confidence_score,
      uncertainty_notes,
    } = analysisResult;

    return (
      <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
        {/* Confidence Indicator */}
        <View style={styles.confidenceBar}>
          <View style={[styles.confidenceFill, { width: `${confidence_score * 100}%` }]} />
          <Text style={styles.confidenceText}>
            {Math.round(confidence_score * 100)}% Konfidenz
          </Text>
        </View>

        {/* Lead Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <TextInput
              style={styles.infoInput}
              value={nameOverride || lead_candidate.name || ""}
              onChangeText={setNameOverride}
              placeholder="Name eingeben..."
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {lead_candidate.handle_or_profile && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Handle</Text>
              <Text style={styles.infoValue}>@{lead_candidate.handle_or_profile}</Text>
            </View>
          )}

          {lead_candidate.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefon</Text>
              <Text style={styles.infoValue}>{lead_candidate.phone}</Text>
            </View>
          )}

          {lead_candidate.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-Mail</Text>
              <Text style={styles.infoValue}>{lead_candidate.email}</Text>
            </View>
          )}
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>

          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[
                styles.statusBadge,
                (statusOverride || lead_status) === lead_status && styles.statusBadgeActive,
              ]}
              onPress={() => setStatusOverride(null)}
            >
              <Text style={styles.statusBadgeText}>
                {getStatusEmoji(lead_status)} {lead_status}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBadge,
                styles.dealStateBadge,
                (dealStateOverride || deal_state) === deal_state && styles.dealStateBadgeActive,
              ]}
              onPress={() => setDealStateOverride(null)}
            >
              <Text style={styles.statusBadgeText}>
                {getDealStateEmoji(deal_state)} {deal_state}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.summaryText}>{conversation_summary.summary}</Text>

          {conversation_summary.main_blocker && (
            <View style={styles.blockerBox}>
              <Ionicons name="warning" size={14} color={COLORS.warning} />
              <Text style={styles.blockerText}>Blocker: {conversation_summary.main_blocker}</Text>
            </View>
          )}
        </View>

        {/* Next Action */}
        {next_action.action_type !== "no_action" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nächster Schritt</Text>

            <View style={styles.nextActionBox}>
              <View style={styles.nextActionHeader}>
                <Ionicons
                  name={getActionIcon(next_action.action_type) as any}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.nextActionType}>
                  {getActionLabel(next_action.action_type)}
                </Text>
                {next_action.suggested_date && (
                  <Text style={styles.nextActionDate}>
                    {formatDate(next_action.suggested_date)}
                  </Text>
                )}
                {next_action.is_urgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>DRINGEND</Text>
                  </View>
                )}
              </View>

              {next_action.reasoning && (
                <Text style={styles.reasoningText}>{next_action.reasoning}</Text>
              )}

              {next_action.suggested_message && (
                <TouchableOpacity
                  style={styles.suggestedMessageBox}
                  onPress={() => copyMessage(next_action.suggested_message!)}
                >
                  <View style={styles.suggestedMessageHeader}>
                    <Text style={styles.suggestedMessageLabel}>Vorgeschlagene Nachricht:</Text>
                    <Ionicons name="copy-outline" size={14} color={COLORS.textMuted} />
                  </View>
                  <Text style={styles.suggestedMessageText}>
                    {next_action.suggested_message}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Extracted Templates */}
        {extracted_templates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Extrahierte Templates ({extracted_templates.length})
            </Text>

            {extracted_templates.slice(0, 3).map((template, i) => (
              <TouchableOpacity
                key={i}
                style={styles.templateBox}
                onPress={() => copyMessage(template.content)}
              >
                <View style={styles.templateHeader}>
                  <Text style={styles.templateUseCase}>{template.use_case}</Text>
                  <Ionicons name="copy-outline" size={14} color={COLORS.textMuted} />
                </View>
                <Text style={styles.templateContent} numberOfLines={3}>
                  {template.content}
                </Text>
                {template.effectiveness_indicators.length > 0 && (
                  <View style={styles.indicatorRow}>
                    {template.effectiveness_indicators.slice(0, 2).map((ind, j) => (
                      <View key={j} style={styles.indicatorBadge}>
                        <Text style={styles.indicatorText}>✓ {ind}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Detected Objections */}
        {detected_objections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Erkannte Einwände ({detected_objections.length})
            </Text>

            {detected_objections.map((obj, i) => (
              <View key={i} style={styles.objectionBox}>
                <View style={styles.objectionHeader}>
                  <Text style={styles.objectionType}>
                    {getObjectionEmoji(obj.objection_type)} {obj.objection_type}
                  </Text>
                  {obj.response_worked !== null && (
                    <Text style={styles.objectionWorked}>
                      {obj.response_worked ? "✅ Erfolgreich" : "❌ Nicht erfolgreich"}
                    </Text>
                  )}
                </View>
                <Text style={styles.objectionText}>"{obj.objection_text}"</Text>
                {obj.response_text && (
                  <Text style={styles.objectionResponse}>→ {obj.response_text}</Text>
                )}
                {obj.response_technique && (
                  <View style={styles.techniqueBadge}>
                    <Text style={styles.techniqueText}>{obj.response_technique}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Uncertainty Notes */}
        {uncertainty_notes.length > 0 && (
          <View style={styles.uncertaintyBox}>
            <Ionicons name="information-circle" size={16} color={COLORS.warning} />
            <Text style={styles.uncertaintyText}>{uncertainty_notes.join(" ")}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={[styles.actions, { marginTop: 16, marginBottom: 32 }]}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
            <Text style={styles.cancelButtonText}>Zurück</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.primaryButtonText}>Speichern</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // =============================================================================
  // RENDER: SAVING STEP
  // =============================================================================

  const renderSavingStep = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.savingText}>Wird gespeichert...</Text>
      <Text style={styles.savingSubtext}>Lead • Follow-up • Templates</Text>
    </View>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Chat importieren</Text>
            <Text style={styles.headerSubtitle}>
              {step === "input" && "Chat einfügen"}
              {step === "analyzing" && "Wird analysiert..."}
              {step === "preview" && "Daten prüfen"}
              {step === "saving" && "Wird gespeichert..."}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {step === "input" && renderInputStep()}
          {step === "analyzing" && renderAnalyzingStep()}
          {step === "preview" && renderPreviewStep()}
          {step === "saving" && renderSavingStep()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusEmoji(status: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    cold: "❄️",
    warm: "🌤️",
    hot: "🔥",
    customer: "💎",
    lost: "❌",
    unknown: "❓",
  };
  return map[status] || "❓";
}

function getDealStateEmoji(state: DealState): string {
  const map: Record<DealState, string> = {
    none: "⚪",
    considering: "🤔",
    pending_payment: "💳",
    paid: "✅",
    on_hold: "⏸️",
    lost: "❌",
  };
  return map[state] || "⚪";
}

function getActionIcon(action: ActionType): string {
  const map: Record<ActionType, string> = {
    no_action: "remove-circle-outline",
    follow_up_message: "chatbubble-outline",
    call: "call-outline",
    check_payment: "card-outline",
    reactivation_follow_up: "refresh-outline",
    send_info: "document-outline",
    schedule_meeting: "calendar-outline",
    wait_for_lead: "hourglass-outline",
    custom: "ellipsis-horizontal-outline",
  };
  return map[action] || "arrow-forward-outline";
}

function getActionLabel(action: ActionType): string {
  const map: Record<ActionType, string> = {
    no_action: "Keine Aktion",
    follow_up_message: "Follow-up senden",
    call: "Anrufen",
    check_payment: "Zahlung prüfen",
    reactivation_follow_up: "Reaktivieren",
    send_info: "Infos senden",
    schedule_meeting: "Termin vereinbaren",
    wait_for_lead: "Auf Lead warten",
    custom: "Benutzerdefiniert",
  };
  return map[action] || action;
}

function getObjectionEmoji(type: string): string {
  const map: Record<string, string> = {
    price: "💰",
    time: "⏰",
    think_about_it: "🤔",
    not_interested: "🚫",
    competitor: "🏢",
    trust: "🤝",
    need: "🎯",
    authority: "👥",
    other: "❓",
  };
  return map[type] || "❓";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(52, 199, 89, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },

  // Channel Selection
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
  },
  channelScroll: {
    marginBottom: 8,
  },
  channelChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
  },
  channelChipActive: {
    backgroundColor: "rgba(52, 199, 89, 0.15)",
    borderColor: COLORS.primary,
  },
  channelIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  channelLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  channelLabelActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Input
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  pasteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pasteButtonText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  textArea: {
    flex: 1,
    minHeight: 180,
    maxHeight: 250,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: 8,
  },

  // Options
  optionsContainer: {
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  optionsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  optionHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
  },

  // Actions
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Analyzing/Saving
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 20,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  savingText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 20,
  },
  savingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  // Preview
  previewScroll: {
    flex: 1,
  },
  confidenceBar: {
    height: 24,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    justifyContent: "center",
  },
  confidenceFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    width: 70,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  infoInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(52, 199, 89, 0.15)",
    borderColor: COLORS.primary,
  },
  dealStateBadge: {
    backgroundColor: COLORS.card,
  },
  dealStateBadgeActive: {
    backgroundColor: "rgba(0, 122, 255, 0.15)",
    borderColor: COLORS.secondary,
  },
  statusBadgeText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  blockerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  blockerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
  },

  // Next Action
  nextActionBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  nextActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  nextActionType: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  nextActionDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  urgentBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  reasoningText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    fontStyle: "italic",
  },
  suggestedMessageBox: {
    marginTop: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
  },
  suggestedMessageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  suggestedMessageLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  suggestedMessageText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },

  // Templates
  templateBox: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  templateUseCase: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  templateContent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  indicatorRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  indicatorBadge: {
    backgroundColor: "rgba(52, 199, 89, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  indicatorText: {
    fontSize: 11,
    color: COLORS.primary,
  },

  // Objections
  objectionBox: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  objectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  objectionType: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.warning,
  },
  objectionWorked: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  objectionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  objectionResponse: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  techniqueBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  techniqueText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: "500",
  },

  // Uncertainty
  uncertaintyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 149, 0, 0.1)",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  uncertaintyText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warning,
    lineHeight: 16,
  },
});

