/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  DATENSCHUTZ SCREEN                                                        ║
 * ║  Datenschutzerklärung gemäß DSGVO                                         ║
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

export default function DatenschutzScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Datenschutzerklärung</Text>
        <Text style={styles.subtitle}>Gemäß DSGVO</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>1. Verantwortlicher</Text>
        </View>
        <Text style={styles.text}>
          Verantwortlich für die Datenverarbeitung ist:{'\n\n'}
          [Firmenname]{'\n'}
          [Adresse]{'\n'}
          [E-Mail]{'\n'}
          [Telefon]
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>2. Welche Daten werden erhoben?</Text>
        </View>
        <Text style={styles.text}>
          Wir erheben und verarbeiten folgende personenbezogene Daten:{'\n\n'}
          • Kontaktdaten (Name, E-Mail-Adresse, Telefonnummer){'\n'}
          • Nutzungsdaten (Login-Zeiten, genutzte Funktionen){'\n'}
          • Kommunikationsdaten (Nachrichten, E-Mails, Gespräche){'\n'}
          • Technische Daten (IP-Adresse, Browser-Typ, Geräteinformationen){'\n'}
          • Zahlungsdaten (über Stripe verarbeitet){'\n'}
          • Inhalte aus deiner Knowledge Base (PDFs, Dokumente)
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="target-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>3. Zweck der Datenverarbeitung</Text>
        </View>
        <Text style={styles.text}>
          Wir verarbeiten deine Daten zu folgenden Zwecken:{'\n\n'}
          • Bereitstellung und Verbesserung unserer Services{'\n'}
          • Verarbeitung von Anfragen und Support{'\n'}
          • Abrechnung und Vertragsabwicklung{'\n'}
          • Sicherstellung der Systemstabilität und Sicherheit{'\n'}
          • Einhaltung gesetzlicher Verpflichtungen{'\n'}
          • Personalisierung der KI-Antworten basierend auf deiner Knowledge Base
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="scale-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>4. Rechtsgrundlage (DSGVO)</Text>
        </View>
        <Text style={styles.text}>
          Die Verarbeitung erfolgt auf Grundlage folgender Rechtsgrundlagen:{'\n\n'}
          • Art. 6 Abs. 1 lit. b DSGVO: Erfüllung des Vertrags{'\n'}
          • Art. 6 Abs. 1 lit. a DSGVO: Einwilligung{'\n'}
          • Art. 6 Abs. 1 lit. f DSGVO: Berechtigtes Interesse{'\n'}
          • Art. 6 Abs. 1 lit. c DSGVO: Rechtliche Verpflichtung
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>5. Speicherdauer</Text>
        </View>
        <Text style={styles.text}>
          Wir speichern deine Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist:{'\n\n'}
          • Vertragsdaten: für die Dauer des Vertragsverhältnisses und darüber hinaus gemäß gesetzlichen Aufbewahrungsfristen{'\n'}
          • Nutzungsdaten: 12 Monate nach letzter Nutzung{'\n'}
          • Kommunikationsdaten: 3 Jahre nach letztem Kontakt{'\n'}
          • Zahlungsdaten: gemäß gesetzlichen Aufbewahrungsfristen (10 Jahre)
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="share-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>6. Weitergabe an Dritte</Text>
        </View>
        <Text style={styles.text}>
          Wir geben Daten an folgende Drittanbieter weiter:{'\n\n'}
          <Text style={styles.boldText}>Supabase (Datenbank & Storage):</Text>{'\n'}
          • Speicherung von Nutzerdaten und Dokumenten{'\n'}
          • Serverstandort: EU{'\n'}
          • Datenschutz: DSGVO-konform{'\n\n'}
          <Text style={styles.boldText}>Stripe (Zahlungsabwicklung):</Text>{'\n'}
          • Verarbeitung von Zahlungen{'\n'}
          • Serverstandort: EU/USA{'\n'}
          • Datenschutz: PCI-DSS zertifiziert{'\n\n'}
          <Text style={styles.boldText}>OpenAI (KI-Verarbeitung):</Text>{'\n'}
          • Verarbeitung von KI-Anfragen{'\n'}
          • Serverstandort: USA{'\n'}
          • Datenschutz: Standard Contractual Clauses (SCCs){'\n\n'}
          <Text style={styles.boldText}>Anthropic (KI-Verarbeitung):</Text>{'\n'}
          • Alternative KI-Verarbeitung{'\n'}
          • Serverstandort: USA{'\n'}
          • Datenschutz: Standard Contractual Clauses (SCCs)
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>7. Rechte der Nutzer</Text>
        </View>
        <Text style={styles.text}>
          Du hast folgende Rechte gemäß DSGVO:{'\n\n'}
          • Art. 15 DSGVO: Auskunftsrecht{'\n'}
          • Art. 16 DSGVO: Recht auf Berichtigung{'\n'}
          • Art. 17 DSGVO: Recht auf Löschung{'\n'}
          • Art. 18 DSGVO: Recht auf Einschränkung der Verarbeitung{'\n'}
          • Art. 20 DSGVO: Recht auf Datenübertragbarkeit{'\n'}
          • Art. 21 DSGVO: Widerspruchsrecht{'\n'}
          • Art. 7 Abs. 3 DSGVO: Widerruf der Einwilligung{'\n\n'}
          <Text style={styles.boldText}>Kontakt:</Text> [E-Mail-Adresse]
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cookie-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>8. Cookies</Text>
        </View>
        <Text style={styles.text}>
          Wir verwenden Cookies und ähnliche Technologien:{'\n\n'}
          • Notwendige Cookies: für die Funktionalität der Anwendung{'\n'}
          • Session-Cookies: zur Authentifizierung{'\n'}
          • Analytics-Cookies: zur Verbesserung der Services (optional){'\n\n'}
          Du kannst Cookies in deinen Browser-Einstellungen deaktivieren.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>9. Kontakt Datenschutzbeauftragter</Text>
        </View>
        <Text style={styles.text}>
          Bei Fragen zum Datenschutz kannst du dich wenden an:{'\n\n'}
          [Name des Datenschutzbeauftragten]{'\n'}
          [E-Mail-Adresse]{'\n'}
          [Telefon]{'\n\n'}
          <Text style={styles.mutedText}>
            (Falls kein externer Datenschutzbeauftragter bestellt ist, kann dieser Abschnitt entfernt werden)
          </Text>
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
  boldText: {
    fontWeight: '700',
    color: COLORS.textPrimary,
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

