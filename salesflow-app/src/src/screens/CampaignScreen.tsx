/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CAMPAIGN SCREEN                                                            ║
 * ║  Systematisches Outreach mit Templates                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Clipboard,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';
import { AURA_COLORS, AURA_SHADOWS, AURA_SPACING, AURA_RADIUS } from '../components/aura';

// API URL
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// Branchen
const INDUSTRIES = [
  { key: 'immobilien', label: '🏠 Immobilien', color: '#10b981' },
  { key: 'mlm_leader', label: '🌐 MLM Leader', color: '#8b5cf6' },
  { key: 'hotel', label: '🏨 Hotel', color: '#f59e0b' },
];

// Kanäle
const CHANNELS = [
  { key: 'email', label: '📧 E-Mail', icon: 'mail' },
  { key: 'linkedin', label: '💼 LinkedIn', icon: 'logo-linkedin' },
  { key: 'whatsapp', label: '💬 WhatsApp', icon: 'logo-whatsapp' },
  { key: 'instagram_dm', label: '📸 Instagram DM', icon: 'logo-instagram' },
];

// Campaign Types
const CAMPAIGN_TYPES = [
  { key: 'cold_outreach', label: '❄️ Cold Outreach', color: '#06b6d4' },
  { key: 'follow_up_sequence', label: '📬 Follow-up Sequenz', color: '#10b981' },
  { key: 'reactivation', label: '🔄 Reaktivierung', color: '#f59e0b' },
];

interface Template {
  campaign_type: string;
  industry: string;
  channel: string;
  has_subject: boolean;
}

interface GeneratedMessage {
  type: string;
  subject?: string;
  body: string;
  channel: string;
  confidence: number;
}

