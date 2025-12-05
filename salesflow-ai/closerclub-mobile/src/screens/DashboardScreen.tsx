/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CLOSERCLUB - DASHBOARD SCREEN                                             ║
 * ║  Mobile Dashboard mit Dark Glassmorphism Design                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

const { width } = Dimensions.get('window');

interface DashboardStats {
  openFollowUps: number;
  todayTasks: number;
  totalLeads: number;
  conversionRate: number;
  hotLeads: number;
  warmLeads: number;
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    openFollowUps: 5,
    todayTasks: 3,
    totalLeads: 12,
    conversionRate: 24,
    hotLeads: 4,
    warmLeads: 8,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // TODO: API Call implementieren
      // Beispiel: const data = await fetchDashboardStats();
      // setStats(data);
      
      // Simuliere API Call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Fehler beim Laden der Dashboard-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const ActionCard = ({ 
    title, 
    icon, 
    onPress, 
    gradient 
  }: { 
    title: string; 
    icon: string; 
    onPress: () => void; 
    gradient: string[];
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.actionCard}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionCardGradient}
      >
        <Text style={styles.actionCardIcon}>{icon}</Text>
        <Text style={styles.actionCardTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const StatCard = ({ 
    label, 
    value, 
    trend, 
    color 
  }: { 
    label: string; 
    value: string | number; 
    trend?: string; 
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
      {trend && <Text style={styles.statTrend}>{trend}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Lade Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Willkommen zurück! 👋</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heute</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              label="Offene Follow-ups" 
              value={stats.openFollowUps} 
              color={COLORS.warning}
            />
            <StatCard 
              label="Aufgaben" 
              value={stats.todayTasks} 
              color={COLORS.info}
            />
            <StatCard 
              label="Total Leads" 
              value={stats.totalLeads} 
              trend="+3 diese Woche"
            />
            <StatCard 
              label="Conversion Rate" 
              value={`${stats.conversionRate}%`} 
              trend="+5% vs. letzte Woche"
              color={COLORS.success}
            />
          </View>
        </View>

        {/* Lead Pipeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Pipeline</Text>
          <View style={styles.pipelineContainer}>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: COLORS.hot }]} />
              <Text style={styles.pipelineLabel}>Heiß</Text>
              <Text style={styles.pipelineValue}>{stats.hotLeads}</Text>
            </View>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: COLORS.warm }]} />
              <Text style={styles.pipelineLabel}>Warm</Text>
              <Text style={styles.pipelineValue}>{stats.warmLeads}</Text>
            </View>
            <View style={styles.pipelineItem}>
              <View style={[styles.pipelineDot, { backgroundColor: COLORS.cold }]} />
              <Text style={styles.pipelineLabel}>Kalt</Text>
              <Text style={styles.pipelineValue}>0</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schnellzugriff</Text>
          <View style={styles.actionsGrid}>
            <ActionCard
              title="Speed Hunter"
              icon="🎯"
              gradient={['#06b6d4', '#0891b2']}
              onPress={() => navigation.navigate('SpeedHunter')}
            />
            <ActionCard
              title="Leads"
              icon="👥"
              gradient={['#8b5cf6', '#7c3aed']}
              onPress={() => navigation.navigate('LeadManagement')}
            />
            <ActionCard
              title="AI Coach"
              icon="🧠"
              gradient={['#f97316', '#ea580c']}
              onPress={() => navigation.navigate('AICoach')}
            />
            <ActionCard
              title="Analytics"
              icon="📊"
              gradient={['#10b981', '#059669']}
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Tipp des Tages</Text>
            <Text style={styles.tipText}>
              Konzentriere dich heute auf deine heißen Leads. Sie haben die höchste 
              Conversion-Wahrscheinlichkeit!
            </Text>
          </View>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerGreeting: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  notificationButton: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  statCard: {
    width: (width - SPACING.lg * 2 - SPACING.xs * 2) / 2,
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: '700',
  },
  statTrend: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
  pipelineContainer: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  pipelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  pipelineDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  pipelineLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  pipelineValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  actionCard: {
    width: (width - SPACING.lg * 2 - SPACING.xs * 2) / 2,
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  actionCardGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  actionCardIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  actionCardTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  tipIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  tipText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

