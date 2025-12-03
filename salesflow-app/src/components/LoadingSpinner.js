/**
 * LoadingSpinner Component
 * ==========================
 * Lade-Indikator für asynchrone Operationen
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from './theme';

const LoadingSpinner = ({
  message = 'Wird geladen...',
  size = 'large',    // small, large
  color = COLORS.primary,
  fullScreen = false,
  style,
}) => {
  const Container = fullScreen ? View : React.Fragment;
  const containerProps = fullScreen ? { style: [styles.fullScreen, style] } : {};

  return (
    <Container {...containerProps}>
      <View style={[styles.container, !fullScreen && style]}>
        <ActivityIndicator size={size} color={color} />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  message: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
});

export default LoadingSpinner;

