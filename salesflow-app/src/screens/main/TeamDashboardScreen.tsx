/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TEAM DASHBOARD SCREEN - NetworkerOS                                       ║
 * ║  Übersicht über Teammitglieder, deren Aktivität und Alerts                 ║
 * ║                                                                            ║
 * ║  Features:                                                                 ║
 * ║  - Team-Übersicht mit Performance-Stats                                    ║
 * ║  - Aktivitäts-Feed der Partner                                             ║
 * ║  - Alerts für Partner die Hilfe brauchen                                   ║
 * ║  - Quick Actions für Team-Support                                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Image,
} from 'react-native';
import { AURA_COLORS, AURA_SHADOWS, AURA_SPACING, AURA_RADIUS } from '../../components/aura/theme';

// =============================================================================
// TYPES
// =============================================================================

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  rank: string;
  status: 'active' | 'inactive' | 'new';
  dmoProgress: number;
  contactsThisWeek: number;
  closesThisMonth: number;
  lastActive: string;
  needsHelp: boolean;
  disgType?: 'D' | 'I' | 'S' | 'G';
}

interface TeamAlert {
  id: string;
  memberId: string;
  memberName: string;
  type: 'inactive' | 'struggling' | 'achievement' | 'milestone';
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  teamDmoAverage: number;
  teamClosesThisMonth: number;
  teamContactsThisWeek: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const getMockTeamStats = (): TeamStats => ({
  totalMembers: 12,
  activeMembers: 9,
  newMembersThisMonth: 2,
  teamDmoAverage: 67,
  teamClosesThisMonth: 8,
  teamContactsThisWeek: 156,
});

const getMockTeamMembers = (): TeamMember[] => [
  {
    id: '1',
    name: 'Sarah M.',
    rank: 'Silver',
    status: 'active',
    dmoProgress: 92,
    contactsThisWeek: 24,
    closesThisMonth: 3,
    lastActive: 'Vor 10 Min.',
    needsHelp: false,
    disgType: 'I',
  },
  {
    id: '2',
    name: 'Thomas K.',
    rank: 'Bronze',
    status: 'active',
    dmoProgress: 45,
    contactsThisWeek: 8,
    closesThisMonth: 1,
    lastActive: 'Vor 2 Std.',
    needsHelp: true,
    disgType: 'D',
  },
  {
    id: '3',
    name: 'Lisa R.',
    rank: 'Gold',
    status: 'active',
    dmoProgress: 100,
    contactsThisWeek: 35,
    closesThisMonth: 5,
    lastActive: 'Vor 5 Min.',
    needsHelp: false,
    disgType: 'S',
  },
  {
    id: '4',
    name: 'Michael B.',
    rank: 'Starter',
    status: 'new',
    dmoProgress: 20,
    contactsThisWeek: 3,
    closesThisMonth: 0,
    lastActive: 'Vor 1 Tag',
    needsHelp: true,
    disgType: 'G',
  },
  {
    id: '5',
    name: 'Anna S.',
    rank: 'Silver',
    status: 'inactive',
    dmoProgress: 0,
    contactsThisWeek: 0,
    closesThisMonth: 0,
    lastActive: 'Vor 5 Tagen',
    needsHelp: true,
    disgType: 'S',
  },
];

const getMockAlerts = (): TeamAlert[] => [
  {
    id: '1',
    memberId: '5',
    memberName: 'Anna S.',
    type: 'inactive',
    message: 'Seit 5 Tagen keine Aktivität',
    timestamp: 'Vor 2 Std.',
    priority: 'high',
  },
  {
    id: '2',
    memberId: '4',
    memberName: 'Michael B.',
    type: 'struggling',
    message: 'Neuer Partner braucht Unterstützung bei Erstgesprächen',
    timestamp: 'Vor 4 Std.',
    priority: 'high',
  },
  {
    id: '3',
    memberId: '3',
    memberName: 'Lisa R.',
    type: 'achievement',
    message: '🎉 Hat heute 100% DMO erreicht!',
    timestamp: 'Vor 30 Min.',
    priority: 'low',
  },
  {
    id: '4',
    memberId: '1',
    memberName: 'Sarah M.',
    type: 'milestone',
    message: 'Steht kurz vor Silver Rank!',
    timestamp: 'Vor 1 Tag',
    priority: 'medium',
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const DISG_CONFIG = {
  D: { label: 'Dominant', color: '#ef4444', icon: '🔴' },
  I: { label: 'Initiativ', color: '#f59e0b', icon: '🟡' },
  S: { label: 'Stetig', color: '#22c55e', icon: '🟢' },
  G: { label: 'Gewissenhaft', color: '#3b82f6', icon: '🔵' },
};

const DISGBadge = ({ type }: { type?: 'D' | 'I' | 'S' | 'G' }) => {
  if (!type || !DISG_CONFIG[type]) return null;
  const config = DISG_CONFIG[type];
  
  return (
    <View style={[styles.disgBadge, { backgroundColor: config.color + '20' }]}>
      <Text style={styles.disgBadgeText}>{config.icon}</Text>
    </View>
  );
};

const StatusIndicator = ({ status }: { status: 'active' | 'inactive' | 'new' }) => {
  const colors = {
    active: AURA_COLORS.neon.green,
    inactive: AURA_COLORS.neon.rose,
    new: AURA_COLORS.neon.amber,
  };
  
  return (
    <View style={[styles.statusIndicator, { backgroundColor: colors[status] }]} />
  );
};

const ProgressRing = ({ progress, size = 40 }: { progress: number; size?: number }) => {
  const getColor = (p: number) => {
    if (p >= 80) return AURA_COLORS.neon.green;
    if (p >= 50) return AURA_COLORS.neon.amber;
    return AURA_COLORS.neon.rose;
  };
  
  return (
    <View style={[styles.progressRing, { width: size, height: size }]}>
      <View 
        style={[
          styles.progressRingFill,
          { 
            backgroundColor: getColor(progress),
            opacity: 0.2,
          }
        ]} 
      />
      <Text style={[styles.progressRingText, { color: getColor(progress) }]}>
        {progress}%
      </Text>
    </View>
  );
};

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

interface StatsCardProps {
  stats: TeamStats;
}

const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>📊 Team Performance</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.activeMembers}/{stats.totalMembers}</Text>
          <Text style={styles.statLabel}>Aktive Partner</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.teamDmoAverage}%</Text>
          <Text style={styles.statLabel}>Ø DMO</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.teamClosesThisMonth}</Text>
          <Text style={styles.statLabel}>Abschlüsse</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.teamContactsThisWeek}</Text>
          <Text style={styles.statLabel}>Kontakte/Woche</Text>
        </View>
      </View>
      
      {stats.newMembersThisMonth > 0 && (
        <View style={styles.newMembersBadge}>
          <Text style={styles.newMembersText}>
            🌟 {stats.newMembersThisMonth} neue Partner diesen Monat
          </Text>
        </View>
      )}
    </View>
  );
};

