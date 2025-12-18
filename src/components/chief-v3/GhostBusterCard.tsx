/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  GhostBusterCard Component                                                 ║
 * ║  Karte für einen einzelnen Ghost mit Re-Engagement                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Clipboard,
} from 'react-native';
import type { Ghost, GhostDetail, ReEngageResponse } from '../../api/chiefV3';

// =============================================================================
// TYPES
// =============================================================================

interface GhostBusterCardProps {
  ghost: Ghost | GhostDetail;
  message?: ReEngageResponse | null;
  onGenerateMessage?: () => void;
  onSend?: (message: string) => void;
  onSkip?: (reason: string) => void;
  onBreakup?: () => void;
  onSnooze?: (days: number) => void;
  expanded?: boolean;
  loading?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GHOST_TYPE_CONFIG = {
  soft: {
    emoji: '👻',
    label: 'Soft Ghost',
    color: '#f59e0b',
    description: 'Wahrscheinlich nur busy - gute Chancen!',
  },
  hard: {
    emoji: '💀',
    label: 'Hard Ghost',
    color: '#ef4444',
    description: 'Braucht Pattern Interrupt',
  },
  deep: {
    emoji: '⚰️',
    label: 'Deep Ghost',
    color: '#6b7280',
    description: 'Letzter Versuch oder loslassen',
  },
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸',
  whatsapp: '💬',
  facebook: '📘',
  linkedin: '💼',
  tiktok: '🎵',
  email: '📧',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function GhostBusterCard({
  ghost,
  message,
  onGenerateMessage,
  onSend,
  onSkip,
  onBreakup,
  onSnooze,
  expanded = false,
  loading = false,
}: GhostBusterCardProps) {
  const [showMessage, setShowMessage] = useState(expanded);
  const [editedMessage, setEditedMessage] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [showActions, setShowActions] = useState(false);

  const config = GHOST_TYPE_CONFIG[ghost.ghost_type];
  const platformEmoji = PLATFORM_EMOJI[ghost.platform.toLowerCase()] || '📱';
  const isDetail = 'suggested_message' in ghost;

  // Handle Generate
  const handleGenerate = () => {
    setShowMessage(true);
    onGenerateMessage?.();
  };

  // Handle Send
  const handleSend = () => {
    const msgToSend = editedMessage || message?.message || (ghost as GhostDetail).suggested_message;
    if (msgToSend) {
      onSend?.(msgToSend);
    }
  };

  // Copy to Clipboard
  const handleCopy = () => {
    const msgToCopy = editedMessage || message?.message || (ghost as GhostDetail).suggested_message;
    if (msgToCopy) {
      Clipboard.setString(msgToCopy);
    }
  };

  // Format time
  const formatTime = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.ghostEmoji}>{config.emoji}</Text>
          <View>
            <Text style={styles.name}>{ghost.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.platform}>{platformEmoji} {ghost.platform}</Text>
              <Text style={styles.divider}>•</Text>
              <Text style={styles.time}>{formatTime(ghost.hours_since_seen)}</Text>
              {ghost.was_online_since && (
                <>
                  <Text style={styles.divider}>•</Text>
                  <Text style={styles.online}>🟢 War online</Text>
                </>
              )}
            </View>
          </View>
        </View>
        
        <View style={[styles.typeBadge, { backgroundColor: config.color }]}>
          <Text style={styles.typeBadgeText}>{config.label}</Text>
        </View>
      </View>

      {/* Type Description */}
      <Text style={styles.description}>{config.description}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{ghost.reengagement_attempts}</Text>
          <Text style={styles.statLabel}>Versuche</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(ghost.conversion_probability * 100)}%</Text>
          <Text style={styles.statLabel}>Chance</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{ghost.recommended_strategy}</Text>
          <Text style={styles.statLabel}>Strategie</Text>
        </View>
      </View>

