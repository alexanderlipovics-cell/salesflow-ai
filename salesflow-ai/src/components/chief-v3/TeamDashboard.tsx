/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TeamDashboard Component                                                   ║
 * ║  Dashboard für Team-Leader / Uplines                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTeamLeader } from '../../hooks/useTeamLeader';

// =============================================================================
// TYPES
// =============================================================================

interface TeamDashboardProps {
  onMemberPress?: (memberId: string) => void;
  onAlertPress?: (alert: any) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamDashboard({
  onMemberPress,
  onAlertPress,
}: TeamDashboardProps) {
  const {
    dashboard,
    alerts,
    members,
    loading,
    loadMembers,
    loadMemberDetail,
    nudgeMember,
    generateAgenda,
    agenda,
  } = useTeamLeader();

  const [showAgenda, setShowAgenda] = useState(false);

  if (loading && !dashboard) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Lade Team-Dashboard...</Text>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyText}>Noch kein Team eingerichtet</Text>
        </View>
      </View>
    );
  }

  // Handle Nudge
  const handleNudge = async (memberId: string, type: 'gentle' | 'direct' | 'motivational') => {
    try {
      const result = await nudgeMember(memberId, type);
      // Show success toast
    } catch (err) {
      // Show error
    }
  };

  // Handle Agenda
  const handleGenerateAgenda = async () => {
    await generateAgenda();
    setShowAgenda(true);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Team Dashboard</Text>
          <Text style={styles.momentum}>{dashboard.team_momentum}</Text>
        </View>
        <TouchableOpacity 
          style={styles.agendaButton}
          onPress={handleGenerateAgenda}
        >
          <Text style={styles.agendaButtonText}>📋 Agenda</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboard.total_members}</Text>
          <Text style={styles.statLabel}>Mitglieder</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.activeValue]}>
            {dashboard.active_today}
          </Text>
          <Text style={styles.statLabel}>Heute aktiv</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{dashboard.total_outreach_today}</Text>
          <Text style={styles.statLabel}>Outreach heute</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {Math.round(dashboard.team_conversion_rate * 100)}%
          </Text>
          <Text style={styles.statLabel}>Conversion</Text>
        </View>
      </View>

      {/* Top Performer */}
      {dashboard.top_performer && (
        <View style={styles.topPerformerCard}>
          <Text style={styles.sectionTitle}>🏆 Top Performer diese Woche</Text>
          <View style={styles.topPerformerContent}>
            <Text style={styles.topPerformerName}>
              {dashboard.top_performer.name}
            </Text>
            <View style={styles.topPerformerStats}>
              <Text style={styles.topStat}>
                {dashboard.top_performer.outreach_week} Outreach
              </Text>
              <Text style={styles.topStat}>
                {Math.round(dashboard.top_performer.conversion_rate * 100)}% Conv.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Alerts</Text>
          {alerts.slice(0, 5).map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                alert.priority === 'critical' && styles.alertCritical,
                alert.priority === 'high' && styles.alertHigh,
              ]}
              onPress={() => onAlertPress?.(alert)}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertName}>{alert.member_name}</Text>
                <Text style={[
                  styles.alertPriority,
                  { color: alert.priority === 'critical' ? '#ef4444' : '#f59e0b' }
                ]}>
                  {alert.priority.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertAction}>→ {alert.action}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Needs Attention */}
      {dashboard.needs_attention.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👀 Brauchen Aufmerksamkeit</Text>
          {dashboard.needs_attention.map((member) => (
            <View key={member.id} style={styles.attentionCard}>
              <View style={styles.attentionInfo}>
                <Text style={styles.attentionName}>{member.name}</Text>
                <Text style={styles.attentionReason}>{member.reason}</Text>
              </View>
              <View style={styles.nudgeButtons}>
                <TouchableOpacity
                  style={styles.nudgeButton}
                  onPress={() => handleNudge(member.id, 'gentle')}
                >
                  <Text style={styles.nudgeButtonText}>💬</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nudgeButton, styles.nudgeButtonDirect]}
                  onPress={() => handleNudge(member.id, 'direct')}
                >
                  <Text style={styles.nudgeButtonText}>⚡</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => loadMembers()}
        >
          <Text style={styles.quickActionEmoji}>👥</Text>
          <Text style={styles.quickActionText}>Alle Member</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleGenerateAgenda}
        >
          <Text style={styles.quickActionEmoji}>📅</Text>
          <Text style={styles.quickActionText}>Meeting Agenda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <Text style={styles.quickActionEmoji}>📊</Text>
          <Text style={styles.quickActionText}>Wochenreport</Text>
        </TouchableOpacity>
      </View>

      {/* Agenda Modal/Section */}
      {showAgenda && agenda && (
        <View style={styles.agendaSection}>
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaTitle}>
              📋 Meeting Agenda - {agenda.meeting_date}
            </Text>
            <TouchableOpacity onPress={() => setShowAgenda(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.agendaSummary}>{agenda.team_summary}</Text>
          
          {/* Wins */}
          {agenda.wins_to_celebrate.length > 0 && (
            <View style={styles.agendaBlock}>
              <Text style={styles.agendaBlockTitle}>🎉 Wins zum Feiern</Text>
              {agenda.wins_to_celebrate.map((win, i) => (
                <Text key={i} style={styles.agendaItem}>• {win}</Text>
              ))}
            </View>
          )}
          
          {/* Challenges */}
          {agenda.challenges_to_address.length > 0 && (
            <View style={styles.agendaBlock}>
              <Text style={styles.agendaBlockTitle}>🎯 Challenges</Text>
              {agenda.challenges_to_address.map((challenge, i) => (
                <Text key={i} style={styles.agendaItem}>• {challenge}</Text>
              ))}
            </View>
          )}
          
          {/* Focus */}
          <View style={styles.focusBlock}>
            <Text style={styles.focusLabel}>Fokus nächste Woche:</Text>
            <Text style={styles.focusText}>{agenda.focus_for_next_week}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 16,
  },
  loadingText: {
    color: '#a0a0a0',
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#a0a0a0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  momentum: {
    fontSize: 14,
    color: '#10b981',
  },
  agendaButton: {
    backgroundColor: '#2d2d44',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  agendaButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  activeValue: {
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  topPerformerCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  topPerformerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topPerformerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
  },
  topPerformerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  topStat: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  section: {
    marginBottom: 20,
  },
  alertCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  alertCritical: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#1f1a1a',
  },
  alertHigh: {
    borderLeftColor: '#f59e0b',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  alertPriority: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertMessage: {
    fontSize: 13,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  alertAction: {
    fontSize: 12,
    color: '#10b981',
  },
  attentionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attentionInfo: {
    flex: 1,
  },
  attentionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  attentionReason: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  nudgeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  nudgeButton: {
    width: 36,
    height: 36,
    backgroundColor: '#2d2d44',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeButtonDirect: {
    backgroundColor: '#f59e0b',
  },
  nudgeButtonText: {
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  agendaSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  agendaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    fontSize: 18,
    color: '#a0a0a0',
    padding: 4,
  },
  agendaSummary: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 16,
    lineHeight: 20,
  },
  agendaBlock: {
    marginBottom: 16,
  },
  agendaBlockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  agendaItem: {
    fontSize: 13,
    color: '#a0a0a0',
    marginBottom: 4,
    paddingLeft: 8,
  },
  focusBlock: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 12,
  },
  focusLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 4,
  },
  focusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default TeamDashboard;

