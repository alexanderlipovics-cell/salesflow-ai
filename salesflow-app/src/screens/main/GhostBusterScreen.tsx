/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  GHOST BUSTER SCREEN                                                       ║
 * ║  Re-Engagement für Leads die nicht antworten                              ║
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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useGhostBuster } from '../../hooks/useGhostBuster';
import { GhostBusterCard } from '../../components/chief-v3';
import type { Ghost, GhostDetail } from '../../api/chiefV3';

interface GhostBusterScreenProps {
  navigation: any;
}

export default function GhostBusterScreen({ navigation }: GhostBusterScreenProps) {
  const { user } = useAuth();
  const {
    ghosts,
    selectedGhost,
    report,
    reEngageMessage,
    loading,
    error,
    softGhosts,
    hardGhosts,
    deepGhosts,
    totalGhosts,
    loadGhosts,
    loadGhostDetail,
    loadReport,
    generateMessage,
    markSent,
    skipGhost,
    breakup,
    snooze,
    clearSelection,
  } = useGhostBuster();

  const [activeTab, setActiveTab] = useState<'all' | 'soft' | 'hard' | 'deep'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedGhostForAction, setSelectedGhostForAction] = useState<Ghost | null>(null);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGhosts();
    setRefreshing(false);
  }, [loadGhosts]);

  // Filter Ghosts
  const getFilteredGhosts = () => {
    switch (activeTab) {
      case 'soft': return softGhosts;
      case 'hard': return hardGhosts;
      case 'deep': return deepGhosts;
      default: return ghosts;
    }
  };

  const filteredGhosts = getFilteredGhosts();

  // Handlers
  const handleGhostPress = async (ghost: Ghost) => {
    setSelectedGhostForAction(ghost);
    await loadGhostDetail(ghost.id);
  };

  const handleGenerateMessage = async (ghostId: string) => {
    await generateMessage(ghostId);
  };

  const handleSend = async (ghostId: string, message: string) => {
    await markSent(ghostId, message);
    setSelectedGhostForAction(null);
  };

  const handleSkip = async (ghostId: string, reason: string) => {
    await skipGhost(ghostId, reason);
    setSelectedGhostForAction(null);
  };

  const handleBreakup = async (ghostId: string) => {
    await breakup(ghostId);
    setSelectedGhostForAction(null);
  };

  const handleSnooze = async (ghostId: string, days: number) => {
    await snooze(ghostId, days);
    setSelectedGhostForAction(null);
  };

  // Show Report
  const handleShowReport = async () => {
    await loadReport();
    setShowReportModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👻 Ghost Buster</Text>
          <Text style={styles.headerSubtitle}>
            {totalGhosts} Ghosts warten auf dich
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={handleShowReport}
        >
          <Text style={styles.reportButtonText}>📊</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>
            {softGhosts.length}
          </Text>
          <Text style={styles.statLabel}>Soft</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {hardGhosts.length}
          </Text>
          <Text style={styles.statLabel}>Hard</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6b7280' }]}>
            {deepGhosts.length}
          </Text>
          <Text style={styles.statLabel}>Deep</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              Alle ({totalGhosts})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'soft' && styles.tabActive]}
            onPress={() => setActiveTab('soft')}
          >
            <Text style={[styles.tabText, activeTab === 'soft' && styles.tabTextActive]}>
              👻 Soft ({softGhosts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'hard' && styles.tabActive]}
            onPress={() => setActiveTab('hard')}
          >
            <Text style={[styles.tabText, activeTab === 'hard' && styles.tabTextActive]}>
              💀 Hard ({hardGhosts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'deep' && styles.tabActive]}
            onPress={() => setActiveTab('deep')}
          >
            <Text style={[styles.tabText, activeTab === 'deep' && styles.tabTextActive]}>
              ⚰️ Deep ({deepGhosts.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Ghost List */}
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
        {loading && filteredGhosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⏳</Text>
            <Text style={styles.emptyText}>Lade Ghosts...</Text>
          </View>
        ) : filteredGhosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>Keine Ghosts!</Text>
            <Text style={styles.emptyText}>
              Super! Gerade niemand der nicht antwortet.
            </Text>
          </View>
        ) : (
          filteredGhosts.map((ghost) => (
            <GhostBusterCard
              key={ghost.id}
              ghost={
                selectedGhostForAction?.id === ghost.id && selectedGhost
                  ? selectedGhost
                  : ghost
              }
              message={
                selectedGhostForAction?.id === ghost.id ? reEngageMessage : null
              }
              loading={loading && selectedGhostForAction?.id === ghost.id}
              expanded={selectedGhostForAction?.id === ghost.id}
              onGenerateMessage={() => handleGenerateMessage(ghost.id)}
              onSend={(msg) => handleSend(ghost.id, msg)}
              onSkip={(reason) => handleSkip(ghost.id, reason)}
              onBreakup={() => handleBreakup(ghost.id)}
              onSnooze={(days) => handleSnooze(ghost.id, days)}
            />
          ))
        )}

        {/* Tips */}
        {filteredGhosts.length > 0 && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Ghost-Buster Tips</Text>
            <Text style={styles.tipItem}>
              • Soft Ghosts zuerst - höchste Reaktivierungs-Chance
            </Text>
            <Text style={styles.tipItem}>
              • Bei Hard Ghosts: Pattern Interrupt nutzen (Humor, Takeaway)
            </Text>
            <Text style={styles.tipItem}>
              • Deep Ghosts: Breakup-Message oder Archivieren
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Ghost Report</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {report && (
              <ScrollView style={styles.reportScroll}>
                {/* Stats Grid */}
                <View style={styles.reportStatsGrid}>
                  <View style={styles.reportStatCard}>
                    <Text style={styles.reportStatValue}>{report.total_ghosts}</Text>
                    <Text style={styles.reportStatLabel}>Gesamt</Text>
                  </View>
                  <View style={[styles.reportStatCard, { backgroundColor: '#f59e0b20' }]}>
                    <Text style={[styles.reportStatValue, { color: '#f59e0b' }]}>
                      {report.soft_ghosts}
                    </Text>
                    <Text style={styles.reportStatLabel}>Soft</Text>
                  </View>
                  <View style={[styles.reportStatCard, { backgroundColor: '#ef444420' }]}>
                    <Text style={[styles.reportStatValue, { color: '#ef4444' }]}>
                      {report.hard_ghosts}
                    </Text>
                    <Text style={styles.reportStatLabel}>Hard</Text>
                  </View>
                  <View style={[styles.reportStatCard, { backgroundColor: '#6b728020' }]}>
                    <Text style={[styles.reportStatValue, { color: '#6b7280' }]}>
                      {report.deep_ghosts}
                    </Text>
                    <Text style={styles.reportStatLabel}>Deep</Text>
                  </View>
                </View>

                {/* Report Text */}
                <View style={styles.reportTextCard}>
                  <Text style={styles.reportText}>{report.report_text}</Text>
                </View>

                {/* Top Priority */}
                {report.top_priority.length > 0 && (
                  <View style={styles.prioritySection}>
                    <Text style={styles.priorityTitle}>🎯 Top-Priorität</Text>
                    {report.top_priority.map((ghost, i) => (
                      <View key={ghost.id} style={styles.priorityItem}>
                        <Text style={styles.priorityRank}>#{i + 1}</Text>
                        <View style={styles.priorityInfo}>
                          <Text style={styles.priorityName}>{ghost.name}</Text>
                          <Text style={styles.priorityMeta}>
                            {ghost.platform} • {ghost.hours}h • {Math.round(ghost.probability * 100)}% Chance
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowReportModal(false)}
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
    color: '#a0a0a0',
    marginTop: 4,
  },
  reportButton: {
    width: 44,
    height: 44,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 20,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2d2d44',
  },
  tabsContainer: {
    backgroundColor: '#0f0f1a',
  },
  tabs: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    fontSize: 14,
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
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  tipsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 13,
    color: '#a0a0a0',
    marginBottom: 8,
    lineHeight: 18,
  },
  // Modal Styles
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
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 24,
    color: '#a0a0a0',
    padding: 4,
  },
  reportScroll: {
    flex: 1,
  },
  reportStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  reportStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  reportStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportStatLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 4,
  },
  reportTextCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  reportText: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
  prioritySection: {
    marginBottom: 20,
  },
  priorityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  priorityRank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginRight: 12,
  },
  priorityInfo: {
    flex: 1,
  },
  priorityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  priorityMeta: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 2,
  },
  modalButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

