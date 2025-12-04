/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ANALYTICS - REVENUE CHART                                                  ║
 * ║  Line Chart für Umsatz-Verlauf (letzte 30 Tage)                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { AURA_COLORS, AURA_SPACING, AURA_RADIUS, AURA_FONTS } from '../aura';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

interface RevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
  current: number;
  goal: number;
  currency?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  current,
  goal,
  currency = '€',
}) => {
  // Bereite Chart-Daten vor
  const chartData = {
    labels: data.slice(-7).map((d) => {
      const date = new Date(d.date);
      return `${date.getDate()}.${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: data.slice(-7).map((d) => d.revenue),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
        strokeWidth: 3,
      },
      {
        data: data.slice(-7).map(() => goal / 30), // Daily goal line
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, // Amber
        strokeWidth: 2,
        withDots: false,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: AURA_COLORS.glass.surface,
    backgroundGradientFrom: AURA_COLORS.glass.surface,
    backgroundGradientTo: AURA_COLORS.glass.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 211, 238, ${opacity})`,
    labelColor: () => AURA_COLORS.text.muted,
    style: { borderRadius: AURA_RADIUS.lg },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: AURA_COLORS.glass.border,
      strokeWidth: 1,
    },
  };

  const percentage = Math.min((current / goal) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Umsatz-Übersicht</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currency}
            {current.toLocaleString('de-DE')} / {currency}
            {goal.toLocaleString('de-DE')}
          </Text>
          <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={CHART_WIDTH}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix={currency}
          withInnerLines={true}
          withOuterLines={false}
        />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: AURA_COLORS.neon.green }]} />
          <Text style={styles.legendText}>Tatsächlicher Umsatz</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: AURA_COLORS.neon.amber }]} />
          <Text style={styles.legendText}>Tagesziel</Text>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AURA_SPACING.md,
  },
  title: {
    ...AURA_FONTS.title,
    fontSize: 18,
    color: AURA_COLORS.text.primary,
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    ...AURA_FONTS.subtitle,
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
  },
  percentage: {
    ...AURA_FONTS.headline,
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.neon.green,
    marginTop: AURA_SPACING.xs,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: AURA_SPACING.md,
  },
  chart: {
    borderRadius: AURA_RADIUS.lg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AURA_SPACING.lg,
    marginTop: AURA_SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AURA_SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...AURA_FONTS.caption,
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
});

