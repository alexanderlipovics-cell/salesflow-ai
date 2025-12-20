import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { api } from '../services/api';
import NewLeadModal from './NewLeadModal';
import LeadDetailScreen from './LeadDetailScreen';

const { width } = Dimensions.get('window');

interface DashboardProps {
  onLogout: () => void;
  onNavigate?: (screen: string, params?: any) => void;
}

interface Stats {
  totalLeads: number;
  hotLeads: number;
  followUpsDue: number;
  todayAppointments: number;
  wonDeals: number;
  conversionRate: number;
  newThisWeek: number;
  pendingTasks: number;
}

export default function DashboardScreen({ onLogout, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    hotLeads: 0,
    followUpsDue: 0,
    todayAppointments: 0,
    wonDeals: 0,
    conversionRate: 0,
    newThisWeek: 0,
    pendingTasks: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [hotLeadsList, setHotLeadsList] = useState<any[]>([]);
  const [followUpsList, setFollowUpsList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  
  // Modals & Navigation
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showHotLeadsModal, setShowHotLeadsModal] = useState(false);
  const [showFollowUpsModal, setShowFollowUpsModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'recent' | 'hot' | 'followups'>('dashboard');
  const [currentListIndex, setCurrentListIndex] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadDashboard();
    setGreeting(getGreeting());
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  const loadDashboard = async () => {
    try {
      const leads = await api.getLeads();
      const leadsArray = Array.isArray(leads) ? leads : [];
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      // Hot Leads
      const hotLeads = leadsArray.filter((l: any) => l.temperature === 'hot');
      setHotLeadsList(hotLeads);
      
      // Follow-ups due (contacted > 2 days ago, not won/lost/new)
      const followUps = leadsArray.filter((l: any) => {
        if (l.status === 'won' || l.status === 'lost' || l.status === 'new') return false;
        const lastContact = l.last_contacted ? new Date(l.last_contacted) : new Date(l.created_at);
        return lastContact < twoDaysAgo;
      });
      setFollowUpsList(followUps);
      
      const wonDeals = leadsArray.filter((l: any) => l.status === 'won').length;
      const newThisWeek = leadsArray.filter((l: any) => new Date(l.created_at) > weekAgo).length;

      setStats({
        totalLeads: leadsArray.length,
        hotLeads: hotLeads.length,
        followUpsDue: followUps.length,
        todayAppointments: 0, // TODO: From calendar
        wonDeals,
        conversionRate: leadsArray.length > 0 ? Math.round((wonDeals / leadsArray.length) * 100) : 0,
        newThisWeek,
        pendingTasks: 0, // TODO: From tasks
      });

      // Recent leads (last 5, sorted by created_at)
      setRecentLeads(
        leadsArray
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
      );

    } catch (error) {
      console.log('Dashboard load error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10B981';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  // Handle Quick Actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new_lead':
        setShowNewLeadModal(true);
        break;
      case 'hot_leads':
        if (hotLeadsList.length > 0) {
          setViewMode('hot');
          setCurrentListIndex(0);
          setSelectedLeadId(hotLeadsList[0].id);
        }
        break;
      case 'follow_ups':
        if (followUpsList.length > 0) {
          setViewMode('followups');
          setCurrentListIndex(0);
          setSelectedLeadId(followUpsList[0].id);
        }
        break;
      case 'appointments':
        // TODO: Navigate to calendar
        break;
      case 'ask_chief':
        if (onNavigate) onNavigate('AI');
        break;
      case 'tasks':
        // TODO: Navigate to tasks
        break;
    }
  };

  // Handle Lead Click from Recent List
  const handleRecentLeadClick = (leadId: string, index: number) => {
    setViewMode('recent');
    setCurrentListIndex(index);
    setSelectedLeadId(leadId);
  };

  // Handle Next Lead (after action in Lead Detail)
  const handleNextLead = () => {
    let currentList: any[] = [];
    if (viewMode === 'recent') currentList = recentLeads;
    if (viewMode === 'hot') currentList = hotLeadsList;
    if (viewMode === 'followups') currentList = followUpsList;

    const nextIndex = currentListIndex + 1;
    if (nextIndex < currentList.length) {
      setCurrentListIndex(nextIndex);
      setSelectedLeadId(currentList[nextIndex].id);
    } else {
      // List done - back to dashboard
      setSelectedLeadId(null);
      setViewMode('dashboard');
      loadDashboard(); // Refresh stats
    }
  };

  // Handle Back from Lead Detail
  const handleBackFromLead = () => {
    setSelectedLeadId(null);
    setViewMode('dashboard');
    loadDashboard();
  };

  // Show Lead Detail Screen
  if (selectedLeadId) {
    return (
      <LeadDetailScreen
        leadId={selectedLeadId}
        onBack={handleBackFromLead}
        onNextLead={handleNextLead}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06B6D4" />}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.subtitle}>Dein Sales Command Center</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>7</Text>
          </View>
        </Animated.View>

        {/* Main KPI Card */}
        <Animated.View style={[styles.mainKpiCard, { opacity: fadeAnim }]}>
          <View style={styles.mainKpiHeader}>
            <Text style={styles.mainKpiTitle}>PIPELINE OVERVIEW</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          
          <View style={styles.mainKpiValue}>
            <Text style={styles.bigNumber}>{stats.totalLeads}</Text>
            <Text style={styles.bigLabel}>Leads im Radar</Text>
          </View>

          <View style={styles.kpiRow}>
            <TouchableOpacity style={styles.kpiItem} onPress={() => handleQuickAction('hot_leads')}>
              <Text style={styles.kpiValue}>{stats.hotLeads}</Text>
              <Text style={styles.kpiLabel}>🔥 Hot</Text>
            </TouchableOpacity>
            <View style={styles.kpiDivider} />
            <TouchableOpacity style={styles.kpiItem} onPress={() => handleQuickAction('follow_ups')}>
              <Text style={[styles.kpiValue, stats.followUpsDue > 0 && styles.kpiValueAlert]}>{stats.followUpsDue}</Text>
              <Text style={styles.kpiLabel}>⏰ Follow-ups</Text>
            </TouchableOpacity>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiValue, styles.kpiValueSuccess]}>{stats.wonDeals}</Text>
              <Text style={styles.kpiLabel}>🎉 Gewonnen</Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statValue}>{stats.conversionRate}%</Text>
            <Text style={styles.statLabel}>Conversion</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🆕</Text>
            <Text style={styles.statValue}>{stats.newThisWeek}</Text>
            <Text style={styles.statLabel}>Diese Woche</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('new_lead')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={styles.actionEmoji}>➕</Text>
              </View>
              <Text style={styles.actionText}>Neuer Lead</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('hot_leads')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={styles.actionEmoji}>🔥</Text>
              </View>
              <Text style={styles.actionText}>Hot Leads</Text>
              {stats.hotLeads > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.hotLeads}</Text></View>}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('follow_ups')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Text style={styles.actionEmoji}>⏰</Text>
              </View>
              <Text style={styles.actionText}>Follow-ups</Text>
              {stats.followUpsDue > 0 && <View style={[styles.badge, styles.badgeAlert]}><Text style={styles.badgeText}>{stats.followUpsDue}</Text></View>}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('appointments')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Text style={styles.actionEmoji}>📅</Text>
              </View>
              <Text style={styles.actionText}>Termine</Text>
              {stats.todayAppointments > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.todayAppointments}</Text></View>}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('ask_chief')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                <Text style={styles.actionEmoji}>🤖</Text>
              </View>
              <Text style={styles.actionText}>Ask CHIEF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCard} onPress={() => handleQuickAction('tasks')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Text style={styles.actionEmoji}>✅</Text>
              </View>
              <Text style={styles.actionText}>Aufgaben</Text>
              {stats.pendingTasks > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.pendingTasks}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Leads */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕐 Neueste Leads</Text>
            <TouchableOpacity onPress={() => {
              if (recentLeads.length > 0) {
                setViewMode('recent');
                setCurrentListIndex(0);
                setSelectedLeadId(recentLeads[0].id);
              }
            }}>
              <Text style={styles.seeAllText}>Alle abarbeiten →</Text>
            </TouchableOpacity>
          </View>
          
          {recentLeads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Noch keine Leads</Text>
              <TouchableOpacity onPress={() => setShowNewLeadModal(true)}>
                <Text style={styles.emptyLink}>+ Ersten Lead hinzufügen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentLeads.map((lead, index) => (
              <TouchableOpacity 
                key={lead.id || index} 
                style={styles.leadCard}
                onPress={() => handleRecentLeadClick(lead.id, index)}
              >
                <View style={[styles.leadAvatar, { borderColor: getScoreColor(lead.bant_score || 30) }]}>
                  <Text style={styles.leadAvatarText}>{(lead.name?.[0] || '?').toUpperCase()}</Text>
                </View>
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.name}</Text>
                  <Text style={styles.leadMeta}>
                    {lead.company || lead.platform || 'Lead'} • {lead.status || 'new'}
                  </Text>
                </View>
                <View style={styles.leadRight}>
                  <Text style={styles.leadTemp}>
                    {lead.temperature === 'hot' ? '🔥' : lead.temperature === 'warm' ? '☀️' : '❄️'}
                  </Text>
                  <Text style={[styles.leadScore, { color: getScoreColor(lead.bant_score || 30) }]}>
                    {lead.bant_score || 30}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* CHIEF Tip */}
        <View style={styles.chiefTip}>
          <View style={styles.chiefTipHeader}>
            <Text style={styles.chiefTipIcon}>🤖</Text>
            <Text style={styles.chiefTipTitle}>CHIEF's Tipp</Text>
          </View>
          <Text style={styles.chiefTipText}>
            {stats.followUpsDue > 0 
              ? `Du hast ${stats.followUpsDue} Follow-ups offen. Arbeite sie ab bevor sie kalt werden! Tippe auf "Follow-ups" um zu starten.`
              : stats.hotLeads > 0
              ? `${stats.hotLeads} Hot Leads warten auf dich. Jetzt ist der perfekte Zeitpunkt! Tippe auf "Hot Leads".`
              : 'Füge neue Leads hinzu um deine Pipeline zu füllen. Screenshots funktionieren auch! 📸'
            }
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* New Lead Modal */}
      <NewLeadModal
        visible={showNewLeadModal}
        onClose={() => setShowNewLeadModal(false)}
        onLeadCreated={() => {
          setShowNewLeadModal(false);
          loadDashboard();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scrollView: { flex: 1 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  streakIcon: { fontSize: 16, marginRight: 4 },
  streakText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },

  // Main KPI Card
  mainKpiCard: { marginHorizontal: 16, backgroundColor: 'rgba(20, 20, 30, 0.9)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.2)', marginBottom: 16 },
  mainKpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mainKpiTitle: { fontSize: 12, fontWeight: '700', color: '#06B6D4', letterSpacing: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  liveText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  mainKpiValue: { alignItems: 'center', marginBottom: 24 },
  bigNumber: { fontSize: 64, fontWeight: '700', color: '#FFFFFF' },
  bigLabel: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  kpiItem: { alignItems: 'center', padding: 8 },
  kpiValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  kpiValueAlert: { color: '#F59E0B' },
  kpiValueSuccess: { color: '#10B981' },
  kpiLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  kpiDivider: { width: 1, height: 40, backgroundColor: 'rgba(75, 85, 99, 0.3)' },

  // Stats Row
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(20, 20, 30, 0.8)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(75, 85, 99, 0.2)' },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  seeAllText: { color: '#06B6D4', fontSize: 14 },

  // Actions Grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: (width - 44) / 2, backgroundColor: 'rgba(20, 20, 30, 0.8)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(75, 85, 99, 0.2)', position: 'relative' },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionEmoji: { fontSize: 24 },
  actionText: { fontSize: 13, color: '#D1D5DB', fontWeight: '500' },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#06B6D4', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeAlert: { backgroundColor: '#F59E0B' },
  badgeText: { color: '#000', fontSize: 12, fontWeight: '700' },

  // Lead Card
  leadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20, 20, 30, 0.6)', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(75, 85, 99, 0.2)' },
  leadAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  leadAvatarText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  leadMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  leadRight: { alignItems: 'center' },
  leadTemp: { fontSize: 18, marginBottom: 4 },
  leadScore: { fontSize: 14, fontWeight: '700' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  emptyLink: { fontSize: 14, color: '#06B6D4', marginTop: 8 },

  // CHIEF Tip
  chiefTip: { marginHorizontal: 16, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.2)', marginBottom: 16 },
  chiefTipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chiefTipIcon: { fontSize: 20, marginRight: 8 },
  chiefTipTitle: { fontSize: 14, fontWeight: '600', color: '#06B6D4' },
  chiefTipText: { fontSize: 14, color: '#D1D5DB', lineHeight: 22 },
});
