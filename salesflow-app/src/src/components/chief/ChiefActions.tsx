/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CHIEF ACTIONS                                                              ║
 * ║  Extra Actions für CHIEF Mode (Founder Version)                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AURA_COLORS, AURA_SHADOWS, AURA_RADIUS, AURA_SPACING } from '../aura';

interface ChiefAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}

interface ChiefActionsProps {
  actions: ChiefAction[];
  onClose?: () => void;
}

export function ChiefActions({ actions, onClose }: ChiefActionsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👑 CHIEF Mode</Text>
        <Text style={styles.headerSubtitle}>Founder Power Features</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.actionsList} contentContainerStyle={styles.actionsContent}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={action.onPress}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>{action.icon}</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
            <View style={styles.actionArrow}>
              <Text style={styles.actionArrowText}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  header: {
    paddingHorizontal: AURA_SPACING.lg,
    paddingTop: 60,
    paddingBottom: AURA_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: AURA_SPACING.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AURA_COLORS.glass.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: AURA_COLORS.text.secondary,
    fontWeight: '600',
  },
  actionsList: {
    flex: 1,
  },
  actionsContent: {
    padding: AURA_SPACING.lg,
    paddingBottom: AURA_SPACING.xl,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.md,
    marginBottom: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.subtle,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: AURA_RADIUS.md,
    backgroundColor: AURA_COLORS.neon.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AURA_SPACING.md,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: AURA_COLORS.text.secondary,
    lineHeight: 18,
  },
  actionArrow: {
    marginLeft: AURA_SPACING.sm,
  },
  actionArrowText: {
    fontSize: 20,
    color: AURA_COLORS.neon.cyan,
  },
});

