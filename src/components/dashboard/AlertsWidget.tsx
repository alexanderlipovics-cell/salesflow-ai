/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ALERTS WIDGET                                                             ║
 * ║  Kompakte Card für HomeScreen mit Top 3 dringendsten Alerts                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_CONFIG } from '../../services/apiConfig';
import { supabase } from '../../services/supabase';
import { AlertItem, Alert } from './AlertItem';
import { AURA_COLORS, AURA_SHADOWS } from '../aura';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface AlertsWidgetProps {
  limit?: number;
}

export function AlertsWidget({ limit = 3 }: AlertsWidgetProps) {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Ohne Auth-Session verwende Demo-Daten
      if (!session?.access_token) {
        setAlerts([
          {
            contact_id: '1',
            contact_name: 'Max Mustermann',
            alert_type: 'churn_risk',
            priority: 'high',
            message: 'Kein Kontakt seit 45 Tagen',
            days_inactive: 45,
          },
          {
            contact_id: '2',
            contact_name: 'Anna Schmidt',
            alert_type: 'follow_up_overdue',
            priority: 'medium',
            message: 'Follow-up 3 Tage überfällig',
          },
          {
            contact_id: '3',
            contact_name: 'Thomas Weber',
            alert_type: 'upgrade_opportunity',
            priority: 'low',
            message: 'Potenzial für Premium-Upgrade',
          },
        ]);
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const baseUrl = API_CONFIG.baseUrl.replace('/api/v1', '');
      const response = await fetch(`${baseUrl}/api/v2/alerts/team`, { headers });

      if (response.ok) {
        const data = await response.json();
        const alertsList = data.alerts || [];
        
        // Sortiere nach Priorität (high > medium > low) und nehme Top N
        const sortedAlerts = alertsList
          .sort((a: Alert, b: Alert) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          })
          .slice(0, limit);
        
        setAlerts(sortedAlerts);
      } else {
        // Fallback Demo-Daten
        setAlerts([]);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
      
      // Fade-in Animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [limit, fadeAnim]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleAlertPress = (contactId: string) => {
    // Navigiere zu Leads Screen mit contact_id als Parameter
    navigation.navigate('Leads' as never, { contactId } as never);
  };

  const handleViewAll = () => {
    navigation.navigate('AlertsList' as never);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={AURA_COLORS.neon.cyan} />
      </View>
    );
  }

  const hasAlerts = alerts.length > 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🔔</Text>
          <View>
            <Text style={styles.headerTitle}>Handlungsbedarf</Text>
            {hasAlerts && (
              <Text style={styles.headerSubtitle}>
                {alerts.length} {alerts.length === 1 ? 'Alert' : 'Alerts'}
              </Text>
            )}
          </View>
        </View>
        {hasAlerts && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAll}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>Alle anzeigen →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Alerts List */}
      {!hasAlerts ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text style={styles.emptyText}>Keine Alerts</Text>
          <Text style={styles.emptySubtext}>Alles im grünen Bereich!</Text>
        </View>
      ) : (
        <View style={styles.alertsList}>
          {alerts.map((alert, index) => (
            <View
              key={`${alert.contact_id}-${index}`}
              style={index < alerts.length - 1 && styles.alertDivider}
            >
              <AlertItem alert={alert} onPress={handleAlertPress} />
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: AURA_COLORS.neon.cyan,
  },
  alertsList: {
    gap: 0,
  },
  alertDivider: {
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: AURA_COLORS.text.secondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
  },
});

