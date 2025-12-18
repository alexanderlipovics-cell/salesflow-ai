/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TEAM LEADER SCREEN                                                        ║
 * ║  Dashboard für Uplines und Team Manager                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTeamLeader } from '../../hooks/useTeamLeader';
import type { TeamMember, TeamAlert } from '../../api/chiefV3';

interface TeamLeaderScreenProps {
  navigation: any;
}

export default function TeamLeaderScreen({ navigation }: TeamLeaderScreenProps) {
  const { user } = useAuth();
  const {
    members,
    dashboard,
    alerts,
    agenda,
    selectedMember,
    loading,
    error,
    activeMembers,
    needsAttention,
    criticalAlerts,
    teamSize,
    loadDashboard,
    loadMembers,
    loadAlerts,
    loadMemberDetail,
    nudgeMember,
    generateAgenda,
    shareTemplate,
    clearSelection,
  } = useTeamLeader();

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'alerts'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [selectedMemberForNudge, setSelectedMemberForNudge] = useState<TeamMember | null>(null);
  const [customNudgeMessage, setCustomNudgeMessage] = useState('');

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadAlerts()]);
    setRefreshing(false);
  }, [loadDashboard, loadAlerts]);

  // Nudge Handler
  const handleNudge = async (memberId: string, type: 'gentle' | 'direct' | 'motivational') => {
    try {
      const result = await nudgeMember(memberId, type, customNudgeMessage || undefined);
      Alert.alert('✅ Gesendet', result.message_sent);
      setShowNudgeModal(false);
      setSelectedMemberForNudge(null);
      setCustomNudgeMessage('');
    } catch (err) {
      Alert.alert('Fehler', 'Konnte Nudge nicht senden');
    }
  };

  // Open Nudge Modal
  const openNudgeModal = (member: TeamMember) => {
    setSelectedMemberForNudge(member);
    setShowNudgeModal(true);
  };

  // Generate Agenda
  const handleGenerateAgenda = async () => {
    await generateAgenda();
    setShowAgendaModal(true);
  };

  // Member Press
  const handleMemberPress = async (member: TeamMember) => {
    await loadMemberDetail(member.id);
    navigation.navigate('MemberDetail', { memberId: member.id });
  };

  // Alert Press
  const handleAlertPress = (alert: TeamAlert) => {
    const member = members.find(m => m.id === alert.member_id);
    if (member) {
      openNudgeModal(member);
    }
  };

  if (!dashboard && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.noAccessCard}>
          <Text style={styles.noAccessEmoji}>🔒</Text>
          <Text style={styles.noAccessTitle}>Team-Leader Bereich</Text>
          <Text style={styles.noAccessText}>
            Du brauchst Team-Leader Rechte um diesen Bereich zu sehen.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👥 Team Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {dashboard?.team_momentum || 'Lade...'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.agendaButton}
          onPress={handleGenerateAgenda}
        >
          <Text style={styles.agendaButtonText}>📋 Agenda</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            📊 Übersicht
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => {
            setActiveTab('members');
            loadMembers();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            👥 Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.tabActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>
            ⚠️ Alerts {criticalAlerts.length > 0 && `(${criticalAlerts.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {activeTab === 'overview' && dashboard && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{dashboard.total_members}</Text>
                <Text style={styles.statLabel}>Mitglieder</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#10b981' }]}>
                  {dashboard.active_today}
                </Text>
                <Text style={styles.statLabel}>Heute aktiv</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {dashboard.total_outreach_today}
                </Text>
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
                <Text style={styles.sectionTitle}>🏆 Top Performer</Text>
                <View style={styles.topPerformerContent}>
                  <Text style={styles.topPerformerName}>
                    {dashboard.top_performer.name}
                  </Text>
                  <View style={styles.topPerformerStats}>
                    <Text style={styles.topStat}>
                      {dashboard.top_performer.outreach_week} Outreach
                    </Text>
                    <Text style={styles.topStat}>
                      {Math.round(dashboard.top_performer.conversion_rate * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Needs Attention */}
            {dashboard.needs_attention.length > 0 && (
              <View style={styles.attentionCard}>
                <Text style={styles.sectionTitle}>👀 Brauchen Aufmerksamkeit</Text>
                {dashboard.needs_attention.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.attentionItem}
                    onPress={() => {
                      const member = { id: item.id, name: item.name } as TeamMember;
                      openNudgeModal(member);
                    }}
                  >
                    <View style={styles.attentionInfo}>
                      <Text style={styles.attentionName}>{item.name}</Text>
                      <Text style={styles.attentionReason}>{item.reason}</Text>
                    </View>
                    <View style={styles.nudgeButtons}>
                      <TouchableOpacity style={styles.nudgeButton}>
                        <Text style={styles.nudgeEmoji}>💬</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Dashboard Text */}
            {dashboard.dashboard_text && (
              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>📝 Zusammenfassung</Text>
                <Text style={styles.summaryText}>{dashboard.dashboard_text}</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'members' && (
          <>
            {members.length === 0 && !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={styles.emptyText}>Keine Team-Mitglieder</Text>
              </View>
            ) : (
              members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberCard}
                  onPress={() => handleMemberPress(member)}
                >
                  <View style={styles.memberHeader}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {member.needs_attention && (
                          <Text style={styles.attentionBadge}>⚠️</Text>
                        )}
                      </View>
                      <Text style={styles.memberLevel}>{member.level}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: member.is_active ? '#10b981' : '#6b7280' },
                      ]}
                    />
                  </View>
                  <View style={styles.memberStats}>
                    <View style={styles.memberStat}>
                      <Text style={styles.memberStatValue}>
                        {member.outreach_today}
                      </Text>
                      <Text style={styles.memberStatLabel}>Heute</Text>
                    </View>
                    <View style={styles.memberStat}>
                      <Text style={styles.memberStatValue}>
                        {member.outreach_week}
                      </Text>
                      <Text style={styles.memberStatLabel}>Woche</Text>
                    </View>
                    <View style={styles.memberStat}>
                      <Text style={styles.memberStatValue}>
                        {member.follow_ups_due}
                      </Text>
                      <Text style={styles.memberStatLabel}>FUs due</Text>
                    </View>
                    <View style={styles.memberStat}>
                      <Text style={styles.memberStatValue}>
                        🔥{member.streak_days}
                      </Text>
                      <Text style={styles.memberStatLabel}>Streak</Text>
                    </View>
                  </View>
                  {member.needs_attention && member.attention_reason && (
                    <Text style={styles.memberWarning}>
                      ⚠️ {member.attention_reason}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {activeTab === 'alerts' && (
          <>
            {alerts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyText}>Keine Alerts - alles läuft!</Text>
              </View>
            ) : (
              alerts.map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    alert.priority === 'critical' && styles.alertCritical,
                    alert.priority === 'high' && styles.alertHigh,
                  ]}
                  onPress={() => handleAlertPress(alert)}
                >
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertName}>{alert.member_name}</Text>
                    <Text
                      style={[
                        styles.alertPriority,
                        {
                          color:
                            alert.priority === 'critical'
                              ? '#ef4444'
                              : alert.priority === 'high'
                              ? '#f59e0b'
                              : '#6b7280',
                        },
                      ]}
                    >
                      {alert.priority.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertAction}>→ {alert.action}</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Nudge Modal */}
      <Modal
        visible={showNudgeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNudgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                💬 Nudge an {selectedMemberForNudge?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowNudgeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.nudgeLabel}>Wähle einen Ton:</Text>

            <TouchableOpacity
              style={styles.nudgeOption}
              onPress={() =>
                handleNudge(selectedMemberForNudge!.id, 'gentle')
              }
            >
              <Text style={styles.nudgeOptionEmoji}>😊</Text>
              <View style={styles.nudgeOptionInfo}>
                <Text style={styles.nudgeOptionTitle}>Sanft</Text>
                <Text style={styles.nudgeOptionDesc}>
                  Freundlicher Check-in ohne Druck
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nudgeOption}
              onPress={() =>
                handleNudge(selectedMemberForNudge!.id, 'direct')
              }
            >
              <Text style={styles.nudgeOptionEmoji}>⚡</Text>
              <View style={styles.nudgeOptionInfo}>
                <Text style={styles.nudgeOptionTitle}>Direkt</Text>
                <Text style={styles.nudgeOptionDesc}>
                  Klare Erwartung mit Hilfsangebot
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nudgeOption}
              onPress={() =>
                handleNudge(selectedMemberForNudge!.id, 'motivational')
              }
            >
              <Text style={styles.nudgeOptionEmoji}>🚀</Text>
              <View style={styles.nudgeOptionInfo}>
                <Text style={styles.nudgeOptionTitle}>Motivational</Text>
                <Text style={styles.nudgeOptionDesc}>
                  Ermutigung und Zuspruch
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.nudgeLabel}>Oder custom:</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Eigene Nachricht..."
              placeholderTextColor="#6b7280"
              value={customNudgeMessage}
              onChangeText={setCustomNudgeMessage}
              multiline
            />

            {customNudgeMessage.length > 0 && (
              <TouchableOpacity
                style={styles.sendCustomButton}
                onPress={() =>
                  handleNudge(selectedMemberForNudge!.id, 'gentle')
                }
              >
                <Text style={styles.sendCustomText}>Senden</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Agenda Modal */}
      <Modal
        visible={showAgendaModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAgendaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Meeting Agenda</Text>
              <TouchableOpacity onPress={() => setShowAgendaModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {agenda && (
              <ScrollView style={styles.agendaScroll}>
                <Text style={styles.agendaDate}>{agenda.meeting_date}</Text>
                <Text style={styles.agendaSummary}>{agenda.team_summary}</Text>

                {agenda.wins_to_celebrate.length > 0 && (
                  <View style={styles.agendaBlock}>
                    <Text style={styles.agendaBlockTitle}>🎉 Wins</Text>
                    {agenda.wins_to_celebrate.map((win, i) => (
                      <Text key={i} style={styles.agendaItem}>
                        • {win}
                      </Text>
                    ))}
                  </View>
                )}

                {agenda.challenges_to_address.length > 0 && (
                  <View style={styles.agendaBlock}>
                    <Text style={styles.agendaBlockTitle}>🎯 Challenges</Text>
                    {agenda.challenges_to_address.map((challenge, i) => (
                      <Text key={i} style={styles.agendaItem}>
                        • {challenge}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.focusBlock}>
                  <Text style={styles.focusLabel}>Fokus nächste Woche:</Text>
                  <Text style={styles.focusText}>
                    {agenda.focus_for_next_week}
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowAgendaModal(false)}
            >
              <Text style={styles.modalButtonText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 4,
  },
  agendaButton: {
    backgroundColor: '#2d2d44',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  agendaButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  topPerformerCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    gap: 16,
  },
  topStat: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  attentionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  attentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  attentionInfo: {
    flex: 1,
  },
  attentionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  attentionReason: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 2,
  },
  nudgeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  nudgeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#10b981',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeEmoji: {
    fontSize: 18,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  memberCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberInfo: {},
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  attentionBadge: {
    fontSize: 14,
  },
  memberLevel: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    padding: 12,
  },
  memberStat: {
    alignItems: 'center',
  },
  memberStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  memberStatLabel: {
    fontSize: 11,
    color: '#a0a0a0',
    marginTop: 2,
  },
  memberWarning: {
    marginTop: 12,
    fontSize: 12,
    color: '#f59e0b',
  },
  alertCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6b7280',
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
  noAccessCard: {
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  noAccessEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  noAccessText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 24,
    color: '#a0a0a0',
  },
  nudgeLabel: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 12,
    marginTop: 8,
  },
  nudgeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  nudgeOptionEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  nudgeOptionInfo: {
    flex: 1,
  },
  nudgeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  nudgeOptionDesc: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 2,
  },
  customInput: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendCustomButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  sendCustomText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  agendaScroll: {
    flex: 1,
  },
  agendaDate: {
    fontSize: 14,
    color: '#10b981',
    marginBottom: 8,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  modalButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

