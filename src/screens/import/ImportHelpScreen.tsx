/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  IMPORT HELP SCREEN                                                         ║
 * ║  Hilfe-Seite mit Anleitungen für MLM CSV Export                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  AURA_COLORS,
  AURA_SHADOWS,
  GlassCard,
} from '../../components/aura';

interface ImportHelpScreenProps {
  navigation: any;
}

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

export default function ImportHelpScreen({ navigation }: ImportHelpScreenProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HELP SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const helpSections: HelpSection[] = [
    {
      id: 'doterra',
      title: 'doTERRA Virtual Office',
      icon: '🌿',
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.stepTitle}>Schritt 1: Virtual Office öffnen</Text>
          <Text style={styles.stepText}>
            Melde dich in deinem doTERRA Virtual Office an.
          </Text>
          
          <Text style={styles.stepTitle}>Schritt 2: Team-Report aufrufen</Text>
          <Text style={styles.stepText}>
            Navigiere zu "Reports" → "Team Report" oder "Organization Report".
          </Text>
          
          <Text style={styles.stepTitle}>Schritt 3: CSV Export</Text>
          <Text style={styles.stepText}>
            Klicke auf "Export" oder "Download CSV". Die Datei enthält:
          </Text>
          <View style={styles.fieldList}>
            <Text style={styles.fieldItem}>• Member ID</Text>
            <Text style={styles.fieldItem}>• Vorname, Nachname</Text>
            <Text style={styles.fieldItem}>• Email, Telefon</Text>
            <Text style={styles.fieldItem}>• Rank (Rang)</Text>
            <Text style={styles.fieldItem}>• PV, OV, PGV, TV</Text>
            <Text style={styles.fieldItem}>• Legs, LRP Status</Text>
          </View>
          
          <Text style={styles.tipText}>
            💡 Tipp: Exportiere regelmäßig, um deine Kontakte aktuell zu halten.
          </Text>
        </View>
      ),
    },
    {
      id: 'herbalife',
      title: 'Herbalife MyHerbalife',
      icon: '🥤',
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.stepTitle}>Schritt 1: MyHerbalife Portal öffnen</Text>
          <Text style={styles.stepText}>
            Melde dich in deinem MyHerbalife Portal an.
          </Text>
          
          <Text style={styles.stepTitle}>Schritt 2: Team-Übersicht aufrufen</Text>
          <Text style={styles.stepText}>
            Gehe zu "My Team" oder "Organization View".
          </Text>
          
          <Text style={styles.stepTitle}>Schritt 3: CSV Export</Text>
          <Text style={styles.stepText}>
            Klicke auf "Export" oder "Download". Die Datei enthält:
          </Text>
          <View style={styles.fieldList}>
            <Text style={styles.fieldItem}>• Distributor ID</Text>
            <Text style={styles.fieldItem}>• Name</Text>
            <Text style={styles.fieldItem}>• Email, Telefon</Text>
            <Text style={styles.fieldItem}>• Level (Rang)</Text>
            <Text style={styles.fieldItem}>• VP, PPV, TV</Text>
            <Text style={styles.fieldItem}>• RO, Retail Customers</Text>
          </View>
          
          <Text style={styles.tipText}>
            💡 Tipp: Stelle sicher, dass alle Spalten im Export enthalten sind.
          </Text>
        </View>
      ),
    },
    {
      id: 'generic',
      title: 'Standard CSV / Andere MLMs',
      icon: '📊',
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.stepTitle}>Allgemeine CSV Tipps</Text>
          
          <Text style={styles.stepText}>
            <Text style={styles.bold}>1. Spalten-Format:</Text>
            {'\n'}
            Stelle sicher, dass deine CSV-Datei folgende Spalten enthält:
          </Text>
          <View style={styles.fieldList}>
            <Text style={styles.fieldItem}>• Name oder Vorname/Nachname</Text>
            <Text style={styles.fieldItem}>• Email (wichtig für Duplikat-Erkennung)</Text>
            <Text style={styles.fieldItem}>• Telefon (optional, aber empfohlen)</Text>
            <Text style={styles.fieldItem}>• ID (MLM-spezifische ID)</Text>
            <Text style={styles.fieldItem}>• Rang/Level (optional)</Text>
          </View>
          
          <Text style={styles.stepText}>
            <Text style={styles.bold}>2. Datei-Format:</Text>
            {'\n'}
            • CSV-Datei mit Komma (,) oder Semikolon (;) als Trennzeichen
            {'\n'}
            • UTF-8 Kodierung (für Umlaute)
            {'\n'}
            • Erste Zeile sollte Spaltenüberschriften enthalten
          </Text>
          
          <Text style={styles.stepText}>
            <Text style={styles.bold}>3. Daten-Qualität:</Text>
            {'\n'}
            • Leere Zeilen werden automatisch übersprungen
            {'\n'}
            • Duplikate werden erkannt (basierend auf Email oder Telefon)
            {'\n'}
            • Fehlerhafte Zeilen werden im Import-Report angezeigt
          </Text>
          
          <Text style={styles.tipText}>
            💡 Tipp: Teste zuerst mit einer kleinen Datei (5-10 Kontakte).
          </Text>
        </View>
      ),
    },
    {
      id: 'zinzino',
      title: 'Zinzino',
      icon: '🧬',
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.stepTitle}>Zinzino Export</Text>
          <Text style={styles.stepText}>
            Exportiere deine Partner-Liste aus dem Zinzino Backoffice.
          </Text>
          <View style={styles.fieldList}>
            <Text style={styles.fieldItem}>• Partner ID</Text>
            <Text style={styles.fieldItem}>• Vorname, Nachname</Text>
            <Text style={styles.fieldItem}>• Email, Telefon</Text>
            <Text style={styles.fieldItem}>• Rang, Credits, Team Credits</Text>
            <Text style={styles.fieldItem}>• PCP, Sponsor ID</Text>
            <Text style={styles.fieldItem}>• Z4F Status, ECB Status</Text>
          </View>
        </View>
      ),
    },
    {
      id: 'pm-international',
      title: 'PM-International (FitLine)',
      icon: '💊',
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.stepTitle}>PM-International Export</Text>
          <Text style={styles.stepText}>
            Exportiere deine Partner-Liste aus dem PM Backoffice.
          </Text>
          <View style={styles.fieldList}>
            <Text style={styles.fieldItem}>• Partner-Nr</Text>
            <Text style={styles.fieldItem}>• Vorname, Nachname</Text>
            <Text style={styles.fieldItem}>• Email, Telefon</Text>
            <Text style={styles.fieldItem}>• Rang, Punkte, GV</Text>
            <Text style={styles.fieldItem}>• Erstlinie, Sponsor</Text>
            <Text style={styles.fieldItem}>• Autoship Status</Text>
          </View>
        </View>
      ),
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>❓ Hilfe: Kontakte exportieren</Text>
        <Text style={styles.subtitle}>
          Anleitungen für den Export deiner MLM-Kontakte
        </Text>
      </View>

      {/* Help Sections Accordion */}
      {helpSections.map((section) => {
        const isExpanded = expandedSection === section.id;
        return (
          <GlassCard key={section.id} style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.expandIcon}>
                {isExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            
            {isExpanded && (
              <View style={styles.sectionBody}>
                {section.content}
              </View>
            )}
          </GlassCard>
        );
      })}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Zurück</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    flex: 1,
  },
  expandIcon: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
  },
  sectionBody: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: AURA_COLORS.glass.border,
  },
  sectionContent: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginTop: 8,
  },
  stepText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    lineHeight: 20,
    marginTop: 4,
  },
  bold: {
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  fieldList: {
    marginTop: 8,
    marginLeft: 8,
    gap: 4,
  },
  fieldItem: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    lineHeight: 20,
  },
  tipText: {
    fontSize: 14,
    color: AURA_COLORS.accent.primary,
    fontStyle: 'italic',
    marginTop: 12,
    padding: 12,
    backgroundColor: AURA_COLORS.surface.secondary,
    borderRadius: 8,
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: AURA_COLORS.accent.primary,
    fontWeight: '600',
  },
});

