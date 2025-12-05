/**
 * KpiCard Component
 * ===================
 * Zeigt eine einzelne KPI-Statistik an (z.B. für Dashboard)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from './theme';

const KpiCard = ({
  value,
  label,
  icon,
  trend,           // { value: number, direction: 'up' | 'down' }
  color,           // Akzentfarbe
  style,
  size = 'md',     // sm, md, lg
}) => {
  const accentColor = color || COLORS.primary;
  
  const renderTrend = () => {
    if (!trend) return null;
    
    const isUp = trend.direction === 'up';
    const trendColor = isUp ? COLORS.success : COLORS.error;
    const arrow = isUp ? '↑' : '↓';
    
    return (
      <View style={[styles.trendContainer, { backgroundColor: isUp ? COLORS.successBg : COLORS.errorBg }]}>
        <Text style={[styles.trendText, { color: trendColor }]}>
          {arrow} {Math.abs(trend.value)}%
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, styles[`size_${size}`], style]}>
      {icon && (
        <Text style={[styles.icon, styles[`icon_${size}`]]}>{icon}</Text>
      )}
      
      <Text style={[
        styles.value, 
        styles[`value_${size}`],
        color && { color: accentColor }
      ]}>
        {value}
      </Text>
      
      <Text style={[styles.label, styles[`label_${size}`]]}>
        {label}
      </Text>
      
      {renderTrend()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Sizes
  size_sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  size_md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  size_lg: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  
  // Icon
  icon: {
    marginBottom: SPACING.xs,
  },
  icon_sm: {
    fontSize: 20,
  },
  icon_md: {
    fontSize: 24,
  },
  icon_lg: {
    fontSize: 32,
  },
  
  // Value
  value: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  value_sm: {
    fontSize: 20,
  },
  value_md: {
    fontSize: 24,
  },
  value_lg: {
    fontSize: 32,
  },
  
  // Label
  label: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  label_sm: {
    fontSize: 10,
  },
  label_md: {
    fontSize: 12,
  },
  label_lg: {
    fontSize: 14,
  },
  
  // Trend
  trendContainer: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default KpiCard;

