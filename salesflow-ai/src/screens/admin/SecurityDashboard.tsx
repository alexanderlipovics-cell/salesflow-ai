/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SECURITY DASHBOARD                                                        ║
 * ║  Admin-Übersicht für Security-Events (Locked Block™)                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '../../services/apiConfig';

// =============================================================================
// TYPES
// =============================================================================

interface SecurityEvent {
  timestamp: string;
  event_type: 'jailbreak' | 'sensitive_query';
  severity: 'info' | 'warning' | 'critical';
  query_preview: string;
  matched_pattern?: string;
  category?: string;
  user_id?: string;
  session_id?: string;
}

interface SecurityStats {
  total_events: number;
  jailbreak_attempts: number;
  sensitive_queries: number;
  critical_events: number;
  last_event?: string;
}

// =============================================================================
// API
// =============================================================================

async function fetchSecurityLogs(limit: number = 50): Promise<{ logs: SecurityEvent[]; stats: SecurityStats }> {
  const response = await fetch(`${API_CONFIG.baseUrl}/live-assist/security/logs?limit=${limit}`, {
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add auth header
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch security logs');
  }
  
  return response.json();
}

// =============================================================================
// COMPONENTS
// =============================================================================

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: string; 
  color: string;
}) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const EventRow = ({ event }: { event: SecurityEvent }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#6B7280';
    }
  };
  
  const getEventIcon = (type: string) => {
    return type === 'jailbreak' ? 'skull-outline' : 'eye-outline';
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventSeverity, { backgroundColor: getSeverityColor(event.severity) }]} />
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Ionicons 
            name={getEventIcon(event.event_type) as any} 
            size={16} 
            color={getSeverityColor(event.severity)} 
          />
          <Text style={styles.eventType}>
            {event.event_type === 'jailbreak' ? '🔓 Jailbreak-Versuch' : '👁️ Sensible Anfrage'}
          </Text>
          <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
        </View>
        <Text style={styles.eventQuery} numberOfLines={2}>
          "{event.query_preview}"
        </Text>
        {event.category && (
          <View style={styles.eventCategory}>
            <Text style={styles.eventCategoryText}>Kategorie: {event.category}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SecurityDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['security-logs'],
    queryFn: () => fetchSecurityLogs(50),
    refetchInterval: 30000, // Auto-refresh alle 30 Sekunden
  });
  
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Lade Security-Daten...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Fehler beim Laden der Security-Daten</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const stats = data?.stats || {
    total_events: 0,
    jailbreak_attempts: 0,
    sensitive_queries: 0,
    critical_events: 0,
  };
  
  const logs = data?.logs || [];
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={28} color="#22C55E" />
        </View>
        <View>
          <Text style={styles.headerTitle}>🔒 Security Dashboard</Text>
          <Text style={styles.headerSubtitle}>Locked Block™ Überwachung</Text>
        </View>
      </View>
      
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard 
          title="Gesamt Events" 
          value={stats.total_events} 
          icon="analytics-outline"
          color="#3B82F6"
        />
        <StatCard 
          title="Jailbreak-Versuche" 
          value={stats.jailbreak_attempts} 
          icon="skull-outline"
          color="#EF4444"
        />
        <StatCard 
          title="Sensible Anfragen" 
          value={stats.sensitive_queries} 
          icon="eye-outline"
          color="#F59E0B"
        />
        <StatCard 
          title="Kritisch" 
          value={stats.critical_events} 
          icon="alert-circle-outline"
          color="#DC2626"
        />
      </View>
      
      {/* Status Banner */}
      <View style={[
        styles.statusBanner,
        stats.critical_events > 0 ? styles.statusBannerDanger : styles.statusBannerOk
      ]}>
        <Ionicons 
          name={stats.critical_events > 0 ? 'warning' : 'checkmark-circle'} 
          size={24} 
          color={stats.critical_events > 0 ? '#EF4444' : '#22C55E'} 
        />
        <Text style={[
          styles.statusBannerText,
          stats.critical_events > 0 ? styles.statusTextDanger : styles.statusTextOk
        ]}>
          {stats.critical_events > 0 
            ? `⚠️ ${stats.critical_events} kritische Events erfordern Aufmerksamkeit`
            : '✅ Keine kritischen Security-Events'
          }
        </Text>
      </View>
      
      {/* Events List */}
      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>📋 Letzte Events</Text>
        
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>Keine Security-Events</Text>
            <Text style={styles.emptyStateSubtext}>Das System ist sicher 🎉</Text>
          </View>
        ) : (
          logs.map((event, index) => (
            <EventRow key={index} event={event} />
          ))
        )}
      </View>
      
      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔄 Auto-Refresh: 30 Sekunden | 
          📊 Max. 100 Events im Speicher
        </Text>
        {stats.last_event && (
          <Text style={styles.footerText}>
            Letztes Event: {new Date(stats.last_event).toLocaleString('de-DE')}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    color: '#9CA3AF',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22C55E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  statusBannerOk: {
    backgroundColor: '#22C55E15',
    borderWidth: 1,
    borderColor: '#22C55E30',
  },
  statusBannerDanger: {
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  statusBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  statusTextOk: {
    color: '#22C55E',
  },
  statusTextDanger: {
    color: '#EF4444',
  },
  
  // Events Section
  eventsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  
  // Event Row
  eventRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  eventSeverity: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventType: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  eventTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventQuery: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  eventCategory: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#374151',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  eventCategoryText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  
  // Footer
  footer: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

