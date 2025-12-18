/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ALERT ITEM COMPONENT                                                      ║
 * ║  Einzelnes Alert-Element mit Icon, Badge und Navigation                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AURA_COLORS, AURA_SHADOWS } from '../aura';

// =============================================================================
// TYPES
// =============================================================================

export interface Alert {
  contact_id: string;
  contact_name: string;
  alert_type: 'churn_risk' | 'follow_up_overdue' | 'upgrade_opportunity' | 'inactive';
  priority: 'high' | 'medium' | 'low';
  message: string;
  days_inactive?: number;
}

interface AlertItemProps {
  alert: Alert;
  onPress: (contactId: string) => void;
}

// =============================================================================
// ALERT CONFIG
// =============================================================================

const ALERT_CONFIG = {
  churn_risk: {
    icon: '🔥',
    label: 'Churn Risk',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  follow_up_overdue: {
    icon: '⏰',
    label: 'Follow-up überfällig',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  upgrade_opportunity: {
    icon: '🎯',
    label: 'Upgrade Opportunity',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  inactive: {
    icon: '💤',
    label: 'Inaktiv',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
};

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#eab308',
};

// =============================================================================
// AVATAR HELPER
// =============================================================================

const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AlertItem({ alert, onPress }: AlertItemProps) {
  const config = ALERT_CONFIG[alert.alert_type];
  const priorityColor = PRIORITY_COLORS[alert.priority];

  const getUrgencyText = () => {
    if (alert.days_inactive !== undefined) {
      return `${alert.days_inactive} Tage`;
    }
    return 'Dringend';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: config.color }]}
      onPress={() => onPress(alert.contact_id)}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* Avatar & Icon */}
        <View style={styles.leftSection}>
          <View style={[styles.avatar, { backgroundColor: config.bgColor }]}>
            <Text style={styles.avatarText}>{getInitials(alert.contact_name)}</Text>
          </View>
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <Text style={styles.icon}>{config.icon}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.middleSection}>
          <Text style={styles.contactName} numberOfLines={1}>
            {alert.contact_name}
          </Text>
          <Text style={styles.alertLabel} numberOfLines={1}>
            {config.label}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {alert.message}
          </Text>
        </View>

        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: priorityColor + '20', borderColor: priorityColor + '40' }]}>
          <Text style={[styles.badgeText, { color: priorityColor }]}>
            {getUrgencyText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.subtle,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
  middleSection: {
    flex: 1,
    marginRight: 8,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: 2,
  },
  alertLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: AURA_COLORS.text.muted,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: AURA_COLORS.text.secondary,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

