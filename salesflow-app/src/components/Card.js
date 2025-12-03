/**
 * Card Component
 * ================
 * Wiederverwendbare Karten-Komponente mit verschiedenen Varianten
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING } from './theme';

const Card = ({ 
  children, 
  style, 
  variant = 'default',  // default, elevated, outlined, flat
  padding = 'md',        // none, sm, md, lg
  onPress,
  disabled = false,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[`padding_${padding}`],
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <Pressable 
        style={({ pressed }) => [
          ...cardStyle,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
  },
  
  // Variants
  default: {
    ...SHADOWS.md,
  },
  elevated: {
    ...SHADOWS.lg,
  },
  outlined: {
    ...SHADOWS.none,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flat: {
    ...SHADOWS.none,
  },
  
  // Padding
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: SPACING.sm,
  },
  padding_md: {
    padding: SPACING.lg,
  },
  padding_lg: {
    padding: SPACING.xl,
  },
  
  // States
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Card;

