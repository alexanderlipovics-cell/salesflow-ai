/**
 * StatusBadge Component
 * =======================
 * Zeigt den Status eines Leads an
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_CONFIG, COLORS, RADIUS, SPACING } from './theme';

const StatusBadge = ({
  status = 'new',
  size = 'sm',      // sm, md, lg
  showIcon = true,
  style,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  
  return (
    <View style={[
      styles.container,
      styles[`size_${size}`],
      { backgroundColor: config.bg },
      style,
    ]}>
      {showIcon && <Text style={styles.icon}>{config.icon}</Text>}
      <Text style={[
        styles.text,
        styles[`text_${size}`],
        { color: config.color },
      ]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Sizes
  size_sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    gap: 4,
  },
  size_md: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: 6,
  },
  size_lg: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  
  // Icon
  icon: {
    fontSize: 12,
  },
  
  // Text
  text: {
    fontWeight: '600',
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 12,
  },
  text_lg: {
    fontSize: 14,
  },
});

export default StatusBadge;

