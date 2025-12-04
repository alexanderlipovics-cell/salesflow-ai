/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMMAND CENTER - GREETING HEADER                                          ║
 * ║  Zeitbasierte Begrüßung mit User-Name                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS, AURA_SPACING, AURA_FONTS } from '../aura';

interface GreetingHeaderProps {
  userName?: string;
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({ userName = 'Alexander' }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Guten Morgen';
    } else if (hour >= 12 && hour < 18) {
      return 'Guten Tag';
    } else {
      return 'Guten Abend';
    }
  };

  return (
    <LinearGradient
      colors={['#1e293b', '#0f172a', '#020617']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.greeting}>
        {getGreeting()}, {userName}! 👑
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: AURA_SPACING.xl,
    paddingHorizontal: AURA_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  greeting: {
    ...AURA_FONTS.headline,
    fontSize: 32,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    letterSpacing: -0.5,
  },
});

