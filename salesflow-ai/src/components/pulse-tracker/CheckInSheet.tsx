/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CHECK-IN SHEET v2.1                                                       ║
 * ║  Bottom Sheet für "Was ist passiert?" Check-ins                            ║
 * ║                                                                            ║
 * ║  NEU v2.1:                                                                ║
 * ║  - Intent Badge anzeigen                                                  ║
 * ║  - Dynamic Check-in Zeit anzeigen                                        ║
 * ║  - Ghost Type Hinweis bei gesehen                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type { CheckInItem, MessageStatus, MessageIntent } from '../../types/pulseTracker';
import { INTENT_LABELS, INTENT_COLORS } from '../../types/pulseTracker';

// =============================================================================
// TYPES
// =============================================================================

interface CheckInSheetProps {
  visible: boolean;
  checkIns: CheckInItem[];
  currentIndex: number;
  onStatusUpdate: (outreachId: string, status: MessageStatus) => Promise<void>;
  onSkip: (outreachId: string) => void;
  onSkipAll: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

interface StatusButtonProps {
  status: MessageStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}

// =============================================================================
// STATUS BUTTON
// =============================================================================

const StatusButton: React.FC<StatusButtonProps> = ({
  label,
  icon,
  color,
  onPress,
  disabled,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.statusButton,
        { borderColor: `${color}40` },
        disabled && styles.statusButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={28} color={color} />
      <View style={styles.statusButtonTextContainer}>
        <Text style={styles.statusButtonLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CheckInSheet: React.FC<CheckInSheetProps> = ({
  visible,
  checkIns,
  currentIndex,
  onStatusUpdate,
  onSkip,
  onSkipAll,
  onDismiss,
  isLoading = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const checkIn = checkIns[currentIndex];

  if (!visible || !checkIn) return null;

  const handleSelect = async (status: MessageStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsUpdating(true);
    try {
      await onStatusUpdate(checkIn.outreach_id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip(checkIn.outreach_id);
  };

  const handleSkipAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSkipAll();
  };

  const formatHours = (hours: number): string => {
    if (hours < 24) {
      return `vor ${Math.round(hours)} Stunden`;
    } else {
      const days = Math.round(hours / 24);
      return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    }
  };

  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1:
        return '#EF4444'; // Red - Urgent
      case 2:
        return '#F59E0B'; // Orange - Important
      default:
        return '#6B7280'; // Gray - Normal
    }
  };

  const getPriorityLabel = (priority: number): string => {
    switch (priority) {
      case 1:
        return 'DRINGEND';
      case 2:
        return 'WICHTIG';
      default:
        return '';
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
      case 'telegram':
        return 'paper-plane';
      case 'email':
        return 'mail';
      default:
        return 'chatbubble';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Was ist passiert?</Text>
              <Text style={styles.counter}>
                {currentIndex + 1} von {checkIns.length}
              </Text>
            </View>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / checkIns.length) * 100}%` },
              ]}
            />
          </View>

          {/* Context */}
          <View style={styles.context}>
            <View style={styles.contextRow}>
              {checkIn.priority <= 2 && (
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: `${getPriorityColor(checkIn.priority)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: getPriorityColor(checkIn.priority) },
                    ]}
                  >
                    {getPriorityLabel(checkIn.priority)}
                  </Text>
                </View>
              )}
              
              {/* NEU v2.1: Intent Badge */}
              {(checkIn as any).intent && (
                <View
                  style={[
                    styles.intentBadge,
                    { backgroundColor: `${INTENT_COLORS[(checkIn as any).intent as MessageIntent] || '#6B7280'}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.intentText,
                      { color: INTENT_COLORS[(checkIn as any).intent as MessageIntent] || '#6B7280' },
                    ]}
                  >
                    {INTENT_LABELS[(checkIn as any).intent as MessageIntent] || (checkIn as any).intent}
                  </Text>
                </View>
              )}
              
              <View style={styles.channelBadge}>
                <Ionicons
                  name={getChannelIcon(checkIn.channel)}
                  size={14}
                  color="#9CA3AF"
                />
                <Text style={styles.channelText}>{checkIn.channel}</Text>
              </View>
            </View>

            <Text style={styles.leadName}>
              {checkIn.lead_name || 'Unbekannt'}
            </Text>
            <Text style={styles.timeText}>
              {formatHours(checkIn.hours_since_sent)} gesendet
              {/* NEU v2.1: Dynamic Check-in Info */}
              {(checkIn as any).check_in_hours_used && (
                <Text style={styles.dynamicTimingHint}>
                  {' '}(Check-in nach {(checkIn as any).check_in_hours_used}h)
                </Text>
              )}
            </Text>
          </View>

          {/* Message Preview */}
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>Deine Nachricht:</Text>
            <ScrollView style={styles.messageScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.messageText}>{checkIn.message_text}</Text>
            </ScrollView>
          </View>

          {/* Status Options */}
          <View style={styles.options}>
            <StatusButton
              status="replied"
              label="Antwort erhalten"
              icon="checkmark-circle"
              color="#22C55E"
              onPress={() => handleSelect('replied')}
              disabled={isUpdating}
            />

            <StatusButton
              status="seen"
              label="Gelesen, keine Antwort"
              icon="eye"
              color="#F59E0B"
              onPress={() => handleSelect('seen')}
              disabled={isUpdating}
            />

            <StatusButton
              status="invisible"
              label="Nicht gelesen"
              icon="eye-off"
              color="#6B7280"
              onPress={() => handleSelect('invisible')}
              disabled={isUpdating}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isUpdating}
            >
              <Ionicons name="play-forward" size={18} color="#9CA3AF" />
              <Text style={styles.skipButtonText}>Überspringen</Text>
            </TouchableOpacity>

            {checkIns.length > 1 && (
              <TouchableOpacity
                style={styles.skipAllButton}
                onPress={handleSkipAll}
                disabled={isUpdating}
              >
                <Ionicons name="layers" size={18} color="#9CA3AF" />
                <Text style={styles.skipAllButtonText}>Alle auf Ghosted</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Loading Overlay */}
          {isUpdating && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  counter: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#2C2C2E',
    borderRadius: 1.5,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 1.5,
  },
  context: {
    marginBottom: 12,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  channelText: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  leadName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  // NEU v2.1: Intent Badge Styles
  intentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  intentText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dynamicTimingHint: {
    fontSize: 11,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  messageBox: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    maxHeight: 120,
  },
  messageLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageScroll: {
    maxHeight: 80,
  },
  messageText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  options: {
    gap: 10,
    marginBottom: 16,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: 1,
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonTextContainer: {
    flex: 1,
  },
  statusButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  skipAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  skipAllButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
});

export default CheckInSheet;

