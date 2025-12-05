import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const tools = [
  {
    id: 'objection',
    title: 'Einwandbehandlung',
    description: 'KI-gestützte Antworten auf Einwände',
    icon: 'shield-checkmark',
    color: COLORS.warning,
    screen: 'ObjectionHandler',
  },
  {
    id: 'followup',
    title: 'Follow-Up Generator',
    description: 'Automatische Nachfass-Nachrichten',
    icon: 'refresh',
    color: COLORS.secondary,
    screen: 'FollowUp',
  },
  {
    id: 'coldcall',
    title: 'Cold Call Script',
    description: 'Gesprächsleitfäden für Kaltakquise',
    icon: 'call',
    color: COLORS.primary,
    screen: 'ColdCall',
  },
  {
    id: 'closing',
    title: 'Closing Helper',
    description: 'Abschluss-Techniken und Formulierungen',
    icon: 'checkmark-done',
    color: COLORS.success,
    screen: 'Closing',
  },
  {
    id: 'autopilot',
    title: 'Autopilot',
    description: 'Automatisierte Vertriebsaktionen',
    icon: 'rocket',
    color: '#f97316',
    screen: 'Autopilot',
  },
];

export default function ToolsScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>Alle Werkzeuge für deinen Erfolg</Text>
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {tools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              onPress={() => navigation.navigate(tool.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: tool.color + '20' }]}>
                <Ionicons name={tool.icon as any} size={28} color={tool.color} />
              </View>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  grid: {
    gap: SPACING.md,
  },
  toolCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    position: 'relative',
    ...SHADOWS.small,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  arrowContainer: {
    position: 'absolute',
    right: SPACING.lg,
    top: '50%',
    marginTop: -10,
  },
});

