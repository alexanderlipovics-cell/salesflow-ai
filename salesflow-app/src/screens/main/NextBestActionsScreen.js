import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { API_CONFIG } from '../../services/apiConfig';

// API URL aus zentraler Config
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

const SAMPLE_ACTIONS = [
  {
    id: '1',
    lead_name: 'Thomas Weber',
    action: 'Follow-up Call vereinbaren',
    priority: 'urgent',
    reasoning: 'Enterprise-Lead mit 85er BANT Score wartet auf Angebot. Budget bestätigt, Timeline: Diese Woche',
    category: 'closing',
    expected_impact: 'high',
    estimated_time: '15 Min',
    suggested_script: 'Hey Thomas, ich wollte kurz nachfragen, ob du die Chance hattest, das Angebot durchzugehen. Wann passt dir ein kurzer Call diese Woche?'
  },
  {
    id: '2',
    lead_name: 'Max Mustermann',
    action: 'Personalisiertes Video senden',
    priority: 'high',
    reasoning: 'Qualifizierter Lead (78 BANT), Persönlichkeitstyp D braucht schnelle, ergebnisorientierte Kommunikation',
    category: 'engagement',
    expected_impact: 'high',
    estimated_time: '20 Min',
    suggested_script: 'Kurzes Video: ROI-Berechnung speziell für sein Team-Setup zeigen'
  },
  {
    id: '3',
    lead_name: 'Anna Schmidt',
    action: 'Mehrwert-Content teilen',
    priority: 'medium',
    reasoning: '7 Tage seit letztem Kontakt, I-Typ reagiert gut auf Social Proof und Success Stories',
    category: 'nurturing',
    expected_impact: 'medium',
    estimated_time: '5 Min',
    suggested_script: 'Hey Anna! 👋 Ich hab hier eine Fallstudie, die perfekt zu deinem Szenario passt. Magst du mal reinschauen?'
  },
  {
    id: '4',
    lead_name: 'Lisa Müller',
    action: 'BANT-Qualifizierung durchführen',
    priority: 'low',
    reasoning: 'Neuer Lead mit niedrigem Score (35). Braucht Qualifizierung bevor Zeit investiert wird',
    category: 'qualification',
    expected_impact: 'medium',
    estimated_time: '10 Min',
    suggested_script: 'Discovery Call mit BANT-Fragen: Budget-Rahmen, Entscheidungsprozess, Timeline klären'
  }
];

const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'urgent': return { color: '#ef4444', bg: '#fef2f2', label: '🔥 URGENT', icon: '🔴' };
    case 'high': return { color: '#f59e0b', bg: '#fffbeb', label: '⚡ HIGH', icon: '🟡' };
    case 'medium': return { color: '#3b82f6', bg: '#eff6ff', label: '📌 MEDIUM', icon: '🔵' };
    default: return { color: '#10b981', bg: '#f0fdf4', label: '📋 LOW', icon: '🟢' };
  }
};

const getCategoryIcon = (category) => {
  switch (category) {
    case 'closing': return '🎯';
    case 'engagement': return '💬';
    case 'nurturing': return '🌱';
    case 'qualification': return '🔍';
    default: return '📌';
  }
};

