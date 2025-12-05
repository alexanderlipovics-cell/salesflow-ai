/**
 * ImportFromChatModal
 * ===================
 * Modal für den Import von Leads aus Chat-Verläufen (Instagram, WhatsApp, etc.)
 * 
 * Features:
 * - Chat-Text einfügen
 * - KI-Analyse der Konversation
 * - Lead-Daten-Extraktion
 * - Sentiment-Analyse
 * - Next-Step Vorschläge
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

type Channel = 'instagram' | 'facebook' | 'whatsapp' | 'telegram' | 'linkedin' | 'other';
type Temperature = 'cold' | 'warm' | 'hot';
type Sentiment = 'positive' | 'neutral' | 'negative' | 'interested' | 'hesitant';

interface ExtractedLead {
  first_name?: string;
  last_name?: string;
  social_handle?: string;
  social_url?: string;
  email?: string;
  phone?: string;
}

interface AnalysisResult {
  extracted_lead: ExtractedLead;
  suggested_temperature: Temperature;
  sentiment: Sentiment;
  objections_detected: string[];
  interests_detected: string[];
  next_step_suggestion: string;
  conversation_summary: string;
  confidence_score: number;
}

interface ImportFromChatModalProps {
  visible: boolean;
  onClose: () => void;
  onLeadCreated?: (leadId: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

import { API_CONFIG } from '../../services/apiConfig';

// API URL aus zentraler Config
const getApiBase = () => API_CONFIG.baseUrl;

const CHANNELS: { id: Channel; label: string; icon: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'facebook', label: 'Facebook', icon: '👤' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'telegram', label: 'Telegram', icon: '✈️' },
  { id: 'other', label: 'Andere', icon: '💭' },
];

const TEMPERATURES: { value: Temperature; label: string; color: string }[] = [
  { value: 'cold', label: '🥶 Kalt', color: COLORS.info },
  { value: 'warm', label: '🌤️ Warm', color: COLORS.warning },
  { value: 'hot', label: '🔥 Heiß', color: COLORS.error },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ImportFromChatModal({
  visible,
  onClose,
  onLeadCreated,
}: ImportFromChatModalProps) {
  // State
  const [step, setStep] = useState<'input' | 'analyzing' | 'review' | 'saving'>('input');
  const [channel, setChannel] = useState<Channel>('instagram');
  const [rawChat, setRawChat] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [editedLead, setEditedLead] = useState<ExtractedLead>({});
  const [temperature, setTemperature] = useState<Temperature>('warm');
  const [notes, setNotes] = useState('');
  const [nextContactDays, setNextContactDays] = useState<number | null>(3);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const resetModal = useCallback(() => {
    setStep('input');
    setRawChat('');
    setAnalysisResult(null);
    setEditedLead({});
    setTemperature('warm');
    setNotes('');
    setNextContactDays(3);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [onClose, resetModal]);

  const analyzeChat = async () => {
    if (!rawChat.trim()) {
      setError('Bitte füge einen Chat-Verlauf ein');
      return;
    }

    setStep('analyzing');
    setError(null);

    try {
      const response = await fetch(`${getApiBase()}/leads/import-from-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          raw_chat: rawChat,
          channel: channel,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResult(result);
      setEditedLead(result.extracted_lead || {});
      setTemperature(result.suggested_temperature || 'warm');
      setStep('review');
    } catch (err) {
      console.error('Chat analysis error:', err);
      setError('Fehler bei der Analyse. Bitte versuche es erneut.');
      setStep('input');
      
      // Demo-Fallback für Entwicklung
      if (process.env.NODE_ENV === 'development') {
        const demoResult: AnalysisResult = {
          extracted_lead: {
            first_name: extractNameFromChat(rawChat),
            social_handle: extractHandleFromChat(rawChat),
          },
          suggested_temperature: 'warm',
          sentiment: 'interested',
          objections_detected: ['Zeit-Einwand'],
          interests_detected: ['Nebeneinkunft', 'Flexibilität'],
          next_step_suggestion: 'Infos senden und in 2-3 Tagen nachfassen',
          conversation_summary: 'Lead zeigt Interesse, hat aber Zeit-Bedenken.',
          confidence_score: 0.75,
        };
        setAnalysisResult(demoResult);
        setEditedLead(demoResult.extracted_lead || {});
        setTemperature(demoResult.suggested_temperature);
        setStep('review');
        setError(null);
      }
    }
  };

  const saveImportedLead = async () => {
    if (!editedLead.first_name?.trim()) {
      setError('Vorname ist erforderlich');
      return;
    }

    setStep('saving');
    setError(null);

    try {
      const response = await fetch(`${getApiBase()}/leads/import-from-chat/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: editedLead.first_name,
          last_name: editedLead.last_name,
          channel: channel,
          social_handle: editedLead.social_handle,
          social_url: editedLead.social_url,
          email: editedLead.email,
          phone: editedLead.phone,
          status: 'new',
          temperature: temperature,
          notes: notes || analysisResult?.conversation_summary,
          tags: analysisResult?.interests_detected || [],
          next_contact_in_days: nextContactDays,
          next_step_message: analysisResult?.next_step_suggestion,
          original_chat: rawChat,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save Error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.lead_id) {
        onLeadCreated?.(result.lead_id);
        handleClose();
      } else {
        throw new Error('Lead konnte nicht gespeichert werden');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Fehler beim Speichern. Bitte versuche es erneut.');
      setStep('review');
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>📥 Chat Import</Text>
            <Text style={styles.headerSubtitle}>
              {step === 'input' && 'Chat einfügen'}
              {step === 'analyzing' && 'Wird analysiert...'}
              {step === 'review' && 'Daten prüfen'}
              {step === 'saving' && 'Wird gespeichert...'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Error Message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Step 1: Input */}
          {step === 'input' && (
            <InputStep
              channel={channel}
              setChannel={setChannel}
              rawChat={rawChat}
              setRawChat={setRawChat}
              onAnalyze={analyzeChat}
            />
          )}

          {/* Step 2: Analyzing */}
          {step === 'analyzing' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>KI analysiert den Chat...</Text>
              <Text style={styles.loadingSubtext}>
                Extrahiere Kontaktdaten und analysiere Stimmung
              </Text>
            </View>
          )}

          {/* Step 3: Review */}
          {step === 'review' && analysisResult && (
            <ReviewStep
              analysisResult={analysisResult}
              editedLead={editedLead}
              setEditedLead={setEditedLead}
              temperature={temperature}
              setTemperature={setTemperature}
              notes={notes}
              setNotes={setNotes}
              nextContactDays={nextContactDays}
              setNextContactDays={setNextContactDays}
              onSave={saveImportedLead}
              onBack={() => setStep('input')}
            />
          )}

          {/* Step 4: Saving */}
          {step === 'saving' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.success} />
              <Text style={styles.loadingText}>Lead wird gespeichert...</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface InputStepProps {
  channel: Channel;
  setChannel: (c: Channel) => void;
  rawChat: string;
  setRawChat: (s: string) => void;
  onAnalyze: () => void;
}

