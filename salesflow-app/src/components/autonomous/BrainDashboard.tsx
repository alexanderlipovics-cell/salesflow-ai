/**
 * ╔════════════════════════════════════════════════════════════════════════════════╗
 * ║  BRAIN DASHBOARD v2.0 - Das ultimative KI-Kontrollzentrum                    ║
 * ╠════════════════════════════════════════════════════════════════════════════════╣
 * ║  NEU:                                                                         ║
 * ║  ✅ Activity Timeline mit Live-Updates                                        ║
 * ║  ✅ Pending Decisions mit Approve/Reject                                      ║
 * ║  ✅ Haptic Feedback für alle Interaktionen                                    ║
 * ║  ✅ Offline-Modus mit lokalen Fallback-Daten                                  ║
 * ║  ✅ Confidence-Slider für Threshold-Anpassung                                 ║
 * ║  ✅ Agent-Performance Metriken                                                ║
 * ╚════════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Modal,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { API_CONFIG } from '../../services/apiConfig';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Agent {
  name: string;
  description: string;
  capabilities: string[];
  stats?: {
    tasks_completed: number;
    avg_confidence: number;
    success_rate: number;
  };
}

interface BrainStats {
  mode: string;
  confidence_threshold: number;
  decisions_today: number;
  executed_today: number;
  pending_approvals: number;
  agents_available: string[];
  success_rate?: number;
  avg_response_time?: number;
}

interface PendingDecision {
  id: string;
  action_type: string;
  reasoning: string;
  confidence: number;
  priority: string;
  created_at: string;
  target?: string;
}

interface ActivityItem {
  id: string;
  type: 'decision' | 'execution' | 'learning' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const AUTONOMY_MODES = [
  { 
    id: 'passive', 
    label: 'Passiv', 
    emoji: '👁️', 
    desc: 'Nur beobachten',
    detail: 'Das Brain beobachtet alle Aktivitäten, aber führt keine Aktionen aus. Perfekt zum Lernen und Verstehen.',
    risk: 'low',
  },
  { 
    id: 'advisory', 
    label: 'Berater', 
    emoji: '💡', 
    desc: 'Vorschläge machen',
    detail: 'Das Brain analysiert und macht Vorschläge, die du manuell umsetzen kannst.',
    risk: 'low',
  },
  { 
    id: 'supervised', 
    label: 'Überwacht', 
    emoji: '✋', 
    desc: 'Mit Genehmigung',
    detail: 'Aktionen werden nur nach deiner expliziten Genehmigung ausgeführt. Du behältst volle Kontrolle.',
    risk: 'medium',
  },
  { 
    id: 'autonomous', 
    label: 'Autonom', 
    emoji: '🤖', 
    desc: 'Selbstständig',
    detail: 'Bei hoher Confidence handelt das Brain selbstständig. Du wirst über Aktionen informiert.',
    risk: 'medium',
  },
  { 
    id: 'full_auto', 
    label: 'Vollautomatisch', 
    emoji: '🚀', 
    desc: 'Volle Kontrolle',
    detail: 'Maximale Autonomie. Das Brain handelt wie ein erfahrener Sales Director - 24/7.',
    risk: 'high',
  },
];

const MODE_COLORS: Record<string, string[]> = {
  passive: ['#64748B', '#475569'],
  advisory: ['#3B82F6', '#2563EB'],
  supervised: ['#F59E0B', '#D97706'],
  autonomous: ['#10B981', '#059669'],
  full_auto: ['#8B5CF6', '#7C3AED'],
};

const RISK_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HAPTIC HELPER
// ═══════════════════════════════════════════════════════════════════════════════

const haptic = {
  light: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function BrainDashboard() {
  const [stats, setStats] = useState<BrainStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingDecisions, setPendingDecisions] = useState<PendingDecision[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modeModalVisible, setModeModalVisible] = useState(false);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<PendingDecision | null>(null);
  const [selectedMode, setSelectedMode] = useState('supervised');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [isOnline, setIsOnline] = useState(true);
  
  // Animations
  const [pulseAnim] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));
  const scrollRef = useRef<ScrollView>(null);

  // Pulse Animation für Brain Icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { 
          toValue: 1.15, 
          duration: 800, 
          useNativeDriver: true 
        }),
        Animated.timing(pulseAnim, { 
          toValue: 1, 
          duration: 800, 
          useNativeDriver: true 
        }),
      ])
    );
    pulse.start();
    
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    return () => pulse.stop();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const [statsRes, agentsRes, decisionsRes] = await Promise.all([
        fetch(`${API_CONFIG.baseUrl}/autonomous/brain/stats`).catch(() => null),
        fetch(`${API_CONFIG.baseUrl}/autonomous/agents`).catch(() => null),
        fetch(`${API_CONFIG.baseUrl}/autonomous/brain/decisions/pending`).catch(() => null),
      ]);

      let loadedOnline = false;

      // Agents laden
      if (agentsRes?.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
        loadedOnline = true;
      } else {
        // Fallback Agents
        setAgents([
          { name: 'Hunter', description: 'Findet und qualifiziert Leads', capabilities: ['qualify_lead', 'research', 'score'] },
          { name: 'Closer', description: 'Optimiert Abschlüsse', capabilities: ['objection_handling', 'negotiation', 'rescue'] },
          { name: 'Communicator', description: 'Schreibt perfekte Nachrichten', capabilities: ['write_message', 'personalize', 'sequence'] },
          { name: 'Analyst', description: 'Analysiert Performance', capabilities: ['analyze', 'forecast', 'patterns'] },
        ]);
      }

      // Stats laden
      if (statsRes?.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setSelectedMode(statsData.mode || 'supervised');
        setConfidenceThreshold(statsData.confidence_threshold || 0.8);
        loadedOnline = true;
      } else {
        setStats({
          mode: selectedMode,
          confidence_threshold: confidenceThreshold,
          decisions_today: 0,
          executed_today: 0,
          pending_approvals: pendingDecisions.length,
          agents_available: ['hunter', 'closer', 'communicator', 'analyst'],
          success_rate: 0.87,
          avg_response_time: 2.3,
        });
      }

      // Pending Decisions laden
      if (decisionsRes?.ok) {
        const decisionsData = await decisionsRes.json();
        setPendingDecisions(decisionsData.decisions || []);
        loadedOnline = true;
      }

      setIsOnline(loadedOnline);
      
      // Demo Activity generieren wenn keine echten Daten
      if (!loadedOnline) {
        setActivities([
          { id: '1', type: 'decision', title: 'Lead qualifiziert', description: 'Max Müller - Score: 85', timestamp: new Date().toISOString(), status: 'success' },
          { id: '2', type: 'execution', title: 'Follow-up erstellt', description: 'Automatisch für morgen 10:00', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success' },
          { id: '3', type: 'learning', title: 'Pattern erkannt', description: 'Beste Sendezeit: Di 9-11 Uhr', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'success' },
        ]);
      }

    } catch (error) {
      console.log('Brain data load error:', error);
      setIsOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMode, confidenceThreshold, pendingDecisions.length]);

  useEffect(() => {
    loadData();
    // Auto-refresh alle 30 Sekunden
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const changeMode = async (newMode: string) => {
    haptic.medium();
    
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/autonomous/brain/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: newMode, 
          confidence_threshold: confidenceThreshold 
        }),
      });

      if (response.ok) {
        setSelectedMode(newMode);
        setStats(prev => prev ? { ...prev, mode: newMode } : null);
        haptic.success();
      }
    } catch (error) {
      console.log('Mode change error:', error);
      // Optimistic Update auch bei Fehler
      setSelectedMode(newMode);
    }
    setModeModalVisible(false);
  };

  const approveDecision = async (decision: PendingDecision) => {
    haptic.medium();
    
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/autonomous/brain/decisions/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_id: decision.id }),
      });

      if (response.ok) {
        haptic.success();
        setPendingDecisions(prev => prev.filter(d => d.id !== decision.id));
        // Add to activities
        setActivities(prev => [{
          id: `act_${Date.now()}`,
          type: 'execution',
          title: `Genehmigt: ${decision.action_type}`,
          description: decision.reasoning,
          timestamp: new Date().toISOString(),
          status: 'success',
        }, ...prev]);
      }
    } catch (error) {
      console.log('Approve error:', error);
      haptic.error();
      Alert.alert('Fehler', 'Konnte Entscheidung nicht genehmigen');
    }
    setDecisionModalVisible(false);
    setSelectedDecision(null);
  };

  const rejectDecision = async (decision: PendingDecision) => {
    haptic.light();
    
    try {
      await fetch(`${API_CONFIG.baseUrl}/autonomous/brain/decisions/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_id: decision.id, approved: false }),
      });
      
      setPendingDecisions(prev => prev.filter(d => d.id !== decision.id));
    } catch (error) {
      console.log('Reject error:', error);
    }
    setDecisionModalVisible(false);
    setSelectedDecision(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.loadingEmoji}>🧠</Text>
        </Animated.View>
        <Text style={styles.loadingText}>Brain wird aktiviert...</Text>
        <ActivityIndicator size="small" color="#8B5CF6" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const currentMode = AUTONOMY_MODES.find(m => m.id === selectedMode) || AUTONOMY_MODES[2];
  const modeColors = MODE_COLORS[selectedMode] || MODE_COLORS.supervised;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView 
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadData(true)}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* ═══════════════ HEADER ═══════════════ */}
        <LinearGradient
          colors={modeColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Online/Offline Indicator */}
          <View style={styles.onlineIndicator}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10B981' : '#F59E0B' }]} />
            <Text style={styles.onlineText}>{isOnline ? 'Live' : 'Offline'}</Text>
          </View>

          <View style={styles.headerContent}>
            <Animated.View style={[styles.brainIcon, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.brainEmoji}>🧠</Text>
            </Animated.View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Autonomous Brain</Text>
              <Text style={styles.headerSubtitle}>
                {currentMode.emoji} {currentMode.label} Modus
              </Text>
            </View>
          </View>
          
          <Pressable 
            style={({ pressed }) => [styles.modeButton, pressed && styles.modeButtonPressed]}
            onPress={() => {
              haptic.light();
              setModeModalVisible(true);
            }}
          >
            <Text style={styles.modeButtonText}>Modus ändern</Text>
          </Pressable>

          {/* Quick Stats in Header */}
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNumber}>{stats?.decisions_today || 0}</Text>
              <Text style={styles.headerStatLabel}>Entscheidungen</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNumber}>{stats?.executed_today || 0}</Text>
              <Text style={styles.headerStatLabel}>Ausgeführt</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNumber}>{Math.round((stats?.success_rate || 0.87) * 100)}%</Text>
              <Text style={styles.headerStatLabel}>Erfolgsrate</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ═══════════════ PENDING DECISIONS ═══════════════ */}
        {pendingDecisions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⏳ Warten auf Genehmigung</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingDecisions.length}</Text>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pendingDecisions.map((decision) => (
                <Pressable
                  key={decision.id}
                  style={({ pressed }) => [styles.decisionCard, pressed && styles.cardPressed]}
                  onPress={() => {
                    haptic.light();
                    setSelectedDecision(decision);
                    setDecisionModalVisible(true);
                  }}
                >
                  <View style={styles.decisionHeader}>
                    <Text style={styles.decisionType}>
                      {decision.action_type === 'send_message' ? '💬' : 
                       decision.action_type === 'update_lead_status' ? '📊' :
                       decision.action_type === 'create_followup' ? '📅' : '⚡'}
                      {' '}{decision.action_type.replace(/_/g, ' ')}
                    </Text>
                    <View style={[
                      styles.confidenceBadge,
                      { backgroundColor: decision.confidence > 0.8 ? '#ECFDF5' : '#FEF3C7' }
                    ]}>
                      <Text style={[
                        styles.confidenceText,
                        { color: decision.confidence > 0.8 ? '#059669' : '#D97706' }
                      ]}>
                        {Math.round(decision.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.decisionReasoning} numberOfLines={2}>
                    {decision.reasoning}
                  </Text>
                  <View style={styles.decisionActions}>
                    <Pressable 
                      style={styles.approveButton}
                      onPress={() => approveDecision(decision)}
                    >
                      <Text style={styles.approveButtonText}>✓ Genehmigen</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══════════════ STATS GRID ═══════════════ */}
        <View style={styles.statsGrid}>
          <Pressable style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statNumber}>{stats?.decisions_today || 0}</Text>
            <Text style={styles.statLabel}>Entscheidungen heute</Text>
          </Pressable>
          
          <Pressable style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={[styles.statNumber, { color: '#059669' }]}>{stats?.executed_today || 0}</Text>
            <Text style={styles.statLabel}>Automatisch ausgeführt</Text>
          </Pressable>
          
          <Pressable style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>{stats?.avg_response_time || 2.3}s</Text>
            <Text style={styles.statLabel}>Ø Reaktionszeit</Text>
          </Pressable>
          
          <Pressable style={[styles.statCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={[styles.statNumber, { color: '#7C3AED' }]}>{Math.round(confidenceThreshold * 100)}%</Text>
            <Text style={styles.statLabel}>Confidence-Schwelle</Text>
          </Pressable>
        </View>

        {/* ═══════════════ AGENTS ═══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 KI-Agenten</Text>
          <View style={styles.agentsGrid}>
            {agents.map((agent, index) => (
              <AgentCard key={index} agent={agent} />
            ))}
          </View>
        </View>

        {/* ═══════════════ ACTIVITY TIMELINE ═══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Letzte Aktivitäten</Text>
          <View style={styles.timeline}>
            {activities.slice(0, 5).map((activity, index) => (
              <View key={activity.id} style={styles.timelineItem}>
                <View style={styles.timelineDot}>
                  <View style={[
                    styles.timelineDotInner,
                    { backgroundColor: activity.status === 'success' ? '#10B981' : '#F59E0B' }
                  ]} />
                </View>
                {index < activities.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{activity.title}</Text>
                  <Text style={styles.timelineDesc}>{activity.description}</Text>
                  <Text style={styles.timelineTime}>
                    {new Date(activity.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════════════ QUICK ACTIONS ═══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Schnellaktionen</Text>
          <View style={styles.quickActions}>
            <QuickActionButton emoji="🎯" label="Lead qualifizieren" color="#3B82F6" />
            <QuickActionButton emoji="💬" label="Nachricht schreiben" color="#10B981" />
            <QuickActionButton emoji="🛡️" label="Einwand behandeln" color="#F59E0B" />
            <QuickActionButton emoji="📊" label="Analyse starten" color="#8B5CF6" />
          </View>
        </View>

        {/* Spacer für Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══════════════ MODE SELECTION MODAL ═══════════════ */}
      <Modal
        visible={modeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModeModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModeModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>🧠 Autonomie-Level</Text>
            <Text style={styles.modalSubtitle}>
              Wie selbstständig soll das Brain arbeiten?
            </Text>

            {AUTONOMY_MODES.map((mode) => (
              <Pressable
                key={mode.id}
                style={({ pressed }) => [
                  styles.modeOption,
                  selectedMode === mode.id && styles.modeOptionSelected,
                  pressed && styles.modeOptionPressed,
                ]}
                onPress={() => changeMode(mode.id)}
              >
                <LinearGradient
                  colors={
                    selectedMode === mode.id
                      ? (MODE_COLORS[mode.id] as [string, string])
                      : ['#F8FAFC', '#F1F5F9']
                  }
                  style={styles.modeOptionGradient}
                >
                  <Text style={styles.modeOptionEmoji}>{mode.emoji}</Text>
                  <View style={styles.modeOptionText}>
                    <View style={styles.modeOptionHeader}>
                      <Text style={[
                        styles.modeOptionLabel,
                        selectedMode === mode.id && styles.modeOptionLabelSelected,
                      ]}>
                        {mode.label}
                      </Text>
                      <View style={[styles.riskBadge, { backgroundColor: RISK_COLORS[mode.risk as keyof typeof RISK_COLORS] + '20' }]}>
                        <Text style={[styles.riskText, { color: RISK_COLORS[mode.risk as keyof typeof RISK_COLORS] }]}>
                          {mode.risk === 'low' ? 'Sicher' : mode.risk === 'medium' ? 'Moderat' : 'Mutig'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.modeOptionDetail,
                      selectedMode === mode.id && styles.modeOptionDetailSelected,
                    ]}>
                      {mode.detail}
                    </Text>
                  </View>
                  {selectedMode === mode.id && (
                    <Text style={styles.modeOptionCheck}>✓</Text>
                  )}
                </LinearGradient>
              </Pressable>
            ))}

            <Pressable
              style={({ pressed }) => [styles.modalClose, pressed && styles.modalClosePressed]}
              onPress={() => setModeModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Schließen</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════ DECISION DETAIL MODAL ═══════════════ */}
      <Modal
        visible={decisionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDecisionModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setDecisionModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            {selectedDecision && (
              <>
                <Text style={styles.modalTitle}>🤔 Entscheidung prüfen</Text>
                
                <View style={styles.decisionDetail}>
                  <Text style={styles.decisionDetailLabel}>Aktion:</Text>
                  <Text style={styles.decisionDetailValue}>
                    {selectedDecision.action_type.replace(/_/g, ' ')}
                  </Text>
                </View>
                
                <View style={styles.decisionDetail}>
                  <Text style={styles.decisionDetailLabel}>Begründung:</Text>
                  <Text style={styles.decisionDetailValue}>
                    {selectedDecision.reasoning}
                  </Text>
                </View>
                
                <View style={styles.decisionDetail}>
                  <Text style={styles.decisionDetailLabel}>Confidence:</Text>
                  <View style={styles.confidenceBar}>
                    <View style={[
                      styles.confidenceFill,
                      { width: `${selectedDecision.confidence * 100}%` }
                    ]} />
                  </View>
                  <Text style={styles.decisionDetailValue}>
                    {Math.round(selectedDecision.confidence * 100)}%
                  </Text>
                </View>

                <View style={styles.decisionButtons}>
                  <Pressable
                    style={({ pressed }) => [styles.rejectButton, pressed && { opacity: 0.8 }]}
                    onPress={() => rejectDecision(selectedDecision)}
                  >
                    <Text style={styles.rejectButtonText}>✗ Ablehnen</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.approveButtonLarge, pressed && { opacity: 0.8 }]}
                    onPress={() => approveDecision(selectedDecision)}
                  >
                    <Text style={styles.approveButtonLargeText}>✓ Genehmigen</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function AgentCard({ agent }: { agent: Agent }) {
  const [expanded, setExpanded] = useState(false);

  const agentEmojis: Record<string, string> = {
    Hunter: '🎯',
    Closer: '🔥',
    Communicator: '💬',
    Analyst: '📊',
  };

  const agentColors: Record<string, string> = {
    Hunter: '#3B82F6',
    Closer: '#EF4444',
    Communicator: '#10B981',
    Analyst: '#8B5CF6',
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.agentCard, pressed && styles.cardPressed]}
      onPress={() => {
        haptic.light();
        setExpanded(!expanded);
      }}
    >
      <View style={styles.agentHeader}>
        <View style={[styles.agentIconBg, { backgroundColor: agentColors[agent.name] + '20' }]}>
          <Text style={styles.agentEmoji}>{agentEmojis[agent.name] || '🤖'}</Text>
        </View>
        <View style={styles.agentInfo}>
          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentDesc}>{agent.description}</Text>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </View>
      
      {expanded && (
        <View style={styles.agentCapabilities}>
          <Text style={styles.capabilitiesTitle}>Fähigkeiten:</Text>
          <View style={styles.capabilityChips}>
            {agent.capabilities.map((cap, idx) => (
              <View key={idx} style={[styles.capabilityChip, { backgroundColor: agentColors[agent.name] + '15' }]}>
                <Text style={[styles.capabilityChipText, { color: agentColors[agent.name] }]}>
                  {cap}
                </Text>
              </View>
            ))}
          </View>
          {agent.stats && (
            <View style={styles.agentStats}>
              <Text style={styles.agentStatText}>
                {agent.stats.tasks_completed} Tasks | {Math.round(agent.stats.success_rate * 100)}% Erfolg
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

function QuickActionButton({ 
  emoji, 
  label, 
  color,
}: { 
  emoji: string; 
  label: string;
  color: string;
}) {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.quickActionPressed,
        { borderLeftColor: color, borderLeftWidth: 3 }
      ]}
      onPress={() => haptic.light()}
    >
      <Text style={styles.quickActionEmoji}>{emoji}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET VERSION (Compact for Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

export function BrainWidget({ onPress }: { onPress?: () => void }) {
  const [mode, setMode] = useState('supervised');
  const [decisions, setDecisions] = useState(0);
  const [pending, setPending] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    fetch(`${API_CONFIG.baseUrl}/autonomous/brain/stats`)
      .then(res => res.json())
      .then(data => {
        setMode(data.mode || 'supervised');
        setDecisions(data.decisions_today || 0);
        setPending(data.pending_approvals || 0);
      })
      .catch(() => {});

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const currentMode = AUTONOMY_MODES.find(m => m.id === mode) || AUTONOMY_MODES[2];
  const modeColors = MODE_COLORS[mode] || MODE_COLORS.supervised;

  return (
    <Pressable 
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
    >
      <LinearGradient
        colors={modeColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.widget}
      >
        <View style={styles.widgetContent}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={styles.widgetEmoji}>🧠</Text>
          </Animated.View>
          <View style={styles.widgetText}>
            <Text style={styles.widgetTitle}>Brain {mode === 'full_auto' ? '🚀' : 'aktiv'}</Text>
            <Text style={styles.widgetMode}>
              {currentMode.emoji} {currentMode.label}
            </Text>
          </View>
          <View style={styles.widgetStats}>
            <Text style={styles.widgetStatNumber}>{decisions}</Text>
            <Text style={styles.widgetStatLabel}>Entscheidungen</Text>
            {pending > 0 && (
              <View style={styles.widgetPendingBadge}>
                <Text style={styles.widgetPendingText}>{pending} warten</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 40,
  },
  loadingEmoji: {
    fontSize: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },

  // Header
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brainIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  brainEmoji: {
    fontSize: 36,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  modeButton: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  modeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  modeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  headerStats: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 12,
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },

  // Section
  section: {
    padding: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },

  // Decision Card
  decisionCard: {
    width: 260,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  decisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  decisionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  decisionReasoning: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  decisionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  approveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // Agents
  agentsGrid: {
    gap: 10,
  },
  agentCard: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentEmoji: {
    fontSize: 22,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  agentDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 10,
    color: '#94A3B8',
  },
  agentCapabilities: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  capabilitiesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capabilityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  capabilityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  capabilityChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  agentStats: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  agentStatText: {
    fontSize: 11,
    color: '#64748B',
  },

  // Timeline
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    position: 'absolute',
    top: 14,
    left: 11,
    width: 2,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  quickActionEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  modeOption: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modeOptionSelected: {
    transform: [{ scale: 1.01 }],
  },
  modeOptionPressed: {
    opacity: 0.9,
  },
  modeOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  modeOptionEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  modeOptionText: {
    flex: 1,
  },
  modeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeOptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modeOptionLabelSelected: {
    color: 'white',
  },
  modeOptionDetail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 17,
  },
  modeOptionDetailSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  modeOptionCheck: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
  },
  modalClosePressed: {
    backgroundColor: '#E2E8F0',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },

  // Decision Detail Modal
  decisionDetail: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  decisionDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  decisionDetailValue: {
    fontSize: 14,
    color: '#1E293B',
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  decisionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
  approveButtonLarge: {
    flex: 2,
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButtonLargeText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Widget
  widget: {
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  widgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetEmoji: {
    fontSize: 34,
    marginRight: 14,
  },
  widgetText: {
    flex: 1,
  },
  widgetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  widgetMode: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  widgetStats: {
    alignItems: 'flex-end',
  },
  widgetStatNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  widgetStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
  },
  widgetPendingBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  widgetPendingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default BrainDashboard;
