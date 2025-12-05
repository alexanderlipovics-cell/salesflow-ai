/**
 * FloatingActionButton Component
 * ================================
 * Floating Action Button (FAB) für primäre Aktionen
 */

import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SHADOWS, SPACING } from './theme';

const FloatingActionButton = ({
  icon = '+',
  onPress,
  color = COLORS.primary,
  position = 'bottom-right',  // bottom-right, bottom-left, bottom-center
  size = 'md',               // sm, md, lg
  style,
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-left':
        return { left: 20, bottom: 90 };
      case 'bottom-center':
        return { alignSelf: 'center', bottom: 90 };
      default:
        return { right: 20, bottom: 90 };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { width: 48, height: 48, borderRadius: 24 };
      case 'lg':
        return { width: 64, height: 64, borderRadius: 32 };
      default:
        return { width: 56, height: 56, borderRadius: 28 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 24;
      case 'lg':
        return 36;
      default:
        return 32;
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        getSizeStyles(),
        getPositionStyles(),
        { backgroundColor: color },
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.icon, { fontSize: getIconSize() }]}>{icon}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  icon: {
    color: COLORS.textWhite,
    marginTop: -2, // Visual alignment
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});

export default FloatingActionButton;

