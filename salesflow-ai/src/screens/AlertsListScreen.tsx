/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ALERTS LIST SCREEN                                                        ║
 * ║  Vollständige Liste aller Alerts mit Filter und Sortierung                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_CONFIG } from '../services/apiConfig';
import { supabase } from '../services/supabase';
import { AlertItem, Alert } from '../components/dashboard/AlertItem';
import { AURA_COLORS, AURA_SHADOWS } from '../components/aura';

// =============================================================================
// TYPES
// =============================================================================

type AlertFilter = 'all' | 'churn_risk' | 'follow_up_overdue' | 'upgrade_opportunity' | 'inactive';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AlertsListScreen() {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AlertFilter>('all');

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Ohne Auth-Session verwende Demo-Daten
      if (!session?.access_token) {
        const demoAlerts: Alert[] = [
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
          {
            contact_id: '4',
            contact_name: 'Lisa Müller',
            alert_type: 'inactive',
            priority: 'medium',
            message: 'Kein Kontakt seit 30 Tagen',
            days_inactive: 30,
          },
          {
            contact_id: '5',
            contact_name: 'Peter Klein',
            alert_type: 'churn_risk',
            priority: 'high',
            message: 'Kein Kontakt seit 60 Tagen',
            days_inactive: 60,
          },
        ];
        setAlerts(demoAlerts);
        applyFilter(demoAlerts, activeFilter);
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
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
        
        // Sortiere nach Priorität (high > medium > low)
        const sortedAlerts = alertsList.sort((a: Alert, b: Alert) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        setAlerts(sortedAlerts);
        applyFilter(sortedAlerts, activeFilter);
      } else {
        setAlerts([]);
        applyFilter([], activeFilter);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
      applyFilter([], activeFilter);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [activeFilter]);

  // =============================================================================
  // FILTER & SORT
  // =============================================================================

  const applyFilter = (alertsList: Alert[], filter: AlertFilter) => {
    let filtered = alertsList;

    if (filter !== 'all') {
      filtered = alertsList.filter((alert) => alert.alert_type === filter);
    }

    // Sortiere nach Priorität
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    setFilteredAlerts(filtered);
  };

  const handleFilterChange = (filter: AlertFilter) => {
    setActiveFilter(filter);
    applyFilter(alerts, filter);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const onRefresh = () => {
    loadAlerts(true);
  };

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleAlertPress = (contactId: string) => {
    // Navigiere zu Leads Screen mit contact_id als Parameter
    navigation.navigate('Leads' as never, { contactId } as never);
  };

  // =============================================================================
  // FILTER TABS
  // =============================================================================

  const filterTabs: { key: AlertFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Alle', icon: '📋' },
    { key: 'churn_risk', label: 'Churn Risk', icon: '🔥' },
    { key: 'follow_up_overdue', label: 'Überfällig', icon: '⏰' },
    { key: 'upgrade_opportunity', label: 'Upgrade', icon: '🎯' },
    { key: 'inactive', label: 'Inaktiv', icon: '💤' },
  ];

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AURA_COLORS.neon.cyan} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Handlungsbedarf</Text>
          <Text style={styles.headerSubtitle}>
            {filteredAlerts.length} {filteredAlerts.length === 1 ? 'Alert' : 'Alerts'}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterTabs}
        contentContainerStyle={styles.filterTabsContent}
      >
        {filterTabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.filterTab,
              activeFilter === tab.key && styles.filterTabActive,
            ]}
            onPress={() => handleFilterChange(tab.key)}
          >
            <Text style={styles.filterTabIcon}>{tab.icon}</Text>
            <Text
              style={[
                styles.filterTabText,
                activeFilter === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Alerts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURA_COLORS.neon.cyan}
            colors={[AURA_COLORS.neon.cyan]}
          />
        }
      >
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyText}>Keine Alerts</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all'
                ? 'Alles im grünen Bereich!'
                : `Keine ${filterTabs.find((t) => t.key === activeFilter)?.label.toLowerCase()} Alerts`}
            </Text>
          </View>
        ) : (
          <View style={styles.alertsList}>
            {filteredAlerts.map((alert, index) => (
              <AlertItem
                key={`${alert.contact_id}-${index}`}
                alert={alert}
                onPress={handleAlertPress}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  backIcon: {
    fontSize: 20,
    color: AURA_COLORS.text.primary,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  filterTabs: {
    maxHeight: 60,
    backgroundColor: AURA_COLORS.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  filterTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    gap: 6,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
    borderColor: AURA_COLORS.neon.cyan,
  },
  filterTabIcon: {
    fontSize: 16,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: AURA_COLORS.text.secondary,
  },
  filterTabTextActive: {
    color: AURA_COLORS.neon.cyan,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  alertsList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
  },
});

