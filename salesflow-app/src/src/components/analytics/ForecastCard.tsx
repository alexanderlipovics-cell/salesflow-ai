/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ANALYTICS - FORECAST CARD                                                  ║
 * ║  AI-basierte Prognose und Empfehlungen                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AURA_COLORS, AURA_SPACING, AURA_RADIUS, AURA_FONTS } from '../aura';

interface ForecastCardProps {
  current: number;
  goal: number;
  dailyAverage: number;
  dealsNeeded: number;
  targetDate?: string;
  recommendations?: string[];
  currency?: string;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({
  current,
  goal,
  dailyAverage,
  dealsNeeded,
  targetDate,
  recommendations = [],
  currency = '€',
}) => {
  // Berechne Ziel-Datum
  const getTargetDate = () => {
    if (targetDate) {
      return new Date(targetDate).toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    const remaining = goal - current;
    if (dailyAverage <= 0) {
      return 'Nicht erreichbar bei aktuellem Tempo';
    }

    const daysNeeded = Math.ceil(remaining / dailyAverage);
    const target = new Date();
    target.setDate(target.getDate() + daysNeeded);

    return target.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const weeklyDealsNeeded = Math.ceil(dealsNeeded / 4); // ~4 Wochen pro Monat

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prognose</Text>

      <View style={styles.forecastSection}>
        <View style={styles.forecastItem}>
          <Text style={styles.forecastLabel}>Ziel erreicht am</Text>
          <Text style={styles.forecastValue}>{getTargetDate()}</Text>
        </View>

        <View style={styles.forecastItem}>
          <Text style={styles.forecastLabel}>Benötigt pro Woche</Text>
          <Text style={[styles.forecastValue, { color: AURA_COLORS.neon.amber }]}>
            {weeklyDealsNeeded} Deals
          </Text>
        </View>
      </View>

      {recommendations.length > 0 && (
        <View style={styles.recommendationsSection}>
          <Text style={styles.recommendationsTitle}>💡 Empfehlungen</Text>
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationBullet}>•</Text>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.runRateSection}>
        <Text style={styles.runRateLabel}>Aktuelles Tempo</Text>
        <Text style={styles.runRateValue}>
          {currency}
          {dailyAverage.toLocaleString('de-DE', { maximumFractionDigits: 0 })} / Tag
        </Text>
        <Text style={styles.runRateSubtext}>
          Benötigt: {currency}
          {((goal - current) / 30).toLocaleString('de-DE', {
            maximumFractionDigits: 0,
          })}{' '}
          / Tag für 30k
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.lg,
    marginVertical: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  title: {
    ...AURA_FONTS.title,
    fontSize: 18,
    color: AURA_COLORS.text.primary,
    marginBottom: AURA_SPACING.md,
  },
  forecastSection: {
    flexDirection: 'row',
    gap: AURA_SPACING.md,
    marginBottom: AURA_SPACING.lg,
  },
  forecastItem: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  forecastLabel: {
    ...AURA_FONTS.caption,
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginBottom: AURA_SPACING.xs,
  },
  forecastValue: {
    ...AURA_FONTS.title,
    fontSize: 16,
    fontWeight: '700',
    color: AURA_COLORS.neon.green,
  },
  recommendationsSection: {
    marginTop: AURA_SPACING.md,
    padding: AURA_SPACING.md,
    backgroundColor: AURA_COLORS.neon.amberSubtle,
    borderRadius: AURA_RADIUS.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.neon.amber + '40',
  },
  recommendationsTitle: {
    ...AURA_FONTS.subtitle,
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: AURA_SPACING.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: AURA_SPACING.xs,
  },
  recommendationBullet: {
    ...AURA_FONTS.body,
    fontSize: 14,
    color: AURA_COLORS.neon.amber,
    marginRight: AURA_SPACING.xs,
  },
  recommendationText: {
    ...AURA_FONTS.body,
    fontSize: 13,
    color: AURA_COLORS.text.secondary,
    flex: 1,
  },
  runRateSection: {
    marginTop: AURA_SPACING.md,
    padding: AURA_SPACING.md,
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
  },
  runRateLabel: {
    ...AURA_FONTS.caption,
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginBottom: AURA_SPACING.xs,
  },
  runRateValue: {
    ...AURA_FONTS.title,
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.neon.cyan,
    marginBottom: AURA_SPACING.xs,
  },
  runRateSubtext: {
    ...AURA_FONTS.caption,
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
  },
});

