/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MENTOR - Message Bubble Component                                          ║
 * ║  Chat-Message-Bubble für User und MENTOR                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
  complianceWarning?: {
    has_violations: boolean;
    risk_score?: number;
    violation_count?: number;
    message?: string;
  } | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isUser,
  timestamp,
  complianceWarning,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.mentorContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.mentorBubble]}>
        {/* AI Badge für MENTOR */}
        {!isUser && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🤖 AI</Text>
          </View>
        )}

        {/* Compliance Warning Badge */}
        {complianceWarning && complianceWarning.has_violations && (
          <View style={[
            styles.complianceBadge,
            (complianceWarning.risk_score || 0) > 70 
              ? styles.complianceBadgeCritical 
              : styles.complianceBadgeWarning
          ]}>
            <Text style={styles.complianceBadgeText}>
              ⚠️ {complianceWarning.violation_count || 0} Compliance-Verstoß(e)
            </Text>
          </View>
        )}

        {/* Message Text */}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.mentorText]}>
          {message}
        </Text>

        {/* Timestamp */}
        {timestamp && (
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.mentorTimestamp]}>
            {formatTime(timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  mentorContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#3B82F6', // Primärfarbe blau
    borderBottomRightRadius: 4,
  },
  mentorBubble: {
    backgroundColor: '#F8FAFC', // Grau/Weiß
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiBadge: {
    position: 'absolute',
    top: -8,
    left: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  complianceBadge: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  complianceBadgeWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  complianceBadgeCritical: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  complianceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  mentorText: {
    color: '#1E293B',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  mentorTimestamp: {
    color: '#64748B',
    textAlign: 'left',
  },
});

