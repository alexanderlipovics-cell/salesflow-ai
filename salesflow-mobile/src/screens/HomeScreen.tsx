import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

export default function HomeScreen({ navigation }: any) {
  const quickActions = [
    { icon: 'chatbubble', label: 'KI Chat', screen: 'Chat', color: COLORS.primary },
    { icon: 'document-text', label: 'Scripts', screen: 'Scripts', color: COLORS.secondary },
    { icon: 'people', label: 'Leads', screen: 'Leads', color: COLORS.accent },
    { icon: 'shield-checkmark', label: 'Einwand', screen: 'ObjectionHandler', color: COLORS.warning },
  ];

  const stats = [
    { label: 'Leads heute', value: '12', change: '+3' },
    { label: 'Gespräche', value: '8', change: '+2' },
    { label: 'Abschlüsse', value: '2', change: '+1' },
    { label: 'Conversion', value: '25%', change: '+5%' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[COLORS.primary + '30', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Guten Tag! 👋</Text>
              <Text style={styles.subtitle}>Bereit für neue Abschlüsse?</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person-circle" size={40} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schnellzugriff</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickAction}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heute</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statChange}>{stat.change}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Letzte Aktivität</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.activityText}>Lead "Max M." kontaktiert</Text>
              <Text style={styles.activityTime}>vor 5 Min</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="document" size={20} color={COLORS.secondary} />
              <Text style={styles.activityText}>Script "Zinzino Pitch" verwendet</Text>
              <Text style={styles.activityTime}>vor 15 Min</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
              <Text style={styles.activityText}>Einwand "Zu teuer" bearbeitet</Text>
              <Text style={styles.activityTime}>vor 30 Min</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  quickAction: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statChange: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityText: {
    flex: 1,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    fontSize: 14,
  },
  activityTime: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
