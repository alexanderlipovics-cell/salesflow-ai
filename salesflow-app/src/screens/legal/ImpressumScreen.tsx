/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  IMPRESSUM SCREEN                                                          ║
 * ║  Rechtliche Angaben gemäß TMG §5                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bgDark: '#0A0F1A',
  bgCard: '#111827',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  primary: '#22C55E',
};

export default function ImpressumScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Impressum</Text>
        <Text style={styles.subtitle}>Angaben gemäß § 5 TMG</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="business-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Firmenname</Text>
        </View>
        <Text style={styles.text}>
          [Alexander Lipovics / Firma]
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Adresse</Text>
        </View>
        <Text style={styles.text}>
          [Straße und Hausnummer]{'\n'}
          [Postleitzahl] [Ort]{'\n'}
          Deutschland
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>E-Mail</Text>
        </View>
        <Text style={styles.text}>
          [E-Mail-Adresse]
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="call-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Telefon</Text>
        </View>
        <Text style={styles.text}>
          [Telefonnummer]
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Umsatzsteuer-ID</Text>
        </View>
        <Text style={styles.text}>
          [USt-IdNr. falls vorhanden]{'\n'}
          <Text style={styles.mutedText}>
            (Falls keine USt-IdNr. vorhanden ist, kann dieser Abschnitt entfernt werden)
          </Text>
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Verantwortlich für den Inhalt</Text>
        </View>
        <Text style={styles.text}>
          [Name]{'\n'}
          [Adresse]{'\n'}
          [E-Mail]
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Haftungsausschluss</Text>
        </View>
        <Text style={styles.text}>
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Stand: {new Date().getFullYear()}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 42 : 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.textMuted + '20',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  text: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  mutedText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.textMuted + '20',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