export default function CampaignScreen() {
  const navigation = useNavigation();
  const [industry, setIndustry] = useState<string>('immobilien');
  const [channel, setChannel] = useState<string>('email');
  const [campaignType, setCampaignType] = useState<string>('cold_outreach');
  const [contactName, setContactName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [personalize, setPersonalize] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedMessage | null>(null);
  const [error, setError] = useState<string>('');
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);

  // Lade verfügbare Templates beim Start
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${getApiUrl()}/api/v2/campaigns/templates`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const generateOutreach = async () => {
    if (!contactName.trim() || !companyName.trim()) {
      setError('Bitte Kontaktname und Firmenname eingeben');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${getApiUrl()}/api/v2/campaigns/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry,
          channel,
          contact_name: contactName.trim(),
          company_name: companyName.trim(),
          campaign_type: campaignType,
          personalize,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.message) {
        setGeneratedMessage(data.message);
      } else {
        setError(data.detail || 'Fehler bei der Generierung');
      }
    } catch (err: any) {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
      console.error('Error generating outreach:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('✅', 'Nachricht in Zwischenablage kopiert');
  };

  const isTemplateAvailable = () => {
    return availableTemplates.some(
      (t) =>
        t.industry === industry &&
        t.channel === channel &&
        t.campaign_type === campaignType
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={AURA_COLORS.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📢 Campaign Templates</Text>
          <Text style={styles.headerSubtitle}>Systematisches Outreach</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Campaign Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Campaign-Typ</Text>
          <View style={styles.optionsRow}>
            {CAMPAIGN_TYPES.map((type) => (
              <Pressable
                key={type.key}
                style={[
                  styles.optionChip,
                  campaignType === type.key && { backgroundColor: type.color + '30', borderColor: type.color },
                ]}
                onPress={() => setCampaignType(type.key)}
              >
                <Text
                  style={[
                    styles.optionText,
                    campaignType === type.key && { color: type.color, fontWeight: '700' },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Industry Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Branche</Text>
          <View style={styles.optionsRow}>
            {INDUSTRIES.map((ind) => (
              <Pressable
                key={ind.key}
                style={[
                  styles.optionChip,
                  industry === ind.key && { backgroundColor: ind.color + '30', borderColor: ind.color },
                ]}
                onPress={() => setIndustry(ind.key)}
              >
                <Text
                  style={[
                    styles.optionText,
                    industry === ind.key && { color: ind.color, fontWeight: '700' },
                  ]}
                >
                  {ind.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Channel Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Kanal</Text>
          <View style={styles.optionsRow}>
            {CHANNELS.map((ch) => (
              <Pressable
                key={ch.key}
                style={[
                  styles.optionChip,
                  channel === ch.key && { backgroundColor: AURA_COLORS.neon.cyan + '30', borderColor: AURA_COLORS.neon.cyan },
                ]}
                onPress={() => setChannel(ch.key)}
              >
                <Text
                  style={[
                    styles.optionText,
                    channel === ch.key && { color: AURA_COLORS.neon.cyan, fontWeight: '700' },
                  ]}
                >
                  {ch.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Contact Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Kontaktname</Text>
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="z.B. Max Mustermann"
            placeholderTextColor={AURA_COLORS.text.muted}
          />
        </View>

        {/* Company Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Firmenname</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="z.B. Mustermann GmbH"
            placeholderTextColor={AURA_COLORS.text.muted}
          />
        </View>

        {/* Personalize Toggle */}
        <View style={styles.section}>
          <Pressable
            style={styles.toggleRow}
            onPress={() => setPersonalize(!personalize)}
          >
            <Text style={styles.toggleLabel}>🤖 Mit AI personalisieren</Text>
            <View style={[styles.toggle, personalize && styles.toggleActive]}>
              <View style={[styles.toggleThumb, personalize && styles.toggleThumbActive]} />
            </View>
          </Pressable>
        </View>

        {/* Template Availability Indicator */}
        {!isTemplateAvailable() && !templatesLoading && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Kein Template für diese Kombination verfügbar
            </Text>
          </View>
        )}

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Generate Button */}
        <Pressable
          style={[
            styles.generateButton,
            (loading || !isTemplateAvailable()) && styles.generateButtonDisabled,
          ]}
          onPress={generateOutreach}
          disabled={loading || !isTemplateAvailable()}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>
              ✨ Outreach generieren
            </Text>
          )}
        </Pressable>

        {/* Generated Message */}
        {generatedMessage && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>✨ Generierte Nachricht</Text>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(generatedMessage.confidence * 100)}% Match
                </Text>
              </View>
            </View>

            {generatedMessage.subject && (
              <View style={styles.subjectContainer}>
                <Text style={styles.subjectLabel}>Betreff:</Text>
                <View style={styles.subjectBox}>
                  <Text style={styles.subjectText}>{generatedMessage.subject}</Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(generatedMessage.subject!)}
                    style={styles.copyButton}
                  >
                    <Ionicons name="copy-outline" size={18} color={AURA_COLORS.neon.cyan} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.bodyContainer}>
              <Text style={styles.bodyLabel}>Nachricht:</Text>
              <View style={styles.bodyBox}>
                <Text style={styles.bodyText}>{generatedMessage.body}</Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(generatedMessage.body)}
                  style={styles.copyButton}
                >
                  <Ionicons name="copy-outline" size={18} color={AURA_COLORS.neon.cyan} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.channelBadge}>
              <Text style={styles.channelText}>📱 Kanal: {generatedMessage.channel}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AURA_SPACING.lg,
    paddingTop: 60,
    paddingBottom: AURA_SPACING.md,
    backgroundColor: AURA_COLORS.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.subtle,
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: AURA_SPACING.xl,
  },
  section: {
    paddingHorizontal: AURA_SPACING.lg,
    paddingVertical: AURA_SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: AURA_SPACING.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AURA_SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: AURA_SPACING.md,
    paddingVertical: AURA_SPACING.sm,
    borderRadius: AURA_RADIUS.full,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    backgroundColor: AURA_COLORS.glass.surface,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: AURA_COLORS.text.secondary,
  },
  input: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    paddingHorizontal: AURA_SPACING.md,
    paddingVertical: AURA_SPACING.md,
    fontSize: 15,
    color: AURA_COLORS.text.primary,
    ...AURA_SHADOWS.subtle,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AURA_SPACING.sm,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: AURA_COLORS.text.primary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: AURA_COLORS.glass.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  warningBox: {
    backgroundColor: AURA_COLORS.neon.amber + '20',
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.md,
    marginHorizontal: AURA_SPACING.lg,
    marginBottom: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.neon.amber,
  },
  warningText: {
    fontSize: 13,
    color: AURA_COLORS.neon.amber,
    textAlign: 'center',
  },
  error: {
    color: AURA_COLORS.neon.rose,
    fontSize: 13,
    paddingHorizontal: AURA_SPACING.lg,
    marginBottom: AURA_SPACING.md,
  },
  generateButton: {
    backgroundColor: AURA_COLORS.neon.cyan,
    borderRadius: AURA_RADIUS.md,
    paddingVertical: AURA_SPACING.md,
    paddingHorizontal: AURA_SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: AURA_SPACING.lg,
    marginTop: AURA_SPACING.md,
    ...AURA_SHADOWS.md,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.lg,
    marginHorizontal: AURA_SPACING.lg,
    marginTop: AURA_SPACING.xl,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AURA_SPACING.md,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  confidenceBadge: {
    backgroundColor: AURA_COLORS.neon.green + '30',
    paddingHorizontal: AURA_SPACING.sm,
    paddingVertical: 4,
    borderRadius: AURA_RADIUS.sm,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.neon.green,
  },
  subjectContainer: {
    marginBottom: AURA_SPACING.md,
  },
  subjectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AURA_COLORS.text.secondary,
    marginBottom: AURA_SPACING.xs,
  },
  subjectBox: {
    backgroundColor: AURA_COLORS.bg.primary,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subjectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  bodyContainer: {
    marginBottom: AURA_SPACING.md,
  },
  bodyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: AURA_COLORS.text.secondary,
    marginBottom: AURA_SPACING.xs,
  },
  bodyBox: {
    backgroundColor: AURA_COLORS.bg.primary,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bodyText: {
    flex: 1,
    fontSize: 15,
    color: AURA_COLORS.text.primary,
    lineHeight: 22,
  },
  copyButton: {
    padding: AURA_SPACING.xs,
    marginLeft: AURA_SPACING.sm,
  },
  channelBadge: {
    backgroundColor: AURA_COLORS.neon.cyan + '20',
    borderRadius: AURA_RADIUS.sm,
    paddingHorizontal: AURA_SPACING.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
});

