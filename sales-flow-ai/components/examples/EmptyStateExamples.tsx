/**
 * Beispiele für verschiedene Empty State Verwendungen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import EmptyState from '../EmptyState';

// Beispiel 1: Keine Leads
export function NoLeadsEmptyState({ navigation }: any) {
  return (
    <EmptyState
      icon="Users"
      title="Noch keine Leads"
      description="Füge deinen ersten Lead hinzu und starte deine Sales-Pipeline mit KI-Unterstützung."
      actionText="Lead hinzufügen"
      onAction={() => navigation.navigate('LeadForm')}
    />
  );
}

// Beispiel 2: Keine Follow-ups
export function NoFollowupsEmptyState({ navigation }: any) {
  return (
    <EmptyState
      icon="Calendar"
      title="Keine Follow-ups geplant"
      description="Die KI wird dir automatisch Follow-ups vorschlagen, sobald du Leads hinzufügst."
      actionText="Ersten Lead hinzufügen"
      onAction={() => navigation.navigate('LeadForm')}
    />
  );
}

// Beispiel 3: Kein Team
export function NoSquadEmptyState({ navigation }: any) {
  return (
    <EmptyState
      icon="UserPlus"
      title="Dein Team wartet"
      description="Lade Teammitglieder ein und baut gemeinsam eure Sales-Pipeline auf."
      actionText="Teammitglieder einladen"
      onAction={() => navigation.navigate('InviteTeam')}
    />
  );
}

// Beispiel 4: Keine Nachrichten
export function NoMessagesEmptyState({ navigation }: any) {
  return (
    <EmptyState
      icon="MessageCircle"
      title="Keine Chat-Historie"
      description="Starte einen Chat mit der KI, um Lead-Daten zu erfassen und Empfehlungen zu erhalten."
      actionText="Chat starten"
      onAction={() => navigation.navigate('IntelligentChat')}
    />
  );
}

// Beispiel 5: Keine Dokumente
export function NoDocumentsEmptyState({ onUpload }: any) {
  return (
    <EmptyState
      icon="FileText"
      title="Keine Dokumente hochgeladen"
      description="Lade Dokumente hoch, damit die KI sie für deine Company Knowledge nutzen kann."
      actionText="Dokument hochladen"
      onAction={onUpload}
    />
  );
}

// Beispiel 6: Keine Search Results
export function NoSearchResultsEmptyState({ onReset }: any) {
  return (
    <EmptyState
      icon="Search"
      title="Keine Ergebnisse"
      description="Versuche es mit anderen Suchbegriffen oder filtere weniger strikt."
      actionText="Suche zurücksetzen"
      onAction={onReset}
    />
  );
}

// Beispiel 7: Keine Analytics Daten
export function NoAnalyticsEmptyState() {
  return (
    <EmptyState
      icon="BarChart3"
      title="Noch keine Analytics"
      description="Deine Performance-Daten werden hier angezeigt, sobald du erste Aktivitäten hast."
      actionText="Dashboard erkunden"
      onAction={() => {}}
    />
  );
}

// Container für Beispiele-Demo
export function EmptyStateDemo({ navigation }: any) {
  return (
    <View style={styles.container}>
      {/* Hier kannst du verschiedene Empty States testen */}
      <NoLeadsEmptyState navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

