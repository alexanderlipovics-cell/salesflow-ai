import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import NewLeadModal from './NewLeadModal';

interface DashboardScreenProps {
  onLogout: () => void;
}

interface Lead {
  id: string;
  name: string;
  status: string;
  temperature: string;
  platform: string;
  bant_score: number;
}

export default function DashboardScreen({ onLogout }: DashboardScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, leadsRes, followupsRes] = await Promise.all([
        api.getMe(),
        api.getLeads(),
        api.getTodayFollowups(),
      ]);
      setUser(userRes);
      setLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setFollowups(followupsRes.today || []);
    } catch (error) {
      console.log('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  const getDateString = () => {
    return new Date().toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  // Berechnungen
  const totalLeads = leads.length;
  const todayFollowups = followups.length;
  const wonDeals = leads.filter(l => l.status?.toLowerCase() === 'won').length;
  const pipelineValue = leads.reduce((sum, l: any) => sum + (l.deal_value || l.estimated_value || 0), 0);
  const hotLeads = leads.filter(l => 
    l.temperature === 'hot' || 
    l.status?.toLowerCase() === 'engaged' ||
    l.status?.toLowerCase() === 'qualified'
  ).slice(0, 5);
  
  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'User';

  return (
    <>
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06B6D4" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}, {firstName}!</Text>
        <View style={styles.headerMeta}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateIcon}>📅</Text>
            <Text style={styles.dateText}>{getDateString()}</Text>
          </View>
          <View style={styles.followupBadge}>
            <Text style={styles.followupBadgeText}>{todayFollowups} Follow-ups heute</Text>
          </View>
        </View>
      </View>

      {/* KPI Cards - 2x2 Grid */}
      <View style={styles.kpiGrid}>
        {/* Leads Gesamt */}
        <View style={[styles.kpiCard, styles.kpiCardPrimary]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>LEADS GESAMT</Text>
            <View style={styles.kpiIcon}>
              <Text>👥</Text>
            </View>
          </View>
          <Text style={styles.kpiValue}>{totalLeads}</Text>
          <View style={styles.kpiFooter}>
            <View style={styles.kpiProgress} />
            <View style={styles.kpiTrendBadge}>
              <Text style={styles.kpiTrendUp}>↗ 12%</Text>
            </View>
          </View>
        </View>

        {/* Follow-ups heute */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>FOLLOW-UPS HEUTE</Text>
            <View style={styles.kpiIcon}>
              <Text>⏰</Text>
            </View>
          </View>
          <Text style={styles.kpiValue}>{todayFollowups}</Text>
          <View style={styles.kpiFooter}>
            <View style={[styles.kpiProgress, styles.kpiProgressOrange]} />
            <View style={[styles.kpiTrendBadge, styles.kpiTrendBadgeRed]}>
              <Text style={styles.kpiTrendDown}>↘ -3%</Text>
            </View>
          </View>
        </View>

        {/* Abschlüsse */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>ABSCHLÜSSE (MONAT)</Text>
            <View style={styles.kpiIcon}>
              <Text>🎯</Text>
            </View>
          </View>
          <Text style={styles.kpiValue}>{wonDeals}</Text>
          <View style={styles.kpiFooter}>
            <View style={[styles.kpiProgress, styles.kpiProgressGreen]} />
            <View style={styles.kpiTrendBadge}>
              <Text style={styles.kpiTrendUp}>↗ 5%</Text>
            </View>
          </View>
        </View>

        {/* Pipeline Wert */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>PIPELINE WERT</Text>
            <View style={[styles.kpiIcon, styles.kpiIconGreen]}>
              <Text>€</Text>
            </View>
          </View>
          <Text style={styles.kpiValue}>{pipelineValue} €</Text>
          <View style={styles.kpiFooter}>
            <View style={[styles.kpiProgress, styles.kpiProgressGreen]} />
            <View style={styles.kpiTrendBadge}>
              <Text style={styles.kpiTrendUp}>↗ 2%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={() => setShowNewLeadModal(true)}>
          <Text style={styles.quickActionIcon}>+</Text>
          <Text style={styles.quickActionText}>Neuer Lead</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <Text style={styles.quickActionIcon}>+</Text>
          <Text style={styles.quickActionText}>Follow-up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <Text style={styles.quickActionIcon}>🤖</Text>
          <Text style={styles.quickActionText}>AI Copilot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <Text style={styles.quickActionIcon}>↑</Text>
          <Text style={styles.quickActionText}>Import</Text>
        </TouchableOpacity>
      </View>

      {/* Hot Leads Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hot Leads</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Alle anzeigen →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionCard}>
          {hotLeads.length > 0 ? (
            <>
              {hotLeads.map((lead, index) => (
                <View key={lead.id || index} style={[
                  styles.hotLeadItem,
                  index === hotLeads.length - 1 && styles.hotLeadItemLast
                ]}>
                  <View style={styles.hotLeadAvatar}>
                    <Text style={styles.hotLeadAvatarText}>
                      {(lead.name?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.hotLeadInfo}>
                    <Text style={styles.hotLeadName}>{lead.name || 'Unbekannt'}</Text>
                    <Text style={styles.hotLeadMeta}>{lead.platform || 'Kontakt'}</Text>
                  </View>
                  <View style={[
                    styles.hotLeadStatus,
                    { backgroundColor: getStatusColor(lead.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.hotLeadStatusText,
                      { color: getStatusColor(lead.status) }
                    ]}>
                      {lead.status}
                    </Text>
                  </View>
                </View>
              ))}
              
              {/* Letzte Aktivitäten */}
              <View style={styles.activitySection}>
                <Text style={styles.activityTitle}>Letzte Aktivitäten</Text>
                <Text style={styles.activitySubtitle}>Echtzeit Updates</Text>
                <Text style={styles.emptyText}>Noch keine Aktivitäten.</Text>
                <TouchableOpacity onPress={() => setShowNewLeadModal(true)}>
                  <Text style={styles.emptyLink}>Erstelle deinen ersten Lead!</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.showAllButton}>
                <Text style={styles.showAllButtonText}>Alle anzeigen</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Keine heutigen Tasks. Schau dir stattdessen deine heißesten Leads an:</Text>
              
              <View style={styles.activitySection}>
                <Text style={styles.activityTitle}>Letzte Aktivitäten</Text>
                <Text style={styles.activitySubtitle}>Echtzeit Updates</Text>
                <Text style={styles.emptyText}>Noch keine Aktivitäten.</Text>
                <TouchableOpacity onPress={() => setShowNewLeadModal(true)}>
                  <Text style={styles.emptyLink}>Erstelle deinen ersten Lead!</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.showAllButton}>
                <Text style={styles.showAllButtonText}>Alle anzeigen</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Follow-ups heute - Rechte Spalte */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔔 Follow-ups heute</Text>
          <Text style={styles.sectionCount}>{todayFollowups}</Text>
        </View>
        <View style={styles.sectionCard}>
          {followups.length > 0 ? (
            followups.slice(0, 3).map((followup: any, index: number) => (
              <View key={followup.id || index} style={styles.followupItem}>
                <Text style={styles.followupName}>{followup.contact_name || followup.lead?.name}</Text>
                <Text style={styles.followupType}>{followup.type || 'Follow-up'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Keine Follow-ups fällig! 🎉</Text>
          )}
        </View>
      </View>

      {/* AI Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.emptyText}>Keine AI Insights verfügbar.</Text>
        </View>
      </View>

      {/* Pipeline */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Deine Pipeline</Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.emptyText}>Keine Pipeline-Daten verfügbar.</Text>
        </View>
      </View>

      {/* Letzte Aktivitäten */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Letzte Aktivitäten</Text>
          <Text style={styles.sectionMeta}>Echtzeit Updates</Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.emptyText}>Noch keine Aktivitäten.</Text>
          <TouchableOpacity>
            <Text style={styles.emptyLink}>Erstelle deinen ersten Lead!</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>

      {/* New Lead Modal */}
      <NewLeadModal
        visible={showNewLeadModal}
        onClose={() => setShowNewLeadModal(false)}
        onLeadCreated={() => {
          setShowNewLeadModal(false);
          loadData();
        }}
      />
    </>
  );
}

function getStatusColor(status: string): string {
  const s = status?.toLowerCase() || '';
  if (s === 'new') return '#3B82F6';
  if (s === 'contacted') return '#8B5CF6';
  if (s === 'engaged') return '#10B981';
  if (s === 'qualified') return '#F59E0B';
  if (s === 'meeting') return '#F59E0B';
  if (s === 'won') return '#10B981';
  if (s === 'lost') return '#EF4444';
  return '#6B7280';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1419',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A202C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateIcon: {
    marginRight: 6,
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  followupBadge: {
    backgroundColor: '#06B6D420',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followupBadgeText: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: '46%',
    backgroundColor: '#1A202C',
    borderRadius: 16,
    padding: 14,
    margin: '2%',
    borderWidth: 1,
    borderColor: '#374151',
  },
  kpiCardPrimary: {
    borderColor: '#06B6D4',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  kpiIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiIconGreen: {
    backgroundColor: '#10B98120',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  kpiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiProgress: {
    flex: 1,
    height: 4,
    backgroundColor: '#06B6D4',
    borderRadius: 2,
    marginRight: 8,
  },
  kpiProgressOrange: {
    backgroundColor: '#F59E0B',
  },
  kpiProgressGreen: {
    backgroundColor: '#10B981',
  },
  kpiTrendBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  kpiTrendBadgeRed: {
    backgroundColor: '#EF444420',
  },
  kpiTrendUp: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  kpiTrendDown: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A202C',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 4,
  },
  quickActionIcon: {
    fontSize: 12,
    color: '#06B6D4',
  },
  quickActionText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionLink: {
    fontSize: 13,
    color: '#06B6D4',
  },
  sectionCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#06B6D4',
  },
  sectionMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sectionCard: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  hotLeadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  hotLeadItemLast: {
    borderBottomWidth: 0,
  },
  hotLeadAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hotLeadAvatarText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hotLeadInfo: {
    flex: 1,
  },
  hotLeadName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hotLeadMeta: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  hotLeadStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hotLeadStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activitySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  showAllButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  showAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  followupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  followupName: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  followupType: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  emptyState: {
    paddingVertical: 8,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyLink: {
    color: '#06B6D4',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 120,
  },
});
