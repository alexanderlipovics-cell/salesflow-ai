/**
 * LeadCard Component
 * ====================
 * Zeigt einen einzelnen Lead in einer Liste an
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING } from './theme';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

const LeadCard = ({
  lead,
  onPress,
  onLongPress,
  showStatus = true,
  showPriority = true,
  showValue = true,
  style,
}) => {
  const {
    name,
    first_name,
    last_name,
    email,
    phone,
    company,
    status = 'new',
    priority = 'medium',
    estimated_value,
    personality_type,
    last_contact,
  } = lead;

  const displayName = name || `${first_name || ''} ${last_name || ''}`.trim() || 'Unbekannt';
  
  // Format last contact date
  const formatLastContact = () => {
    if (!last_contact) return null;
    const date = new Date(last_contact);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  // Format currency
  const formatValue = (value) => {
    if (!value) return null;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Avatar / Initials */}
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(displayName) }]}>
        <Text style={styles.avatarText}>
          {getInitials(displayName)}
        </Text>
        {personality_type && (
          <View style={styles.personalityBadge}>
            <Text style={styles.personalityText}>{personality_type}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {showPriority && <PriorityBadge priority={priority} size="sm" showIcon={false} />}
        </View>

        {company && (
          <Text style={styles.company} numberOfLines={1}>🏢 {company}</Text>
        )}

        <View style={styles.contactRow}>
          {email && <Text style={styles.contactText} numberOfLines={1}>📧 {email}</Text>}
          {phone && !email && <Text style={styles.contactText}>📞 {phone}</Text>}
        </View>

        <View style={styles.footer}>
          {showStatus && <StatusBadge status={status} size="sm" />}
          
          <View style={styles.footerRight}>
            {showValue && estimated_value && (
              <Text style={styles.value}>{formatValue(estimated_value)}</Text>
            )}
            {formatLastContact() && (
              <Text style={styles.lastContact}>{formatLastContact()}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
};

// Helper: Get initials from name
const getInitials = (name) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Helper: Get consistent color based on name
const getAvatarColor = (name) => {
  const colors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', 
    '#f59e0b', '#ef4444', '#ec4899', '#6366f1'
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  
  // Avatar
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  personalityBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    ...SHADOWS.sm,
  },
  personalityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  
  // Content
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  company: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  contactRow: {
    marginBottom: SPACING.sm,
  },
  contactText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  lastContact: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  
  // Chevron
  chevron: {
    fontSize: 24,
    color: COLORS.textLight,
    marginLeft: SPACING.sm,
  },
});

export default LeadCard;

