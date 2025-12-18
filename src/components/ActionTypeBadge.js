/**
 * ActionTypeBadge Component
 * ===========================
 * Zeigt den Aktionstyp eines Follow-ups an (call, email, meeting, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACTION_TYPE_CONFIG, COLORS, RADIUS, SPACING } from './theme';

const ActionTypeBadge = ({
  action = 'follow_up',
  size = 'sm',      // sm, md, lg
  showLabel = true,
  style,
}) => {
  const config = ACTION_TYPE_CONFIG[action] || ACTION_TYPE_CONFIG.follow_up;
  
  return (
    <View style={[
      styles.container,
      styles[`size_${size}`],
      { backgroundColor: `${config.color}15` }, // 15% opacity
      style,
    ]}>
      <Text style={[styles.icon, styles[`icon_${size}`]]}>{config.icon}</Text>
      {showLabel && (
        <Text style={[
          styles.text,
          styles[`text_${size}`],
          { color: config.color },
        ]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Sizes
  size_sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: 4,
  },
  size_md: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 6,
  },
  size_lg: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  
  // Icon
  icon: {},
  icon_sm: {
    fontSize: 12,
  },
  icon_md: {
    fontSize: 14,
  },
  icon_lg: {
    fontSize: 18,
  },
  
  // Text
  text: {
    fontWeight: '500',
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 13,
  },
  text_lg: {
    fontSize: 15,
  },
});

export default ActionTypeBadge;

