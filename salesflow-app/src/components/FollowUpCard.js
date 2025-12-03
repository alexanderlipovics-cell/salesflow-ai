/**
 * FollowUpCard Component
 * ========================
 * Zeigt ein einzelnes Follow-up/Task in einer Liste an
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING } from './theme';
import PriorityBadge from './PriorityBadge';
import ActionTypeBadge from './ActionTypeBadge';

const FollowUpCard = ({
  followUp,
  onPress,
  onToggleComplete,
  isOverdue = false,
  style,
}) => {
  const {
    id,
    lead_name,
    action = 'follow_up',
    description,
    due_date,
    priority = 'medium',
    completed = false,
  } = followUp;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    }
    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    }
    // Otherwise format
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return `${days[date.getDay()]}, ${date.getDate()}.${date.getMonth() + 1}.`;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        completed && styles.completedCard,
        isOverdue && !completed && styles.overdueCard,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
    >
      {/* Checkbox */}
      <Pressable
        style={[
          styles.checkbox,
          completed && styles.checkboxChecked,
        ]}
        onPress={() => onToggleComplete && onToggleComplete(id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.header}>
          <Text 
            style={[styles.leadName, completed && styles.completedText]}
            numberOfLines={1}
          >
            {lead_name || 'Allgemeine Aufgabe'}
          </Text>
          <PriorityBadge priority={priority} size="sm" />
        </View>

        {/* Action & Description */}
        <View style={styles.actionRow}>
          <ActionTypeBadge action={action} size="sm" showLabel={false} />
          <Text 
            style={[styles.description, completed && styles.completedText]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>

        {/* Date */}
        <Text style={[
          styles.dueDate,
          isOverdue && !completed && styles.overdueDateText,
        ]}>
          📅 {formatDate(due_date)}
          {isOverdue && !completed && ' (überfällig!)'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  pressed: {
    opacity: 0.9,
  },
  completedCard: {
    opacity: 0.6,
    backgroundColor: COLORS.borderLight,
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },

  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.md,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Content
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  dueDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  overdueDateText: {
    color: COLORS.error,
    fontWeight: '600',
  },
});

export default FollowUpCard;

