/**
 * ActionButton Component
 * ========================
 * Styled Button mit verschiedenen Varianten
 */

import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING, TYPOGRAPHY } from './theme';

const ActionButton = ({
  title,
  icon,
  onPress,
  variant = 'primary',  // primary, secondary, outline, ghost, danger
  size = 'md',          // sm, md, lg
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const isDisabled = disabled || loading;
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
        };
      case 'outline':
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
        };
      case 'ghost':
        return {
          container: styles.ghostContainer,
          text: styles.ghostText,
        };
      case 'danger':
        return {
          container: styles.dangerContainer,
          text: styles.dangerText,
        };
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        variantStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'danger' ? COLORS.textWhite : COLORS.primary} 
        />
      ) : (
        <>
          {icon && <Text style={[styles.icon, styles[`icon_${size}`]]}>{icon}</Text>}
          <Text style={[
            styles.text,
            styles[`text_${size}`],
            variantStyles.text,
          ]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
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
  
  // Primary
  primaryContainer: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  primaryText: {
    color: COLORS.textWhite,
  },
  
  // Secondary
  secondaryContainer: {
    backgroundColor: COLORS.secondary,
    ...SHADOWS.md,
  },
  secondaryText: {
    color: COLORS.textWhite,
  },
  
  // Outline
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  outlineText: {
    color: COLORS.primary,
  },
  
  // Ghost
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: COLORS.primary,
  },
  
  // Danger
  dangerContainer: {
    backgroundColor: COLORS.error,
    ...SHADOWS.md,
  },
  dangerText: {
    color: COLORS.textWhite,
  },
  
  // Text sizes
  text: {
    fontWeight: '600',
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  
  // Icon
  icon: {
    marginRight: SPACING.sm,
  },
  icon_sm: {
    fontSize: 14,
  },
  icon_md: {
    fontSize: 16,
  },
  icon_lg: {
    fontSize: 20,
  },
  
  // States
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default ActionButton;

