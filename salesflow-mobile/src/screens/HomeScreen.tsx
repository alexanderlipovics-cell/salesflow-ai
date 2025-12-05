import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

const QUICK_ACTIONS = [
  { id: '1', icon: 'flash', label: 'Quick Script', color: COLORS.primary, screen: 'MagicScriptScreen' },
  { id: '2', icon: 'person-add', label: 'Neuer Lead', color: '#3B82F6', screen: 'LeadDetailScreen' },
  { id: '3', icon: 'chatbubbles', label: 'Follow-ups', color: COLORS.warning, screen: 'Leads' },
  { id: '4', icon: 'trophy', label: 'Erfolge', color: COLORS.secondary, screen: null },
];

const STATS = [
  { label: 'Leads', value: '24', trend: '+3', icon: 'people' },
  { label: 'Hot 🔥', value: '8', trend: '+2', icon: 'flame' },
  { label: 'Closing', value: '5', trend: '+1', icon: 'checkmark-circle' },
  { label: 'Scripts', value: '47', trend: '', icon: 'document-text' },
];

const PENDING_TASKS = [
  { id: '1', lead: 'Lisa Müller', action: 'Follow-up senden', time: '2 Tage überfällig', urgent: true },
  { id: '2', lead: 'Markus Weber', action: 'Link schicken', time: 'Heute', urgent: false },
  { id: '3', lead: 'Sarah K.', action: 'Preis erklären', time: 'Morgen', urgent: false },
];

export default function HomeScreen({ navigation }: any) {
  const handleQuickAction = async (action: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action.screen) {
      navigation.navigate(action.screen, { leadName: 'Neuer Lead' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Guten Tag! 👋</Text>
            <Text style={styles.headline}>Dein Sales Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle" size={40} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
              {stat.trend && <Text style={styles.statTrend}>{stat.trend}</Text>}
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionBtn}
              onPress={() => handleQuickAction(action)}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pending Tasks */}
        <Text style={styles.sectionTitle}>Anstehende Aufgaben</Text>
        {PENDING_TASKS.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate('LeadDetailScreen', { leadId: task.id });
            }}
          >
            <View style={styles.taskLeft}>
              <Text style={styles.taskLead}>{task.lead}</Text>
              <Text style={styles.taskAction}>{task.action}</Text>
            </View>
            <View style={styles.taskRight}>
              <Text style={[styles.taskTime, task.urgent && styles.urgentTime]}>{task.time}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        {/* AI Tip Card */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.warning} />
            <Text style={styles.tipTitle}>AI Tipp des Tages</Text>
          </View>
          <Text style={styles.tipText}>
            Lisa Müller ghostet seit 2 Tagen. Versuch es mit einer humorvollen Nachricht - das hat bei ähnlichen Leads 73% Erfolgsquote!
          </Text>
          <TouchableOpacity
            style={styles.tipBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('MagicScriptScreen', { leadName: 'Lisa Müller', type: 'ghosting' });
            }}
          >
            <Ionicons name="sparkles" size={16} color={COLORS.text} />
            <Text style={styles.tipBtnText}>Script generieren</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 16, color: COLORS.textSecondary },
  headline: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  profileBtn: { padding: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  statTrend: { position: 'absolute', top: 12, right: 12, fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  taskCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  taskLeft: { flex: 1 },
  taskLead: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  taskAction: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  taskRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskTime: { fontSize: 12, color: COLORS.textMuted },
  urgentTime: { color: COLORS.error, fontWeight: '700' },
  tipCard: { backgroundColor: '#1a1708', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#3d3510', marginTop: 8 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tipTitle: { fontSize: 16, fontWeight: '700', color: COLORS.warning },
  tipText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 16 },
  tipBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.secondary, paddingVertical: 12, borderRadius: 12 },
  tipBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
});
