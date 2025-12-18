/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  GHOST BUSTER CARD                                                         ║
 * ║  Card-Komponente für Ghost-Leads mit Reaktivierungs-Optionen              ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type {
  GhostLeadResponse,
  GhostBusterTemplate,
  FollowUpStrategy,
} from '../../types/pulseTracker';
import { MOOD_EMOJIS, DECISION_EMOJIS, STRATEGY_LABELS } from '../../types/pulseTracker';

// =============================================================================
// TYPES
// =============================================================================

interface GhostBusterCardProps {
  ghost: GhostLeadResponse;
  onSendGhostBuster: (outreachId: string, templateText: string, strategy: FollowUpStrategy) => Promise<void>;
  onSkip?: (outreachId: string) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const GhostBusterCard: React.FC<GhostBusterCardProps> = ({
  ghost,
  onSendGhostBuster,
  onSkip,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<GhostBusterTemplate | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const formatHours = (hours: number): string => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = Math.round(hours / 24);
      return `${days}d`;
    }
  };

  const getChannelIcon = (channel: string): keyof typeof Ionicons.glyphMap => {
    switch (channel.toLowerCase()) {
      case 'instagram':
        return 'logo-instagram';
      case 'facebook':
        return 'logo-facebook';
      case 'whatsapp':
        return 'logo-whatsapp';
      case 'linkedin':
        return 'logo-linkedin';
      default:
        return 'chatbubble';
    }
  };

  const handleSelectTemplate = (template: GhostBusterTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTemplate(template);
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);
    
    try {
      // Replace placeholders
      let messageText = selectedTemplate.template_text;
      messageText = messageText.replace('{name}', ghost.lead_name || '');
      
      await onSendGhostBuster(
        ghost.outreach_id,
        messageText,
        selectedTemplate.strategy,
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip?.(ghost.outreach_id);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.channelBadge}>
            <Ionicons
              name={getChannelIcon(ghost.channel)}
              size={14}
              color="#9CA3AF"
            />
          </View>
          <View>
            <Text style={styles.leadName}>{ghost.lead_name || 'Unbekannt'}</Text>
            <Text style={styles.ghostTime}>
              Ghost seit {formatHours(ghost.hours_ghosted)}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.moodBadge}>
            <Text style={styles.moodEmoji}>{MOOD_EMOJIS[ghost.behavior_mood]}</Text>
          </View>
          <View style={styles.decisionBadge}>
            <Text style={styles.decisionEmoji}>{DECISION_EMOJIS[ghost.behavior_decision]}</Text>
          </View>
        </View>
      </View>

      {/* Last Message */}
      <View style={styles.messagePreview}>
        <Text style={styles.messageLabel}>Letzte Nachricht:</Text>
        <Text style={styles.messageText} numberOfLines={2}>
          {ghost.last_message_text}
        </Text>
      </View>

      {/* Template Selection */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? 'Templates ausblenden' : 'Ghost-Buster Template wählen'}
        </Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#8B5CF6"
        />
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.templatesScroll}
          contentContainerStyle={styles.templatesContainer}
        >
          {ghost.suggested_templates.map((template, index) => (
            <TouchableOpacity
              key={template.id || index}
              style={[
                styles.templateCard,
                selectedTemplate?.id === template.id && styles.templateCardSelected,
              ]}
              onPress={() => handleSelectTemplate(template)}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateStrategy}>
                  {STRATEGY_LABELS[template.strategy]}
                </Text>
                {template.success_rate && (
                  <Text style={styles.templateSuccessRate}>
                    {template.success_rate.toFixed(0)}%
                  </Text>
                )}
              </View>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateText} numberOfLines={3}>
                {template.template_text_short || template.template_text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Selected Template Preview */}
      {selectedTemplate && (
        <View style={styles.selectedPreview}>
          <Text style={styles.selectedLabel}>Vorschau:</Text>
          <Text style={styles.selectedText}>
            {selectedTemplate.template_text.replace('{name}', ghost.lead_name || '')}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isSending}
          >
            <Text style={styles.skipButtonText}>Überspringen</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            !selectedTemplate && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!selectedTemplate || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#FFF" />
              <Text style={styles.sendButtonText}>Ghost-Buster senden</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  channelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  ghostTime: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  moodBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 14,
  },
  decisionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decisionEmoji: {
    fontSize: 14,
  },
  messagePreview: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  templatesScroll: {
    marginBottom: 12,
  },
  templatesContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  templateCard: {
    width: 200,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardSelected: {
    borderColor: '#8B5CF6',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  templateStrategy: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  templateSuccessRate: {
    fontSize: 10,
    color: '#22C55E',
    fontWeight: '600',
  },
  templateName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  templateText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  selectedPreview: {
    backgroundColor: '#8B5CF620',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B5CF640',
  },
  selectedLabel: {
    fontSize: 11,
    color: '#8B5CF6',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedText: {
    fontSize: 13,
    color: '#FFF',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
  },
  sendButtonDisabled: {
    backgroundColor: '#8B5CF650',
  },
  sendButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default GhostBusterCard;