interface AlertCardProps {
  alert: TeamAlert;
  onPress: () => void;
  onDismiss: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onPress, onDismiss }) => {
  const getAlertStyle = () => {
    switch (alert.type) {
      case 'inactive':
        return { borderColor: AURA_COLORS.neon.rose, icon: '⚠️' };
      case 'struggling':
        return { borderColor: AURA_COLORS.neon.amber, icon: '🆘' };
      case 'achievement':
        return { borderColor: AURA_COLORS.neon.green, icon: '🏆' };
      case 'milestone':
        return { borderColor: AURA_COLORS.neon.purple, icon: '🎯' };
    }
  };
  
  const alertStyle = getAlertStyle();
  
  return (
    <TouchableOpacity 
      style={[styles.alertCard, { borderLeftColor: alertStyle.borderColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.alertIcon}>{alertStyle.icon}</Text>
      <View style={styles.alertContent}>
        <Text style={styles.alertMember}>{alert.memberName}</Text>
        <Text style={styles.alertMessage}>{alert.message}</Text>
        <Text style={styles.alertTime}>{alert.timestamp}</Text>
      </View>
      <TouchableOpacity style={styles.alertDismiss} onPress={onDismiss}>
        <Text style={styles.alertDismissText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

interface MemberCardProps {
  member: TeamMember;
  onPress: () => void;
  onMessage: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onPress, onMessage }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.memberCard,
        member.needsHelp && styles.memberCardNeedsHelp,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.memberHeader}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {member.name.charAt(0)}
          </Text>
          <StatusIndicator status={member.status} />
        </View>
        
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{member.name}</Text>
            <DISGBadge type={member.disgType} />
          </View>
          <View style={styles.memberRankRow}>
            <Text style={styles.memberRank}>{member.rank}</Text>
            {member.status === 'new' && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEU</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberLastActive}>{member.lastActive}</Text>
        </View>
        
        <ProgressRing progress={member.dmoProgress} />
      </View>
      
      <View style={styles.memberStats}>
        <View style={styles.memberStat}>
          <Text style={styles.memberStatValue}>{member.contactsThisWeek}</Text>
          <Text style={styles.memberStatLabel}>Kontakte</Text>
        </View>
        <View style={styles.memberStatDivider} />
        <View style={styles.memberStat}>
          <Text style={styles.memberStatValue}>{member.closesThisMonth}</Text>
          <Text style={styles.memberStatLabel}>Abschlüsse</Text>
        </View>
        <View style={styles.memberStatDivider} />
        <View style={styles.memberStat}>
          <Text style={styles.memberStatValue}>{member.dmoProgress}%</Text>
          <Text style={styles.memberStatLabel}>DMO</Text>
        </View>
      </View>
      
      {member.needsHelp && (
        <TouchableOpacity style={styles.helpButton} onPress={onMessage}>
          <Text style={styles.helpButtonText}>💬 Nachricht senden</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// =============================================================================
// MAIN SCREEN
// =============================================================================

interface TeamDashboardScreenProps {
  navigation: any;
}

export default function TeamDashboardScreen({ navigation }: TeamDashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [alerts, setAlerts] = useState<TeamAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'needs_help'>('all');

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStats(getMockTeamStats());
      setMembers(getMockTeamMembers());
      setAlerts(getMockAlerts());
      
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const filteredMembers = members.filter(m => {
    if (filter === 'active') return m.status === 'active';
    if (filter === 'needs_help') return m.needsHelp;
    return true;
  });

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Lade Team Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURA_COLORS.neon.cyan}
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>👥 Team Dashboard</Text>
            <Text style={styles.headerSubtitle}>Übersicht deiner Partner</Text>
          </View>

          {/* Team Stats */}
          {stats && <StatsCard stats={stats} />}

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔔 Alerts</Text>
                <View style={styles.alertCountBadge}>
                  <Text style={styles.alertCountText}>{alerts.length}</Text>
                </View>
              </View>
              
              {alerts.slice(0, 3).map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onPress={() => navigation.navigate('TeamMember', { memberId: alert.memberId })}
                  onDismiss={() => handleDismissAlert(alert.id)}
                />
              ))}
              
              {alerts.length > 3 && (
                <TouchableOpacity style={styles.showMoreBtn}>
                  <Text style={styles.showMoreText}>
                    + {alerts.length - 3} weitere Alerts anzeigen
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity 
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
                Alle ({members.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
              onPress={() => setFilter('active')}
            >
              <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
                Aktiv
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterTab, filter === 'needs_help' && styles.filterTabActive]}
              onPress={() => setFilter('needs_help')}
            >
              <Text style={[styles.filterTabText, filter === 'needs_help' && styles.filterTabTextActive]}>
                🆘 Braucht Hilfe
              </Text>
            </TouchableOpacity>
          </View>

          {/* Team Members */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Partner</Text>
            
            {filteredMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                onPress={() => navigation.navigate('TeamMember', { memberId: member.id })}
                onMessage={() => navigation.navigate('Chat', { 
                  initialMessage: `Nachricht an ${member.name}...`,
                  context: { teamMember: member }
                })}
              />
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('TeamPerformance')}
            >
              <Text style={styles.quickActionIcon}>📈</Text>
              <Text style={styles.quickActionText}>Performance</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Chat', {
                initialMessage: 'Zeig mir Vorschläge, wie ich mein Team unterstützen kann',
              })}
            >
              <Text style={styles.quickActionIcon}>🧠</Text>
              <Text style={styles.quickActionText}>MENTOR</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('TeamLeader')}
            >
              <Text style={styles.quickActionIcon}>🎯</Text>
              <Text style={styles.quickActionText}>Team Ziele</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    padding: AURA_SPACING.md,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: AURA_COLORS.text.muted,
    fontSize: 16,
  },

  // Header
  header: {
    marginBottom: AURA_SPACING.lg,
    paddingTop: AURA_SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },

  // Stats Card
  statsCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.lg,
    marginBottom: AURA_SPACING.lg,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    ...AURA_SHADOWS.glass,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: AURA_SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  newMembersBadge: {
    backgroundColor: AURA_COLORS.neon.amberSubtle,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.sm,
    marginTop: AURA_SPACING.md,
    alignItems: 'center',
  },
  newMembersText: {
    color: AURA_COLORS.neon.amber,
    fontSize: 13,
    fontWeight: '500',
  },

  // Section
  section: {
    marginBottom: AURA_SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AURA_SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    marginBottom: AURA_SPACING.sm,
  },
  alertCountBadge: {
    backgroundColor: AURA_COLORS.neon.rose,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AURA_RADIUS.full,
    marginLeft: AURA_SPACING.sm,
  },
  alertCountText: {
    color: AURA_COLORS.text.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.md,
    marginBottom: AURA_SPACING.sm,
    borderLeftWidth: 4,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: AURA_SPACING.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertMember: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  alertMessage: {
    fontSize: 13,
    color: AURA_COLORS.text.secondary,
    marginTop: 2,
  },
  alertTime: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  alertDismiss: {
    padding: AURA_SPACING.xs,
  },
  alertDismissText: {
    color: AURA_COLORS.text.muted,
    fontSize: 18,
  },
  showMoreBtn: {
    alignItems: 'center',
    padding: AURA_SPACING.sm,
  },
  showMoreText: {
    color: AURA_COLORS.neon.cyan,
    fontSize: 13,
  },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.lg,
    padding: 4,
    marginBottom: AURA_SPACING.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: AURA_RADIUS.md,
  },
  filterTabActive: {
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  filterTabText: {
    color: AURA_COLORS.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: AURA_COLORS.bg.primary,
    fontWeight: '600',
  },

  // Member Card
  memberCard: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.md,
    marginBottom: AURA_SPACING.sm,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  memberCardNeedsHelp: {
    borderColor: AURA_COLORS.neon.amber,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AURA_SPACING.md,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AURA_COLORS.neon.purpleSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AURA_SPACING.md,
    position: 'relative',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: AURA_COLORS.neon.purple,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: AURA_COLORS.bg.secondary,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AURA_SPACING.xs,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  memberRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  memberRank: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
  },
  newBadge: {
    backgroundColor: AURA_COLORS.neon.amberSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: AURA_SPACING.xs,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: AURA_COLORS.neon.amber,
  },
  memberLastActive: {
    fontSize: 11,
    color: AURA_COLORS.text.subtle,
    marginTop: 2,
  },
  progressRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: AURA_COLORS.bg.tertiary,
  },
  progressRingFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  progressRingText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: AURA_SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: AURA_COLORS.glass.border,
  },
  memberStat: {
    alignItems: 'center',
  },
  memberStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
  },
  memberStatLabel: {
    fontSize: 10,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  memberStatDivider: {
    width: 1,
    backgroundColor: AURA_COLORS.glass.border,
  },
  helpButton: {
    backgroundColor: AURA_COLORS.neon.amberSubtle,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.sm,
    marginTop: AURA_SPACING.sm,
    alignItems: 'center',
  },
  helpButtonText: {
    color: AURA_COLORS.neon.amber,
    fontSize: 13,
    fontWeight: '600',
  },

  // DISG Badge
  disgBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disgBadgeText: {
    fontSize: 12,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginTop: AURA_SPACING.md,
  },
  quickActionBtn: {
    alignItems: 'center',
    padding: AURA_SPACING.sm,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  quickActionText: {
    color: AURA_COLORS.text.muted,
    fontSize: 12,
  },
});

