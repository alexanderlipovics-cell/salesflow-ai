/**
 * SectionHeader Component
 * =========================
 * Abschnitts-Überschrift mit optionalem Icon und Count
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from './theme';

const SectionHeader = ({
  title,
  icon,
  count,
  countColor,
  action,          // { label: string, onPress: function }
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && (
          <View style={[
            styles.countBadge, 
            countColor && { backgroundColor: countColor }
          ]}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </View>
      
      {action && (
        <Pressable onPress={action.onPress} style={styles.actionButton}>
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
  },
  countBadge: {
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SectionHeader;

