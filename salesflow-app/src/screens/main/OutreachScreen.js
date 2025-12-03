/**
 * Outreach Screen - Social Media Akquise Tracker
 * 
 * Hauptscreen für:
 * - Outreach-Übersicht
 * - Ghost-Tracking
 * - Follow-up Queue
 * - Statistiken
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { QuickLogWidget, GhostDashboard } from '../../components/outreach';
import {
  getStats,
  getPlatformStats,
  getOutreachList,
  PLATFORMS,
  STATUSES,
} from '../../services/outreachService';

const { width } = Dimensions.get('window');

export default function OutreachScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ghosts'); // ghosts | outreach | stats
  const [stats, setStats] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [recentOutreach, setRecentOutreach] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const loadData = useCallback(async () => {
    try {
      const [statsRes, platformRes, outreachRes] = await Promise.all([
        getStats(7, user?.access_token),
        getPlatformStats(30, user?.access_token),
        getOutreachList({ limit: 20 }, user?.access_token),
      ]);
      
      setStats(statsRes.stats);
      setPlatformStats(platformRes.platforms);
      setRecentOutreach(outreachRes.outreach || []);
    } catch (error) {
      console.error('OutreachScreen Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.access_token]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const handleNewLog = (outreach) => {
    setRecentOutreach(prev => [outreach, ...prev]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Outreach Tracker</Text>
        <Text style={styles.headerSubtitle}>
          Social Media Akquise im Blick
        </Text>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'ghosts' && styles.tabActive]}
          onPress={() => setActiveTab('ghosts')}
        >
          <Text style={[styles.tabText, activeTab === 'ghosts' && styles.tabTextActive]}>
            👻 Ghosts
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'outreach' && styles.tabActive]}
          onPress={() => setActiveTab('outreach')}
        >
          <Text style={[styles.tabText, activeTab === 'outreach' && styles.tabTextActive]}>
            📤 Gesendet
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            📊 Stats
          </Text>
        </Pressable>
      </View>
      
      {/* Content */}
      {activeTab === 'ghosts' ? (
        <GhostDashboard navigation={navigation} />
      ) : activeTab === 'outreach' ? (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Letzte Nachrichten</Text>
            
            {recentOutreach.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>Noch keine Nachrichten geloggt</Text>
                <Text style={styles.emptySubtext}>
                  Tippe auf + um deine erste Nachricht zu tracken
                </Text>
              </View>
            ) : (
              recentOutreach.map((item) => (
                <View key={item.id} style={styles.outreachCard}>
                  <View style={styles.outreachHeader}>
                    <Text style={styles.outreachPlatform}>
                      {PLATFORMS[item.platform]?.icon}
                    </Text>
                    <View style={styles.outreachInfo}>
                      <Text style={styles.outreachName}>{item.contact_name}</Text>
                      <Text style={styles.outreachHandle}>
                        {item.contact_handle || item.platform}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: STATUSES[item.status]?.color || '#6B7280' }
                    ]}>
                      <Text style={styles.statusText}>
                        {STATUSES[item.status]?.icon} {STATUSES[item.status]?.label}
                      </Text>
                    </View>
                  </View>
                  
                  {item.message_preview && (
                    <Text style={styles.messagePreview} numberOfLines={2}>
                      "{item.message_preview}"
                    </Text>
                  )}
                  
                  <Text style={styles.outreachTime}>
                    {new Date(item.sent_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              ))
            )}
          </View>
          
          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Stats Overview */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Letzte 7 Tage</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.totals?.sent || 0}</Text>
                  <Text style={styles.statLabel}>Gesendet</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.totals?.seen || 0}</Text>
                  <Text style={styles.statLabel}>Gesehen</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.totals?.replied || 0}</Text>
                  <Text style={styles.statLabel}>Antworten</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.totals?.positive || 0}</Text>
                  <Text style={styles.statLabel}>Interesse</Text>
                </View>
              </View>
              
              {/* Rates */}
              <View style={styles.ratesContainer}>
                <View style={styles.rateRow}>
                  <Text style={styles.rateLabel}>Seen-Rate</Text>
                  <View style={styles.rateBar}>
                    <View style={[styles.rateFill, { width: `${stats.rates?.seen_rate || 0}%` }]} />
                  </View>
                  <Text style={styles.rateValue}>{stats.rates?.seen_rate || 0}%</Text>
                </View>
                <View style={styles.rateRow}>
                  <Text style={styles.rateLabel}>Reply-Rate</Text>
                  <View style={styles.rateBar}>
                    <View style={[styles.rateFill, styles.rateFillGreen, { width: `${stats.rates?.reply_rate || 0}%` }]} />
                  </View>
                  <Text style={styles.rateValue}>{stats.rates?.reply_rate || 0}%</Text>
                </View>
                <View style={styles.rateRow}>
                  <Text style={styles.rateLabel}>Ghost-Rate</Text>
                  <View style={styles.rateBar}>
                    <View style={[styles.rateFill, styles.rateFillOrange, { width: `${stats.rates?.ghost_rate || 0}%` }]} />
                  </View>
                  <Text style={styles.rateValue}>{stats.rates?.ghost_rate || 0}%</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Platform Breakdown */}
          {platformStats && Object.keys(platformStats).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nach Plattform (30 Tage)</Text>
              
              {Object.entries(platformStats).map(([platform, data]) => (
                <View key={platform} style={styles.platformRow}>
                  <View style={styles.platformInfo}>
                    <Text style={styles.platformIcon}>{PLATFORMS[platform]?.icon}</Text>
                    <Text style={styles.platformName}>{PLATFORMS[platform]?.label}</Text>
                  </View>
                  <View style={styles.platformStats}>
                    <Text style={styles.platformStat}>{data.total} gesendet</Text>
                    <Text style={[styles.platformRate, { color: '#10b981' }]}>
                      {data.reply_rate}% Antwort
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          <View style={{ height: 120 }} />
        </ScrollView>
      )}
      
      {/* Floating Quick-Log Button */}
      <QuickLogWidget onLog={handleNewLog} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  
  // Header
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  
  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  
  scrollView: {
    flex: 1,
  },
  
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Outreach Card
  outreachCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  outreachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  outreachPlatform: {
    fontSize: 24,
  },
  outreachInfo: {
    flex: 1,
  },
  outreachName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  outreachHandle: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  messagePreview: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 10,
  },
  outreachTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  
  ratesContainer: {
    marginTop: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateLabel: {
    width: 80,
    fontSize: 13,
    color: '#94a3b8',
  },
  rateBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  rateFillGreen: {
    backgroundColor: '#10b981',
  },
  rateFillOrange: {
    backgroundColor: '#f97316',
  },
  rateValue: {
    width: 45,
    fontSize: 13,
    color: '#f8fafc',
    textAlign: 'right',
  },
  
  // Platform Stats
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  platformIcon: {
    fontSize: 22,
  },
  platformName: {
    fontSize: 15,
    color: '#f8fafc',
  },
  platformStats: {
    alignItems: 'flex-end',
  },
  platformStat: {
    fontSize: 13,
    color: '#94a3b8',
  },
  platformRate: {
    fontSize: 13,
    fontWeight: '600',
  },
});

