/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AGB SCREEN                                                                 ║
 * ║  Allgemeine Geschäftsbedingungen                                           ║
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

export default function AGBScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Allgemeine Geschäftsbedingungen</Text>
        <Text style={styles.subtitle}>AGB für FELLO / AURA OS</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>1. Geltungsbereich</Text>
        </View>
        <Text style={styles.text}>
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen{'\n'}
          [Firmenname]{'\n'}
          [Adresse]{'\n\n'}
          und dem Nutzer (nachfolgend "Kunde") über die Nutzung der Software FELLO / AURA OS (nachfolgend "Software").
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="handshake-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>2. Vertragsschluss</Text>
        </View>
        <Text style={styles.text}>
          Der Vertrag kommt durch die Registrierung des Kunden und die Annahme dieser AGB zustande.{'\n\n'}
          Der Kunde erhält nach der Registrierung eine Bestätigungs-E-Mail. Mit der Registrierung erklärt der Kunde, dass er diese AGB akzeptiert.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="rocket-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>3. Leistungsbeschreibung</Text>
        </View>
        <Text style={styles.text}>
          FELLO / AURA OS ist eine cloud-basierte Software für:{'\n\n'}
          • KI-gestützte Vertriebsunterstützung{'\n'}
          • Automatisierte Kommunikation und Follow-ups{'\n'}
          • Knowledge Base Management{'\n'}
          • Compliance-Schutz und Einwandbehandlung{'\n'}
          • Team-Management und Analytics{'\n\n'}
          Der Umfang der Leistungen richtet sich nach dem gewählten Tarif (Solo, Team, Enterprise).
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>4. Preise und Zahlung</Text>
        </View>
        <Text style={styles.text}>
          <Text style={styles.boldText}>Preise:</Text>{'\n'}
          • Solo: 149€ / Monat (zzgl. MwSt.){'\n'}
          • Team: 990€ / Monat (zzgl. MwSt.){'\n'}
          • Enterprise: ab 2.400€ / Monat (zzgl. MwSt.){'\n\n'}
          <Text style={styles.boldText}>Zahlung:</Text>{'\n'}
          • Zahlung erfolgt monatlich im Voraus{'\n'}
          • Zahlungsmittel: Kreditkarte, SEPA-Lastschrift{'\n'}
          • Zahlungsabwicklung über Stripe{'\n\n'}
          <Text style={styles.boldText}>Preisänderungen:</Text>{'\n'}
          Preisänderungen werden dem Kunden mindestens 30 Tage vor Inkrafttreten mitgeteilt. Widerspricht der Kunde nicht innerhalb von 14 Tagen, gelten die neuen Preise als akzeptiert.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="return-down-back-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>5. Widerrufsrecht</Text>
        </View>
        <Text style={styles.text}>
          <Text style={styles.boldText}>14-tägiges Widerrufsrecht:</Text>{'\n\n'}
          Du hast das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.{'\n\n'}
          Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsschlusses.{'\n\n'}
          <Text style={styles.boldText}>Widerrufserklärung:</Text>{'\n'}
          Um dein Widerrufsrecht auszuüben, musst du uns ([E-Mail-Adresse]) mittels einer eindeutigen Erklärung (z.B. per E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren.{'\n\n'}
          <Text style={styles.boldText}>Folgen des Widerrufs:</Text>{'\n'}
          Bei einem Widerruf werden alle bereits geleisteten Zahlungen unverzüglich zurückerstattet.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="close-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>6. Kündigung</Text>
        </View>
        <Text style={styles.text}>
          <Text style={styles.boldText}>Kündigung durch den Kunden:</Text>{'\n'}
          • Monatliche Kündigung: Jederzeit zum Ende des laufenden Abrechnungszeitraums möglich{'\n'}
          • Kündigung per E-Mail an: [E-Mail-Adresse]{'\n\n'}
          <Text style={styles.boldText}>Kündigung durch uns:</Text>{'\n'}
          Wir können den Vertrag aus wichtigem Grund außerordentlich kündigen, insbesondere bei:{'\n'}
          • Verletzung dieser AGB{'\n'}
          • Zahlungsverzug von mehr als 30 Tagen{'\n'}
          • Missbrauch der Software{'\n\n'}
          <Text style={styles.boldText}>Folgen der Kündigung:</Text>{'\n'}
          Nach Kündigung wird der Zugang zur Software gesperrt. Bereits gezahlte Gebühren werden nicht anteilig erstattet.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>7. Haftung</Text>
        </View>
        <Text style={styles.text}>
          <Text style={styles.boldText}>Haftungsbeschränkung:</Text>{'\n\n'}
          Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach Maßgabe des Produkthaftungsgesetzes.{'\n\n'}
          Bei leichter Fahrlässigkeit haften wir nur bei Verletzung einer wesentlichen Vertragspflicht, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf (Kardinalpflicht).{'\n\n'}
          <Text style={styles.boldText}>Haftungsausschluss:</Text>{'\n'}
          Wir übernehmen keine Haftung für:{'\n'}
          • Verluste oder Schäden durch Nutzung der KI-generierten Inhalte{'\n'}
          • Fehlerhafte oder unvollständige Daten aus der Knowledge Base{'\n'}
          • Ausfälle oder Störungen der Software (außer bei Vorsatz oder grober Fahrlässigkeit){'\n\n'}
          <Text style={styles.boldText}>Haftungshöchstbetrag:</Text>{'\n'}
          Die Haftung ist auf die Höhe der im jeweiligen Vertragsjahr gezahlten Gebühren begrenzt.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>8. Schlussbestimmungen</Text>
        </View>
        <Text style={styles.text}>
          <Text style={styles.boldText}>Anwendbares Recht:</Text>{'\n'}
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.{'\n\n'}
          <Text style={styles.boldText}>Salvatorische Klausel:</Text>{'\n'}
          Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.{'\n\n'}
          <Text style={styles.boldText}>Änderungen der AGB:</Text>{'\n'}
          Wir behalten uns vor, diese AGB zu ändern. Änderungen werden dem Kunden per E-Mail mitgeteilt. Widerspricht der Kunde nicht innerhalb von 14 Tagen, gelten die Änderungen als akzeptiert.{'\n\n'}
          <Text style={styles.boldText}>Kontakt:</Text>{'\n'}
          Bei Fragen zu diesen AGB kannst du dich wenden an:{'\n'}
          [E-Mail-Adresse]{'\n'}
          [Telefon]
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

