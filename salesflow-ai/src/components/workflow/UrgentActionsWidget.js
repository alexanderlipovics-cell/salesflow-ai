/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  URGENT ACTIONS WIDGET                                                     ║
 * ║  Zeigt dringende Actions prominent an                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useUrgentActions } from '../../hooks/useUnifiedActions';

// =============================================================================
// URGENT ACTIONS WIDGET
// =============================================================================

export function UrgentActionsWidget({ 
  onActionPress, 
  onViewAll,
  limit = 5,
  style,
}) {
  const { actions, isLoading, refresh, hasUrgent } = useUrgentActions(limit);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loading, style]}>
        <ActivityIndicator color="#F59E0B" />
      </View>
    );
  }

  if (!hasUrgent) {
    return (
      <View style={[styles.container, styles.empty, style]}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyText}>Keine dringenden Actions</Text>
        <Text style={styles.emptySubtext}>Alles im grünen Bereich!</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🔥</Text>
          <Text style={styles.headerTitle}>Dringend</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{actions.length}</Text>
          </View>
        </View>
        {onViewAll && (
          <Pressable onPress={onViewAll}>
            <Text style={styles.viewAllText}>Alle →</Text>
          </Pressable>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsList}>
        {actions.map((action, index) => (
          <UrgentActionCard
            key={action.id}
            action={action}
            onPress={() => onActionPress?.(action)}
            isFirst={index === 0}
            isLast={index === actions.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// =============================================================================
// URGENT ACTION CARD
// =============================================================================

function UrgentActionCard({ action, onPress, isFirst, isLast }) {
  const getIcon = (type) => {
    const icons = {
      check_payment: '💰',
      follow_up: '📱',
      call: '📞',
      reactivation: '🔄',
      close: '🎯',
    };
    return icons[type] || '📌';
  };

  const getUrgencyColor = () => {
    if (action.is_overdue) return '#EF4444'; // Rot
    if (action.action_type === 'check_payment') return '#F59E0B'; // Orange
    return '#F97316'; // Orange-Red
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        isFirst && styles.actionCardFirst,
        isLast && styles.actionCardLast,
        pressed && styles.actionCardPressed,
      ]}
    >
      {/* Urgency Indicator */}
      <View 
        style={[
          styles.urgencyIndicator, 
          { backgroundColor: getUrgencyColor() }
        ]} 
      />
      
      {/* Content */}
      <View style={styles.actionContent}>
        <View style={styles.actionRow}>
          <Text style={styles.actionIcon}>{getIcon(action.action_type)}</Text>
          <Text style={styles.actionTitle} numberOfLines={1}>
            {action.lead_name || 'Lead'}
          </Text>
          {action.is_overdue && (
            <View style={styles.overdueTag}>
              <Text style={styles.overdueText}>Überfällig</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.actionReason} numberOfLines={1}>
          {action.reason || action.title}
        </Text>
        
        {action.suggested_message && (
          <Text style={styles.suggestedMessage} numberOfLines={2}>
            💬 {action.suggested_message}
          </Text>
        )}
      </View>
      
      {/* Arrow */}
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

// =============================================================================
// PAYMENT CHECKS WIDGET (Spezial für Zahlungsprüfungen)
// =============================================================================

export function PaymentChecksWidget({ onActionPress, style }) {
  const { actions, isLoading, count, totalPendingAmount } = usePaymentChecks();

  if (isLoading) {
    return (
      <View style={[styles.paymentContainer, style]}>
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (count === 0) {
    return null; // Nicht anzeigen wenn keine
  }

  return (
    <View style={[styles.paymentContainer, style]}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentIcon}>💰</Text>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>
            {count} Zahlung{count !== 1 ? 'en' : ''} prüfen
          </Text>
          {totalPendingAmount > 0 && (
            <Text style={styles.paymentAmount}>
              ~ {totalPendingAmount.toLocaleString('de-DE')} € ausstehend
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.paymentActions}>
        {actions.slice(0, 3).map((action) => (
          <Pressable
            key={action.id}
            style={styles.paymentPill}
            onPress={() => onActionPress?.(action)}
          >
            <Text style={styles.paymentPillText}>
              {action.lead_name?.split(' ')[0] || 'Lead'}
            </Text>
          </Pressable>
        ))}
        {count > 3 && (
          <View style={styles.paymentMorePill}>
            <Text style={styles.paymentMoreText}>+{count - 3}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Importiere den Hook
import { usePaymentChecks } from '../../hooks/useUnifiedActions';

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loading: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  viewAllText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Actions List
  actionsList: {
    // Container für Actions
  },
  
  // Action Card
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionCardFirst: {
    // Spezielle Styles für erste Karte
  },
  actionCardLast: {
    borderBottomWidth: 0,
  },
  actionCardPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  
  urgencyIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
  },
  
  actionContent: {
    flex: 1,
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  overdueTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  actionReason: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  suggestedMessage: {
    color: '#60A5FA',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  
  arrow: {
    color: '#6B7280',
    fontSize: 24,
    marginLeft: 8,
  },
  
  // Payment Widget
  paymentContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentIcon: {
    fontSize: 28,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentAmount: {
    color: '#10B981',
    fontSize: 14,
    marginTop: 2,
  },
  paymentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentPillText: {
    color: '#fff',
    fontSize: 13,
  },
  paymentMorePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentMoreText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default UrgentActionsWidget;

