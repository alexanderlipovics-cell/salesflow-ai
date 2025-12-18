/**
 * Daily Flow Screen - Mobile Dashboard für Networker
 * 
 * "Aura Flow Mobile" Design von Gemini
 * 
 * Features:
 * - Gamification (Streak, Score)
 * - Quick Actions (Screenshot, Voice, Scan)
 * - Follow-Up Tasks
 * - Lead Hunter Suggestions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mobileApi, FollowUpSuggestion, HuntedLead } from '../services/api';

const { width } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface DailyStats {
  score: number;
  streak: number;
  tasks_done: number;
  tasks_total: number;
  daily_flow_percent: number;
  new_leads: number;
}

// ============================================
// COMPONENTS
// ============================================

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
}> = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const FollowUpCard: React.FC<{
  followUp: FollowUpSuggestion;
  onGo: () => void;
  onSnooze: () => void;
}> = ({ followUp, onGo, onSnooze }) => {
  const priorityColors = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#EAB308',
    low: '#22C55E',
  };

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskLeft}>
        <View
          style={[
            styles.taskIcon,
            { backgroundColor: priorityColors[followUp.priority] },
          ]}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>💬</Text>
        </View>
      </View>
      <View style={styles.taskCenter}>
        <Text style={styles.taskName}>{followUp.meta.lead_name || 'Lead'}</Text>
        <Text style={styles.taskAction}>{followUp.meta.step_action}</Text>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity style={styles.snoozeBtn} onPress={onSnooze}>
          <Text>⏰</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.goBtn} onPress={onGo}>
          <Text style={styles.goBtnText}>GO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LeadHunterCard: React.FC<{
  lead: HuntedLead;
  onContact: () => void;
}> = ({ lead, onContact }) => (
  <View style={styles.hunterCard}>
    <View style={styles.hunterLeft}>
      <View style={styles.hunterAvatar}>
        <Text style={{ fontSize: 18 }}>{lead.name?.charAt(0) || '?'}</Text>
      </View>
    </View>
    <View style={styles.hunterCenter}>
      <Text style={styles.hunterName}>{lead.name || 'Unbekannt'}</Text>
      <Text style={styles.hunterHandle}>{lead.handle}</Text>
      <View style={styles.hunterTags}>
        {lead.bio_keywords.slice(0, 3).map((kw, i) => (
          <Text key={i} style={styles.hunterTag}>
            {kw}
          </Text>
        ))}
      </View>
    </View>
    <View style={styles.hunterRight}>
      <Text style={styles.hunterScore}>{lead.hunt_score}</Text>
      <TouchableOpacity style={styles.contactBtn} onPress={onContact}>
        <Text style={styles.contactBtnText}>📩</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ============================================
// MAIN SCREEN
// ============================================

export default function DailyFlowScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpSuggestion[]>([]);
  const [huntedLeads, setHuntedLeads] = useState<HuntedLead[]>([]);
  const [stats, setStats] = useState<DailyStats>({
    score: 72,
    streak: 14,
    tasks_done: 0,
    tasks_total: 0,
    daily_flow_percent: 0,
    new_leads: 0,
  });
  const [greeting, setGreeting] = useState('Guten Morgen');

  useEffect(() => {
    // Greeting basierend auf Tageszeit
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Guten Tag');
    else if (hour >= 17) setGreeting('Guten Abend');
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Follow-ups laden
      const followUpData = await mobileApi.getTodayFollowUps();
      setFollowUps(followUpData.follow_ups);
      
      // Lead Hunter Suggestions laden
      const leads = await mobileApi.getDailySuggestions(3);
      setHuntedLeads(leads);
      
      // Stats aktualisieren
      setStats(prev => ({
        ...prev,
        tasks_total: followUpData.count,
        daily_flow_percent: Math.round((prev.tasks_done / Math.max(followUpData.count, 1)) * 100),
      }));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleFollowUpGo = async (followUp: FollowUpSuggestion) => {
    try {
      const message = await mobileApi.generateFollowUpMessage(followUp.lead_id);
      // TODO: Open chat with generated message
      console.log('Generated message:', message.content);
    } catch (error) {
      console.error('Error generating message:', error);
    }
  };

  const handleFollowUpSnooze = async (followUp: FollowUpSuggestion) => {
    try {
      await mobileApi.snoozeFollowUp(followUp.lead_id, 'evening');
      // Remove from list
      setFollowUps(prev => prev.filter(f => f.lead_id !== followUp.lead_id));
    } catch (error) {
      console.error('Error snoozing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Lädt deinen Flow...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER mit Gradient */}
      <LinearGradient
        colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
        style={styles.header}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>{greeting}, Alex!</Text>
            <Text style={styles.subGreeting}>
              {followUps.length} Tasks warten auf dich.
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {stats.streak}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Daily Flow" value={`${stats.daily_flow_percent}%`} />
          <View style={styles.divider} />
          <StatCard label="Neue Leads" value={huntedLeads.length} />
          <View style={styles.divider} />
          <StatCard label="Score" value={stats.score} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Schnell-Start 🚀</Text>
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="📱"
            label="Screenshot"
            color="#2196F3"
            onPress={() => console.log('Screenshot import')}
          />
          <QuickActionButton
            icon="🎤"
            label="Sprach-Notiz"
            color="#4CAF50"
            onPress={() => console.log('Voice note')}
          />
          <QuickActionButton
            icon="📷"
            label="QR Scan"
            color="#FF9800"
            onPress={() => console.log('QR scan')}
          />
        </View>

        {/* FOLLOW-UPS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dein Daily Flow</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{followUps.length} offen</Text>
          </View>
        </View>
        {followUps.length > 0 ? (
          followUps.slice(0, 5).map((followUp, index) => (
            <FollowUpCard
              key={index}
              followUp={followUp}
              onGo={() => handleFollowUpGo(followUp)}
              onSnooze={() => handleFollowUpSnooze(followUp)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>Alle erledigt!</Text>
            <Text style={styles.emptyText}>Du bist ein Rockstar!</Text>
          </View>
        )}

        {/* LEAD HUNTER */}
        <Text style={styles.sectionTitle}>🎯 Lead Hunter</Text>
        {huntedLeads.map((lead, index) => (
          <LeadHunterCard
            key={index}
            lead={lead}
            onContact={() => console.log('Contact', lead.name)}
          />
        ))}

        {/* AI COACH WIDGET */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <Text style={styles.aiTitle}>SalesFlow Coach</Text>
          </View>
          <Text style={styles.aiText}>
            "Hey! Du hast heute schon {stats.tasks_done} Tasks erledigt. 
            Noch {followUps.length} Follow-ups und du erreichst dein Tagesziel!"
          </Text>
          <TouchableOpacity style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>Was soll ich als nächstes tun?</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 15,
    borderRadius: 15,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    padding: 20,
    marginTop: -10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  countBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionCard: {
    backgroundColor: '#fff',
    width: (width - 60) / 3,
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  quickActionIcon: {
    padding: 10,
    borderRadius: 50,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  taskLeft: {
    marginRight: 15,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCenter: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  taskAction: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snoozeBtn: {
    padding: 8,
  },
  goBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goBtnText: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyText: {
    color: '#666',
    marginTop: 5,
  },
  hunterCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  hunterLeft: {
    marginRight: 12,
  },
  hunterAvatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hunterCenter: {
    flex: 1,
  },
  hunterName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  hunterHandle: {
    fontSize: 12,
    color: '#888',
  },
  hunterTags: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 5,
  },
  hunterTag: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hunterRight: {
    alignItems: 'center',
  },
  hunterScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  contactBtn: {
    marginTop: 5,
    padding: 5,
  },
  contactBtnText: {
    fontSize: 20,
  },
  aiCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6C63FF',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiTitle: {
    marginLeft: 10,
    fontWeight: 'bold',
    color: '#6C63FF',
    fontSize: 16,
  },
  aiText: {
    color: '#444',
    lineHeight: 20,
    marginBottom: 15,
  },
  aiBtn: {
    backgroundColor: '#6C63FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  aiBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

