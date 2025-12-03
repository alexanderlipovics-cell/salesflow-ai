/**
 * PriorityBadge Component
 * =========================
 * Zeigt die Priorität eines Items an (low, medium, high, urgent)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PRIORITY_CONFIG, RADIUS, SPACING } from './theme';

const PriorityBadge = ({
  priority = 'medium',
  size = 'sm',      // sm, md, lg
  showIcon = true,
  style,
}) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  
  return (
    <View style={[
      styles.container,
      styles[`size_${size}`],
      { backgroundColor: config.bg },
      style,
    ]}>
      <Text style={[
        styles.text,
        styles[`text_${size}`],
        { color: config.color },
      ]}>
        {showIcon ? config.label : config.label.split(' ')[1]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  
  // Sizes
  size_sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  size_lg: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
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

export default PriorityBadge;

