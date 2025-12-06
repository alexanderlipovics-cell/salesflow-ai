import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

export default function LeadDetailScreen() {
  const route = useRoute();
  // @ts-ignore
  const lead = route.params?.lead || {};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{lead.name || 'Lead Detail'}</Text>
        <Text style={styles.sub}>{lead.company || ''}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>E-Mail</Text>
          <Text style={styles.value}>{lead.email || '-'}</Text>
        </View>
        {lead.phone && (
          <View style={styles.card}>
            <Text style={styles.label}>Telefon</Text>
            <Text style={styles.value}>{lead.phone}</Text>
          </View>
        )}
        {lead.status && (
          <View style={styles.card}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{lead.status}</Text>
          </View>
        )}
        {lead.estimatedValue && (
          <View style={styles.card}>
            <Text style={styles.label}>Potenzial</Text>
            <Text style={styles.value}>{lead.estimatedValue}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.md },
  title: { ...TYPOGRAPHY.h1, color: COLORS.text },
  sub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  label: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  value: { ...TYPOGRAPHY.body, color: COLORS.text, marginTop: SPACING.xs },
});

