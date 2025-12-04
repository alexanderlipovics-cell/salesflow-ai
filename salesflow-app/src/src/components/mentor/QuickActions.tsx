/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MENTOR - Quick Actions Component                                          ║
 * ║  Vorgeschlagene Quick-Action Buttons (kontextabhängig)                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  context?: 'general' | 'contact' | 'both'; // In welchem Kontext soll die Action angezeigt werden
}

interface QuickActionsProps {
  onActionPress: (actionId: string) => void;
  contactId?: string | null; // Wenn gesetzt, werden kontakt-spezifische Actions angezeigt
}

// Alle verfügbaren Quick Actions
const ALL_QUICK_ACTIONS: QuickAction[] = [
  // Allgemeine Actions (immer verfügbar)
  {
    id: 'followup',
    label: 'Follow-up formulieren',
    icon: '📞',
    context: 'both',
  },
  {
    id: 'objection',
    label: 'Einwand behandeln',
    icon: '🛡️',
    context: 'both',
  },
  {
    id: 'compliance',
    label: 'Nachricht prüfen',
    icon: '✅',
    context: 'both',
  },
  {
    id: 'opener',
    label: 'Gesprächseinstieg',
    icon: '💬',
    context: 'both',
  },
  // Neue Actions
  {
    id: 'ghostbuster',
    label: 'Lead wecken',
    icon: '👻',
    context: 'contact', // Nur wenn Contact ausgewählt
  },
  {
    id: 'price_defense',
    label: 'Preis verteidigen',
    icon: '🥋',
    context: 'both',
  },
  {
    id: 'outreach',
    label: 'Outreach schreiben',
    icon: '📢',
    context: 'both',
  },
  {
    id: 'analyze_contact',
    label: 'Kontakt analysieren',
    icon: '🕵️',
    context: 'contact', // Nur wenn Contact ausgewählt
  },
  {
    id: 'linkedin_post',
    label: 'LinkedIn Post',
    icon: '📱',
    context: 'general', // Allgemein, nicht kontakt-spezifisch
  },
];

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionPress, contactId }) => {
  // Filtere Actions basierend auf Kontext
  const visibleActions = useMemo(() => {
    if (contactId) {
      // Wenn Contact ausgewählt: zeige 'both' und 'contact' Actions
      return ALL_QUICK_ACTIONS.filter(
        (action) => action.context === 'both' || action.context === 'contact'
      );
    } else {
      // Ohne Contact: zeige 'both' und 'general' Actions
      return ALL_QUICK_ACTIONS.filter(
        (action) => action.context === 'both' || action.context === 'general'
      );
    }
  }, [contactId]);

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleActions.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={() => onActionPress(action.id)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  actionButtonPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
});

