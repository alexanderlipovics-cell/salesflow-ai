/**
 * EmptyState Component
 * ======================
 * Zeigt einen leeren Zustand an (keine Daten vorhanden)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from './theme';
import ActionButton from './ActionButton';

const EmptyState = ({
  icon = '📭',
  title = 'Keine Daten',
  message = 'Es sind noch keine Einträge vorhanden.',
  action,          // { label: string, onPress: function }
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      {action && (
        <ActionButton
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          size="md"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    marginTop: SPACING.xl,
  },
});

export default EmptyState;

