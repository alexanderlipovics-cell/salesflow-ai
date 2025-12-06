import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

export default function AnalyticsScreen() {
  const metrics = [
    { label: 'Conversion Rate', value: '24%', helper: '+5% vs. letzte Woche' },
    { label: 'Pipeline', value: '€420k', helper: '+€50k vs. letzte Woche' },
    { label: 'Neue Leads (7d)', value: '18', helper: '+4 vs. Vorwoche' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Analytics</Text>
        <Text style={styles.sub}>Schneller Überblick über deine wichtigsten Kennzahlen.</Text>

        {metrics.map((m, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.label}>{m.label}</Text>
            <Text style={styles.value}>{m.value}</Text>
            <Text style={styles.helper}>{m.helper}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md },
  header: { ...TYPOGRAPHY.h1, color: COLORS.text },
  sub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  label: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  value: { ...TYPOGRAPHY.h2, color: COLORS.text, fontWeight: '700', marginTop: SPACING.xs },
  helper: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.xs },
});