      {/* Timing Hint */}
      <View style={styles.timingHint}>
        <Text style={styles.timingText}>⏰ {ghost.optimal_timing}</Text>
      </View>

      {/* Message Section */}
      {showMessage && (
        <View style={styles.messageSection}>
          {loading ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Generiere Nachricht...</Text>
            </View>
          ) : message ? (
            <>
              <View style={styles.messageHeader}>
                <Text style={styles.messageLabel}>
                  {message.is_final_attempt ? '⚠️ Letzter Versuch' : '💡 Vorschlag'}
                </Text>
                <Text style={styles.successProb}>
                  {Math.round(message.success_probability * 100)}% Erfolgswahrscheinlichkeit
                </Text>
              </View>
              
              <TextInput
                style={styles.messageInput}
                value={editedMessage || message.message}
                onChangeText={setEditedMessage}
                multiline
                placeholder="Nachricht bearbeiten..."
                placeholderTextColor="#6b7280"
              />

              {/* Alternatives */}
              {message.alternatives.length > 0 && (
                <ScrollView 
                  horizontal 
                  style={styles.alternatives}
                  showsHorizontalScrollIndicator={false}
                >
                  {message.alternatives.map((alt, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.altButton}
                      onPress={() => setEditedMessage(alt)}
                    >
                      <Text style={styles.altButtonText} numberOfLines={2}>
                        {alt.substring(0, 50)}...
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          ) : isDetail && (ghost as GhostDetail).suggested_message ? (
            <TextInput
              style={styles.messageInput}
              value={editedMessage || (ghost as GhostDetail).suggested_message}
              onChangeText={setEditedMessage}
              multiline
              placeholder="Nachricht bearbeiten..."
              placeholderTextColor="#6b7280"
            />
          ) : null}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!showMessage ? (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleGenerate}
          >
            <Text style={styles.primaryButtonText}>💬 Nachricht generieren</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleSend}
            >
              <Text style={styles.primaryButtonText}>✓ Gesendet markieren</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleCopy}
            >
              <Text style={styles.secondaryButtonText}>📋 Kopieren</Text>
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => setShowActions(!showActions)}
        >
          <Text style={styles.moreButtonText}>•••</Text>
        </TouchableOpacity>
      </View>

      {/* More Actions */}
      {showActions && (
        <View style={styles.moreActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onSnooze?.(3)}
          >
            <Text style={styles.actionButtonText}>⏸️ 3 Tage zurückstellen</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onSkip?.('Kein Interesse')}
          >
            <Text style={styles.actionButtonText}>⏭️ Überspringen</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.breakupButton]}
            onPress={onBreakup}
          >
            <Text style={styles.breakupButtonText}>💔 Breakup senden</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
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
  },
  ghostEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platform: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  divider: {
    fontSize: 12,
    color: '#4a4a5a',
    marginHorizontal: 6,
  },
  time: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  online: {
    fontSize: 12,
    color: '#10b981',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  description: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 11,
    color: '#a0a0a0',
    marginTop: 2,
  },
  timingHint: {
    backgroundColor: '#2d2d44',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  timingText: {
    fontSize: 13,
    color: '#f59e0b',
    textAlign: 'center',
  },
  messageSection: {
    marginBottom: 16,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#a0a0a0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  successProb: {
    fontSize: 11,
    color: '#10b981',
  },
  messageInput: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  alternatives: {
    marginTop: 12,
  },
  altButton: {
    backgroundColor: '#3d3d54',
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
    maxWidth: 150,
  },
  altButtonText: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#2d2d44',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  moreButton: {
    backgroundColor: '#2d2d44',
    padding: 12,
    borderRadius: 10,
    width: 44,
    alignItems: 'center',
  },
  moreButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  moreActions: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#2d2d44',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  breakupButton: {
    backgroundColor: '#3d1c1c',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  breakupButtonText: {
    color: '#ef4444',
  },
});

export default GhostBusterCard;

