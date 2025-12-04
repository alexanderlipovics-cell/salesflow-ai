/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMMAND CENTER - REVENUE TRACKER                                          ║
 * ║  Progress Bar mit Run-Rate Berechnung                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS, AURA_SPACING, AURA_RADIUS, AURA_FONTS } from '../aura';

interface RevenueTrackerProps {
  current: number;
  goal: number;
  currency?: string;
}

export const RevenueTracker: React.FC<RevenueTrackerProps> = ({
  current,
  goal,
  currency = '€',
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.min((current / goal) * 100, 100);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percentage / 100,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const widthAnim = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${percentage}%`],
  });

  // Run-Rate Berechnung (vereinfacht: basierend auf aktuellem Monat)
  const getRunRateText = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = today.getDate();
    const dailyAverage = current / daysPassed;
    const remaining = goal - current;
    const daysNeeded = dailyAverage > 0 ? Math.ceil(remaining / dailyAverage) : 0;

    if (daysNeeded <= 0) {
      return 'Ziel bereits erreicht! 🎉';
    }
    if (daysNeeded > daysInMonth - daysPassed) {
      return `Bei aktuellem Tempo: Ziel in ${daysNeeded} Tagen`;
    }
    return `Bei aktuellem Tempo: Ziel in ${daysNeeded} Tagen`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>
          {currency}
          {current.toLocaleString('de-DE')}
        </Text>
        <Text style={styles.goal}>
          / {currency}
          {goal.toLocaleString('de-DE')}
        </Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View style={[styles.progressBarFill, { width: widthAnim }]}>
            <LinearGradient
              colors={[AURA_COLORS.neon.green, AURA_COLORS.neon.cyan]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressGradient}
            />
          </Animated.View>
        </View>
        <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
      </View>
      
      <Text style={styles.runRateText}>{getRunRateText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: AURA_SPACING.xl,
    paddingHorizontal: AURA_SPACING.lg,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: AURA_SPACING.lg,
  },
  amount: {
    ...AURA_FONTS.headline,
    fontSize: 36,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginRight: AURA_SPACING.sm,
  },
  goal: {
    ...AURA_FONTS.subtitle,
    fontSize: 20,
    color: AURA_COLORS.text.muted,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: AURA_SPACING.md,
  },
  progressBarBackground: {
    width: '100%',
    height: 24,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.full,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    overflow: 'hidden',
    marginBottom: AURA_SPACING.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: AURA_RADIUS.full,
  },
  progressGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  percentage: {
    ...AURA_FONTS.title,
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.neon.green,
    textAlign: 'center',
  },
  runRateText: {
    ...AURA_FONTS.body,
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
  },
});