function InputStep({ channel, setChannel, rawChat, setRawChat, onAnalyze }: InputStepProps) {
  return (
    <View>
      {/* Channel Selection */}
      <Text style={styles.sectionTitle}>📱 Kanal auswählen</Text>
      <View style={styles.channelGrid}>
        {CHANNELS.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            style={[
              styles.channelChip,
              channel === ch.id && styles.channelChipActive,
            ]}
            onPress={() => setChannel(ch.id)}
          >
            <Text style={styles.channelIcon}>{ch.icon}</Text>
            <Text
              style={[
                styles.channelLabel,
                channel === ch.id && styles.channelLabelActive,
              ]}
            >
              {ch.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat Input */}
      <Text style={styles.sectionTitle}>💬 Chat-Verlauf einfügen</Text>
      <Text style={styles.sectionHint}>
        Kopiere den kompletten Chat aus {CHANNELS.find((c) => c.id === channel)?.label || 'der App'}
      </Text>
      <TextInput
        style={styles.chatInput}
        value={rawChat}
        onChangeText={setRawChat}
        placeholder={`Beispiel:\n\nAnna: Hey, ich hab dein Profil gesehen! 👋\n\nDu: Hi Anna! Danke, was interessiert dich?\n\nAnna: Erzähl mal mehr über das Business...`}
        placeholderTextColor={COLORS.textMuted}
        multiline
        textAlignVertical="top"
      />

      {/* Tips */}
      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>💡 Tipps für beste Ergebnisse</Text>
        <Text style={styles.tipItem}>• Kopiere den gesamten Verlauf</Text>
        <Text style={styles.tipItem}>• Behalte Namen/Handles bei</Text>
        <Text style={styles.tipItem}>• Entferne keine Zeitstempel</Text>
      </View>

      {/* Analyze Button */}
      <TouchableOpacity
        style={[styles.primaryButton, !rawChat.trim() && styles.buttonDisabled]}
        onPress={onAnalyze}
        disabled={!rawChat.trim()}
      >
        <Text style={styles.primaryButtonText}>🔍 Chat analysieren</Text>
      </TouchableOpacity>
    </View>
  );
}

interface ReviewStepProps {
  analysisResult: AnalysisResult;
  editedLead: ExtractedLead;
  setEditedLead: (l: ExtractedLead) => void;
  temperature: Temperature;
  setTemperature: (t: Temperature) => void;
  notes: string;
  setNotes: (s: string) => void;
  nextContactDays: number | null;
  setNextContactDays: (n: number | null) => void;
  onSave: () => void;
  onBack: () => void;
}

function ReviewStep({
  analysisResult,
  editedLead,
  setEditedLead,
  temperature,
  setTemperature,
  notes,
  setNotes,
  nextContactDays,
  setNextContactDays,
  onSave,
  onBack,
}: ReviewStepProps) {
  const updateLead = (key: keyof ExtractedLead, value: string) => {
    setEditedLead({ ...editedLead, [key]: value });
  };

  return (
    <View>
      {/* AI Insights */}
      <View style={styles.insightsCard}>
        <Text style={styles.insightsTitle}>🤖 KI-Analyse</Text>
        
        {/* Sentiment */}
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Stimmung:</Text>
          <Text style={styles.insightValue}>
            {getSentimentEmoji(analysisResult.sentiment)} {getSentimentLabel(analysisResult.sentiment)}
          </Text>
        </View>

        {/* Summary */}
        <Text style={styles.summaryText}>{analysisResult.conversation_summary}</Text>

        {/* Interests */}
        {analysisResult.interests_detected.length > 0 && (
          <View style={styles.tagsRow}>
            <Text style={styles.tagsLabel}>Interessen:</Text>
            <View style={styles.tagsList}>
              {analysisResult.interests_detected.map((interest, i) => (
                <View key={i} style={styles.tagChip}>
                  <Text style={styles.tagText}>✨ {interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Objections */}
        {analysisResult.objections_detected.length > 0 && (
          <View style={styles.tagsRow}>
            <Text style={styles.tagsLabel}>Einwände:</Text>
            <View style={styles.tagsList}>
              {analysisResult.objections_detected.map((objection, i) => (
                <View key={i} style={[styles.tagChip, styles.objectionChip]}>
                  <Text style={styles.objectionText}>⚠️ {objection}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Next Step */}
        <View style={styles.nextStepBox}>
          <Text style={styles.nextStepLabel}>💡 Empfohlener nächster Schritt:</Text>
          <Text style={styles.nextStepText}>{analysisResult.next_step_suggestion}</Text>
        </View>
      </View>

      {/* Lead Data Form */}
      <Text style={styles.sectionTitle}>👤 Lead-Daten</Text>
      
      <View style={styles.formRow}>
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Vorname *</Text>
          <TextInput
            style={styles.textInput}
            value={editedLead.first_name || ''}
            onChangeText={(v) => updateLead('first_name', v)}
            placeholder="Max"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Nachname</Text>
          <TextInput
            style={styles.textInput}
            value={editedLead.last_name || ''}
            onChangeText={(v) => updateLead('last_name', v)}
            placeholder="Mustermann"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Social Handle</Text>
        <TextInput
          style={styles.textInput}
          value={editedLead.social_handle || ''}
          onChangeText={(v) => updateLead('social_handle', v)}
          placeholder="@username"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>E-Mail</Text>
        <TextInput
          style={styles.textInput}
          value={editedLead.email || ''}
          onChangeText={(v) => updateLead('email', v)}
          placeholder="email@example.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>Telefon</Text>
        <TextInput
          style={styles.textInput}
          value={editedLead.phone || ''}
          onChangeText={(v) => updateLead('phone', v)}
          placeholder="+49 123 456789"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
        />
      </View>

      {/* Temperature */}
      <Text style={styles.sectionTitle}>🌡️ Temperatur</Text>
      <View style={styles.temperatureRow}>
        {TEMPERATURES.map((temp) => (
          <TouchableOpacity
            key={temp.value}
            style={[
              styles.temperatureChip,
              temperature === temp.value && { borderColor: temp.color, backgroundColor: `${temp.color}20` },
            ]}
            onPress={() => setTemperature(temp.value)}
          >
            <Text style={styles.temperatureLabel}>{temp.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Next Contact */}
      <Text style={styles.sectionTitle}>📅 Follow-up in</Text>
      <View style={styles.daysRow}>
        {[1, 2, 3, 5, 7].map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.dayChip,
              nextContactDays === days && styles.dayChipActive,
            ]}
            onPress={() => setNextContactDays(days)}
          >
            <Text style={[styles.dayText, nextContactDays === days && styles.dayTextActive]}>
              {days} {days === 1 ? 'Tag' : 'Tage'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.dayChip,
            nextContactDays === null && styles.dayChipActive,
          ]}
          onPress={() => setNextContactDays(null)}
        >
          <Text style={[styles.dayText, nextContactDays === null && styles.dayTextActive]}>
            Keins
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <Text style={styles.sectionTitle}>📝 Notizen</Text>
      <TextInput
        style={[styles.textInput, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Zusätzliche Notizen..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        textAlignVertical="top"
      />

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>← Zurück</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !editedLead.first_name?.trim() && styles.buttonDisabled]}
          onPress={onSave}
          disabled={!editedLead.first_name?.trim()}
        >
          <Text style={styles.primaryButtonText}>✓ Lead speichern</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractNameFromChat(chat: string): string {
  // Simple extraction - first name that appears
  const lines = chat.split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Za-zÄÖÜäöüß]+):/);
    if (match && match[1].toLowerCase() !== 'du' && match[1].toLowerCase() !== 'ich') {
      return match[1];
    }
  }
  return '';
}

function extractHandleFromChat(chat: string): string {
  const match = chat.match(/@([a-zA-Z0-9_.]+)/);
  return match ? `@${match[1]}` : '';
}

function getSentimentEmoji(sentiment: Sentiment): string {
  const emojis: Record<Sentiment, string> = {
    positive: '😊',
    neutral: '😐',
    negative: '😟',
    interested: '🤔',
    hesitant: '🤨',
  };
  return emojis[sentiment] || '😐';
}

function getSentimentLabel(sentiment: Sentiment): string {
  const labels: Record<Sentiment, string> = {
    positive: 'Positiv',
    neutral: 'Neutral',
    negative: 'Negativ',
    interested: 'Interessiert',
    hesitant: 'Zögernd',
  };
  return labels[sentiment] || 'Unbekannt';
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl,
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.white,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg || '#fee2e2',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.error,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  loadingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },

  // Channel Grid
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  channelChipActive: {
    backgroundColor: COLORS.primaryLight || COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  channelIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  channelLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  channelLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Chat Input
  chatInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 200,
    maxHeight: 300,
  },

  // Tips
  tipsBox: {
    backgroundColor: COLORS.infoBg || '#eff6ff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  tipItem: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 2,
  },

  // Insights Card
  insightsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  insightLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  tagsRow: {
    marginBottom: SPACING.sm,
  },
  tagsLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagChip: {
    backgroundColor: COLORS.successBg || '#dcfce7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.success,
  },
  objectionChip: {
    backgroundColor: COLORS.warningBg || '#fef3c7',
  },
  objectionText: {
    fontSize: 12,
    color: COLORS.warning,
  },
  nextStepBox: {
    backgroundColor: COLORS.primaryLight || COLORS.primary + '10',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  nextStepLabel: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  nextStepText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },

  // Form
  formRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  formField: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
  },
  notesInput: {
    minHeight: 80,
  },

  // Temperature
  temperatureRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  temperatureChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  temperatureLabel: {
    fontSize: 14,
    color: COLORS.text,
  },

  // Days
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dayTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  secondaryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

