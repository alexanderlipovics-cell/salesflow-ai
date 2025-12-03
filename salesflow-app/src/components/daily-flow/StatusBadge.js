/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - STATUS BADGE                                             ║
 * ║  Badge-Komponente für Daily Flow Status Anzeige                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_LEVEL_META } from '../../types/activity';

/**
 * Status Badge für Daily Flow
 * 
 * @param {Object} props
 * @param {string} props.statusLevel - Status Level (ahead, on_track, slightly_behind, behind)
 * @param {string} [props.size='medium'] - Größe (small, medium, large)
 * @param {boolean} [props.showLabel=true] - Label anzeigen
 * @param {boolean} [props.showEmoji=true] - Emoji anzeigen
 */
const StatusBadge = ({
  statusLevel,
  size = 'medium',
  showLabel = true,
  showEmoji = true,
}) => {
  const meta = STATUS_LEVEL_META[statusLevel] || STATUS_LEVEL_META.behind;
  
  const sizeStyles = {
    small: styles.badgeSmall,
    medium: styles.badgeMedium,
    large: styles.badgeLarge,
  };
  
  const textSizeStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  return (
    <View style={[styles.badge, sizeStyles[size], { backgroundColor: meta.bgColor }]}>
      {showEmoji && <Text style={styles.emoji}>{meta.emoji}</Text>}
      {showLabel && (
        <Text style={[styles.text, textSizeStyles[size], { color: meta.color }]}>
          {meta.label}
        </Text>
      )}
    </View>
  );
};

/**
 * Kompakte Status-Anzeige mit Dot
 */
export const StatusDot = ({ statusLevel, size = 8 }) => {
  const meta = STATUS_LEVEL_META[statusLevel] || STATUS_LEVEL_META.behind;
  
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: meta.color,
        },
      ]}
    />
  );
};

/**
 * Status-Anzeige mit Puls-Animation
 */
export const StatusPulse = ({ statusLevel, size = 12 }) => {
  const meta = STATUS_LEVEL_META[statusLevel] || STATUS_LEVEL_META.behind;
  
  return (
    <View style={[styles.pulseContainer, { width: size * 2, height: size * 2 }]}>
      <View
        style={[
          styles.pulseRing,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            borderColor: meta.color,
          },
        ]}
      />
      <View
        style={[
          styles.pulseDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: meta.color,
          },
        ]}
      />
    </View>
  );
};

/**
 * Status-Text mit Farbe
 */
export const StatusText = ({ statusLevel, style }) => {
  const meta = STATUS_LEVEL_META[statusLevel] || STATUS_LEVEL_META.behind;
  
  return (
    <Text style={[styles.statusText, { color: meta.color }, style]}>
      {meta.emoji} {meta.label}
    </Text>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Badge Styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  emoji: {
    fontSize: 12,
  },
  text: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
  textLarge: {
    fontSize: 14,
  },
  
  // Dot Styles
  dot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Pulse Styles
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.3,
  },
  pulseDot: {
    position: 'absolute',
  },
  
  // Status Text
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default StatusBadge;