export default function NextBestActionsScreen() {
  const [actions, setActions] = useState(SAMPLE_ACTIONS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch from AI recommendation engine
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const markComplete = (id) => {
    setCompletedIds(prev => [...prev, id]);
  };

  const activeActions = actions.filter(a => !completedIds.includes(a.id));
  const completedActions = actions.filter(a => completedIds.includes(a.id));

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Next Best Actions</Text>
        <Text style={styles.headerSubtitle}>KI-priorisierte Aufgaben</Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{activeActions.length}</Text>
          <Text style={styles.statLabel}>Offen</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completedIds.length}</Text>
          <Text style={styles.statLabel}>Erledigt</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {activeActions.filter(a => a.priority === 'urgent').length}
          </Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
      </View>

      {/* AI Refresh Button */}
      <Pressable style={styles.aiRefreshButton} onPress={onRefresh}>
        <Text style={styles.aiRefreshIcon}>✨</Text>
        <Text style={styles.aiRefreshText}>Neue KI-Empfehlungen laden</Text>
      </Pressable>

      {/* Active Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Offene Actions ({activeActions.length})</Text>
        
        {activeActions.map((action, index) => {
          const priority = getPriorityConfig(action.priority);
          const isExpanded = expandedId === action.id;
          
          return (
            <Pressable 
              key={action.id}
              style={[styles.actionCard, { borderLeftColor: priority.color }]}
              onPress={() => setExpandedId(isExpanded ? null : action.id)}
            >
              <View style={styles.actionHeader}>
                <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
                  <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
                </View>
                <Text style={styles.estimatedTime}>⏱️ {action.estimated_time}</Text>
              </View>

              <View style={styles.actionMain}>
                <Text style={styles.categoryIcon}>{getCategoryIcon(action.category)}</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.leadName}>{action.lead_name}</Text>
                  <Text style={styles.actionText}>{action.action}</Text>
                </View>
              </View>

              <Text style={styles.reasoning}>💡 {action.reasoning}</Text>

              {isExpanded && (
                <View style={styles.expandedSection}>
                  <View style={styles.scriptContainer}>
                    <Text style={styles.scriptTitle}>📝 Vorgeschlagenes Script:</Text>
                    <Text style={styles.scriptText}>{action.suggested_script}</Text>
                  </View>
                  
                  <View style={styles.actionButtons}>
                    <Pressable 
                      style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                      onPress={() => markComplete(action.id)}
                    >
                      <Text style={styles.actionButtonText}>✅ Erledigt</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}>
                      <Text style={styles.actionButtonText}>📋 Kopieren</Text>
                    </Pressable>
                    <Pressable style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}>
                      <Text style={styles.actionButtonText}>🚀 Starten</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Completed Actions */}
      {completedActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Erledigt ({completedActions.length})</Text>
          
          {completedActions.map((action) => (
            <View key={action.id} style={styles.completedCard}>
              <Text style={styles.completedIcon}>✓</Text>
              <View style={styles.completedContent}>
                <Text style={styles.completedLead}>{action.lead_name}</Text>
                <Text style={styles.completedAction}>{action.action}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Daily Goal */}
      <View style={styles.goalCard}>
        <Text style={styles.goalIcon}>🏆</Text>
        <View style={styles.goalContent}>
          <Text style={styles.goalTitle}>Tages-Ziel</Text>
          <Text style={styles.goalProgress}>{completedIds.length} / {actions.length} Actions erledigt</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completedIds.length / actions.length) * 100}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#f59e0b', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsBar: { 
    flexDirection: 'row', 
    backgroundColor: 'white', 
    marginHorizontal: 16, 
    marginTop: -20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#e2e8f0' },
  aiRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderStyle: 'dashed'
  },
  aiRefreshIcon: { fontSize: 20, marginRight: 8 },
  aiRefreshText: { fontSize: 14, color: '#f59e0b', fontWeight: '600' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  actionCard: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontSize: 12, fontWeight: '700' },
  estimatedTime: { fontSize: 12, color: '#64748b' },
  actionMain: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  categoryIcon: { fontSize: 28, marginRight: 12 },
  actionContent: { flex: 1 },
  leadName: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  actionText: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  reasoning: { fontSize: 14, color: '#64748b', lineHeight: 20, fontStyle: 'italic' },
  expandedSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  scriptContainer: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 16 },
  scriptTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  scriptText: { fontSize: 15, color: '#1e293b', lineHeight: 22 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: 'white', fontSize: 13, fontWeight: '600' },
  completedCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f0fdf4', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8 
  },
  completedIcon: { 
    width: 24, 
    height: 24, 
    backgroundColor: '#22c55e', 
    borderRadius: 12, 
    textAlign: 'center', 
    lineHeight: 24, 
    color: 'white', 
    fontSize: 14,
    marginRight: 12
  },
  completedContent: { flex: 1 },
  completedLead: { fontSize: 12, color: '#64748b' },
  completedAction: { fontSize: 14, color: '#1e293b', textDecorationLine: 'line-through' },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  goalIcon: { fontSize: 40, marginRight: 16 },
  goalContent: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  goalProgress: { fontSize: 14, color: '#64748b', marginTop: 4 },
  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  bottomSpacer: { height: 100 }
});

