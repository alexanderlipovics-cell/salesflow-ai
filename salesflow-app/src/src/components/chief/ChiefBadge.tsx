/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CHIEF BADGE                                                                ║
 * ║  Badge für CHIEF Mode (Founder Version)                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS, AURA_SHADOWS, AURA_RADIUS, AURA_SPACING } from '../aura';

interface ChiefBadgeProps {
  onPress?: () => void;
  compact?: boolean;
}

export function ChiefBadge({ onPress, compact = false }: ChiefBadgeProps) {
  const badgeContent = (
    <LinearGradient
      colors={[AURA_COLORS.neon.purple, AURA_COLORS.neon.blue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, compact && styles.badgeCompact]}
    >
      <Text style={styles.badgeIcon}>👑</Text>
      {!compact && <Text style={styles.badgeText}>CHIEF</Text>}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {badgeContent}
      </TouchableOpacity>
    );
  }

  return badgeContent;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AURA_SPACING.md,
    paddingVertical: AURA_SPACING.xs,
    borderRadius: AURA_RADIUS.full,
    ...AURA_SHADOWS.md,
  },
  badgeCompact: {
    paddingHorizontal: AURA_SPACING.sm,
    paddingVertical: 4,
  },
  badgeIcon: {
    fontSize: 16,
    marginRight: AURA_SPACING.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1,
  },
});

