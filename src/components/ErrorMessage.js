/**
 * ErrorMessage Component
 * ========================
 * Zeigt Fehlermeldungen an
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from './theme';
import ActionButton from './ActionButton';

const ErrorMessage = ({
  title = 'Fehler',
  message = 'Ein Fehler ist aufgetreten.',
  icon = '⚠️',
  variant = 'inline',  // inline, card, fullscreen
  retry,               // { label: string, onPress: function }
  style,
}) => {
  if (variant === 'fullscreen') {
    return (
      <View style={[styles.fullscreen, style]}>
        <Text style={styles.iconLarge}>{icon}</Text>
        <Text style={styles.titleLarge}>{title}</Text>
        <Text style={styles.messageLarge}>{message}</Text>
        {retry && (
          <ActionButton
            title={retry.label || 'Erneut versuchen'}
            onPress={retry.onPress}
            variant="primary"
            style={styles.retryButton}
          />
        )}
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.cardContent}>
          <Text style={styles.iconCard}>{icon}</Text>
          <View style={styles.cardText}>
            <Text style={styles.titleCard}>{title}</Text>
            <Text style={styles.messageCard}>{message}</Text>
          </View>
        </View>
        {retry && (
          <ActionButton
            title={retry.label || 'Erneut versuchen'}
            onPress={retry.onPress}
            variant="outline"
            size="sm"
            style={styles.retryButtonCard}
          />
        )}
      </View>
    );
  }

  // Inline variant (default)
  return (
    <View style={[styles.inline, style]}>
      <Text style={styles.iconInline}>{icon}</Text>
      <Text style={styles.messageInline}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Fullscreen
  fullscreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  iconLarge: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  titleLarge: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  messageLarge: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    marginTop: SPACING.xl,
  },

  // Card
  card: {
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCard: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  cardText: {
    flex: 1,
  },
  titleCard: {
    ...TYPOGRAPHY.label,
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  messageCard: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
  },
  retryButtonCard: {
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
  },

  // Inline
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.md,
  },
  iconInline: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  messageInline: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    flex: 1,
  },
});

export default ErrorMessage;

