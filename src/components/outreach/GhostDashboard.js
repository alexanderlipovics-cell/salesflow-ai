/**
 * Ghost Dashboard - Übersicht aller "Ghosts" (gelesen aber keine Antwort)
 * 
 * Zeigt:
 * - Ghost-Summary Cards
 * - Anstehende Follow-ups mit generierten Nachrichten
 * - Quick-Actions (Senden, Überspringen, Später)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  getGhostSummary,
  getGhosts,
  getFollowupQueue,
  processFollowup,
  generateFollowupMessage,
  markAsReplied,
  PLATFORMS,
  STATUSES,
  formatGhostTime,
} from '../../services/outreachService';

export default function GhostDashboard({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [ghosts, setGhosts] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedGhost, setSelectedGhost] = useState(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  
  const loadData = useCallback(async () => {
    try {
      const [summaryRes, ghostsRes, queueRes] = await Promise.all([
        getGhostSummary(user?.access_token),
        getGhosts({}, user?.access_token),
        getFollowupQueue(20, user?.access_token),
      ]);
      
      setSummary(summaryRes.summary);
      setGhosts(ghostsRes.ghosts || []);
      setQueue(queueRes.queue || []);
    } catch (error) {
      console.error('GhostDashboard Error:', error);
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
  
  const handleGenerateMessage = async (ghost) => {
    setSelectedGhost(ghost);
    setGenerating(true);
    setGeneratedMessage('');
    
    try {
      const result = await generateFollowupMessage(
        ghost.id,
        null,
        user?.access_token
      );
      setGeneratedMessage(result.message);
    } catch (error) {
      Alert.alert('Fehler', 'Nachricht konnte nicht generiert werden');
    } finally {
      setGenerating(false);
    }
  };
  
  const handleCopyMessage = async () => {
    try {
      await Clipboard.setString(generatedMessage);
      Alert.alert('Kopiert! 📋', 'Nachricht in die Zwischenablage kopiert');
    } catch (error) {
      console.error('Copy Error:', error);
    }
  };
  
  const handleOpenPlatform = () => {
    if (!selectedGhost) return;
    
    const platform = selectedGhost.platform;
    const handle = selectedGhost.contact_handle;
    
    let url = '';
    
    switch (platform) {
      case 'instagram':
        url = handle ? `instagram://user?username=${handle.replace('@', '')}` : 'instagram://';
        break;
      case 'whatsapp':
        url = 'whatsapp://';
        break;
      case 'linkedin':
        url = selectedGhost.contact_profile_url || 'linkedin://';
        break;
      case 'facebook':
        url = 'fb://';
        break;
      default:
        return;
    }
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };
  
  const handleMarkAsSent = async (queueItem) => {
    try {
      await processFollowup(queueItem.id, 'send', {}, user?.access_token);
      loadData();
      setSelectedGhost(null);
      setGeneratedMessage('');
    } catch (error) {
      Alert.alert('Fehler', 'Konnte nicht als gesendet markiert werden');
    }
  };
  
  const handleSnooze = async (queueItem, hours = 24) => {
    try {
      await processFollowup(queueItem.id, 'snooze', { snooze_hours: hours }, user?.access_token);
      loadData();
    } catch (error) {
      Alert.alert('Fehler', 'Konnte nicht verschoben werden');
    }
  };
  
  const handleSkip = async (queueItem, reason = 'Nicht relevant') => {
    try {
      await processFollowup(queueItem.id, 'skip', { skip_reason: reason }, user?.access_token);
      loadData();
    } catch (error) {
      Alert.alert('Fehler', 'Konnte nicht übersprungen werden');
    }
  };
  
  const handleGotReply = async (ghost, isPositive = null) => {
    try {
      await markAsReplied(ghost.id, isPositive, user?.access_token);
      Alert.alert('Super! 🎉', isPositive ? 'Interesse markiert!' : 'Antwort markiert!');
      loadData();
      setSelectedGhost(null);
      setGeneratedMessage('');
    } catch (error) {
      Alert.alert('Fehler', 'Status konnte nicht aktualisiert werden');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Ghosts laden...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👻 Ghost Tracker</Text>
        <Text style={styles.headerSubtitle}>
          Gelesen aber keine Antwort
        </Text>
      </View>
      
      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardGhost]}>
            <Text style={styles.summaryNumber}>{summary.total_ghosts}</Text>
            <Text style={styles.summaryLabel}>Ghosts</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardQueue]}>
            <Text style={styles.summaryNumber}>{summary.pending_followups}</Text>
            <Text style={styles.summaryLabel}>Follow-ups</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardWin]}>
            <Text style={styles.summaryNumber}>{summary.ghosts_converted_this_week}</Text>
            <Text style={styles.summaryLabel}>Konvertiert</Text>
          </View>
        </View>
      )}
      
      {/* Platform Breakdown */}
      {summary?.by_platform && Object.keys(summary.by_platform).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nach Plattform</Text>
          <View style={styles.platformRow}>
            {Object.entries(summary.by_platform).map(([platform, count]) => (
              <View key={platform} style={styles.platformBadge}>
                <Text style={styles.platformIcon}>{PLATFORMS[platform]?.icon}</Text>
                <Text style={styles.platformCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* Follow-up Queue */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🔥 Jetzt nachfassen ({queue.length})
        </Text>
        
        {queue.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyText}>Keine Follow-ups fällig!</Text>
            <Text style={styles.emptySubtext}>
              Du bist up-to-date. Weiter so!
            </Text>
          </View>
        ) : (
          queue.map((item) => {
            const ghost = item.outreach_messages;
            if (!ghost) return null;
            
            return (
              <View key={item.id} style={styles.queueCard}>
                <View style={styles.queueHeader}>
                  <View style={styles.queueContact}>
                    <Text style={styles.platformBadgeSmall}>
                      {PLATFORMS[ghost.platform]?.icon}
                    </Text>
                    <View>
                      <Text style={styles.contactName}>{ghost.contact_name}</Text>
                      {ghost.contact_handle && (
                        <Text style={styles.contactHandle}>{ghost.contact_handle}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.ghostBadge}>
                    <Text style={styles.ghostBadgeText}>
                      👻 {formatGhostTime(item.context?.ghost_hours || 24)}
                    </Text>
                  </View>
                </View>
                
                {ghost.message_preview && (
                  <Text style={styles.originalMessage} numberOfLines={2}>
                    "{ghost.message_preview}"
                  </Text>
                )}
                
                {/* Suggested Message */}
                {item.suggested_message && (
                  <View style={styles.suggestedBox}>
                    <Text style={styles.suggestedLabel}>💡 Vorschlag:</Text>
                    <Text style={styles.suggestedMessage}>
                      {item.suggested_message}
                    </Text>
                  </View>
                )}
                
                {/* Actions */}
                <View style={styles.queueActions}>
                  <Pressable 
                    style={styles.actionBtnPrimary}
                    onPress={() => handleGenerateMessage(ghost)}
                  >
                    <Text style={styles.actionBtnPrimaryText}>✨ Generieren</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.actionBtn}
                    onPress={() => handleSnooze(item, 24)}
                  >
                    <Text style={styles.actionBtnText}>⏰ Später</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.actionBtn}
                    onPress={() => handleSkip(item)}
                  >
                    <Text style={styles.actionBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
      
      {/* All Ghosts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Alle Ghosts ({ghosts.length})
        </Text>
        
        {ghosts.slice(0, 10).map((ghost) => (
          <Pressable 
            key={ghost.id} 
            style={styles.ghostRow}
            onPress={() => handleGenerateMessage(ghost)}
          >
            <Text style={styles.ghostPlatform}>
              {PLATFORMS[ghost.platform]?.icon}
            </Text>
            <View style={styles.ghostInfo}>
              <Text style={styles.ghostName}>{ghost.contact_name}</Text>
              <Text style={styles.ghostHandle}>{ghost.contact_handle || ghost.platform}</Text>
            </View>
            <Text style={styles.ghostTime}>
              {formatGhostTime(ghost.ghost_hours)}
            </Text>
          </Pressable>
        ))}
        
        {ghosts.length > 10 && (
          <Pressable style={styles.showMoreBtn}>
            <Text style={styles.showMoreText}>
              + {ghosts.length - 10} weitere anzeigen
            </Text>
          </Pressable>
        )}
      </View>
      
      {/* Generated Message Modal/Card */}
      {selectedGhost && (
        <View style={styles.generatorOverlay}>
          <View style={styles.generatorCard}>
            <View style={styles.generatorHeader}>
              <Text style={styles.generatorTitle}>
                {PLATFORMS[selectedGhost.platform]?.icon} {selectedGhost.contact_name}
              </Text>
              <Pressable onPress={() => {
                setSelectedGhost(null);
                setGeneratedMessage('');
              }}>
                <Text style={styles.generatorClose}>✕</Text>
              </Pressable>
            </View>
            
            {generating ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator color="#10b981" />
                <Text style={styles.generatingText}>Generiere Nachricht...</Text>
              </View>
            ) : generatedMessage ? (
              <>
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{generatedMessage}</Text>
                </View>
                
                <View style={styles.generatorActions}>
                  <Pressable 
                    style={styles.copyBtn}
                    onPress={handleCopyMessage}
                  >
                    <Text style={styles.copyBtnText}>📋 Kopieren</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.openBtn}
                    onPress={handleOpenPlatform}
                  >
                    <Text style={styles.openBtnText}>
                      {PLATFORMS[selectedGhost.platform]?.icon} Öffnen
                    </Text>
                  </Pressable>
                </View>
                
                <View style={styles.outcomeRow}>
                  <Text style={styles.outcomeLabel}>Nach dem Senden:</Text>
                  <View style={styles.outcomeActions}>
                    <Pressable 
                      style={styles.outcomeBtn}
                      onPress={() => handleGotReply(selectedGhost, true)}
                    >
                      <Text style={styles.outcomeBtnText}>✅ Interesse!</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.outcomeBtn}
                      onPress={() => handleGotReply(selectedGhost, null)}
                    >
                      <Text style={styles.outcomeBtnText}>💬 Antwort</Text>
                    </Pressable>
                    <Pressable 
                      style={styles.outcomeBtn}
                      onPress={() => handleGotReply(selectedGhost, false)}
                    >
                      <Text style={styles.outcomeBtnText}>❌ Absage</Text>
                    </Pressable>
                  </View>
                </View>
                
                <Pressable 
                  style={styles.regenerateBtn}
                  onPress={() => handleGenerateMessage(selectedGhost)}
                >
                  <Text style={styles.regenerateBtnText}>🔄 Neu generieren</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      )}
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  
  // Header
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  
  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryCardGhost: {
    backgroundColor: '#f97316',
  },
  summaryCardQueue: {
    backgroundColor: '#3b82f6',
  },
  summaryCardWin: {
    backgroundColor: '#10b981',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  
  // Section
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
  },
  
  // Platform Row
  platformRow: {
    flexDirection: 'row',
    gap: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  platformIcon: {
    fontSize: 16,
  },
  platformCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  
  // Queue Card
  queueCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  queueContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  platformBadgeSmall: {
    fontSize: 24,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  contactHandle: {
    fontSize: 13,
    color: '#64748b',
  },
  ghostBadge: {
    backgroundColor: '#f97316',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ghostBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  originalMessage: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  suggestedBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  suggestedLabel: {
    fontSize: 12,
    color: '#10b981',
    marginBottom: 6,
  },
  suggestedMessage: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  queueActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#334155',
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  
  // Ghost Row
  ghostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  ghostPlatform: {
    fontSize: 20,
  },
  ghostInfo: {
    flex: 1,
  },
  ghostName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f8fafc',
  },
  ghostHandle: {
    fontSize: 12,
    color: '#64748b',
  },
  ghostTime: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '600',
  },
  showMoreBtn: {
    padding: 14,
    alignItems: 'center',
  },
  showMoreText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  
  // Generator Overlay
  generatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  generatorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
  },
  generatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  generatorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  generatorClose: {
    fontSize: 20,
    color: '#64748b',
    padding: 4,
  },
  generatingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  generatingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  messageBox: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  messageText: {
    fontSize: 15,
    color: '#f8fafc',
    lineHeight: 22,
  },
  generatorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  openBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  openBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  outcomeRow: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  outcomeLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  outcomeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  outcomeBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  outcomeBtnText: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  regenerateBtn: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  regenerateBtnText: {
    color: '#3b82f6',
    fontSize: 14,
  },
});

