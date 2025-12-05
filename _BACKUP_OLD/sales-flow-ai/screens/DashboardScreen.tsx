import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import StreakWidget from '../components/StreakWidget';
import LeaderboardWidget from '../components/LeaderboardWidget';
import BadgeUnlockModal from '../components/BadgeUnlockModal';
import { apiClient } from '../services/api';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
}

export default function DashboardScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [stats, setStats] = useState({
    leads: 0,
    deals: 0,
    activities: 0,
    badges: 0,
  });

  useEffect(() => {
    loadDashboard();
    checkNewBadges();
  }, []);

  const loadDashboard = async () => {
    try {
      // Load stats
      const statsResponse = await apiClient.get('/gamification/stats');
      setStats({
        leads: statsResponse.data.stats.lead_count || 0,
        deals: statsResponse.data.stats.deal_count || 0,
        activities: statsResponse.data.stats.activity_count || 0,
        badges: statsResponse.data.badge_count || 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const checkNewBadges = async () => {
    try {
      const response = await apiClient.post('/gamification/check-badges');
      
      if (response.data.new_badges && response.data.new_badges.length > 0) {
        // Show first new badge
        setNewBadge(response.data.new_badges[0]);
        setShowBadgeModal(true);
      }
    } catch (error) {
      console.error('Failed to check badges:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    await checkNewBadges();
    setRefreshing(false);
  };

  const handleStreakPress = () => {
    navigation.navigate('Achievements');
  };

  const handleBadgeModalClose = () => {
    setShowBadgeModal(false);
    // If there are more badges, show next one
    // For now, just close
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back! 👋</Text>
        <Text style={styles.subtitle}>Here's your progress today</Text>
      </View>

      {/* Streak Widget */}
      <StreakWidget onPress={handleStreakPress} />

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>{stats.leads}</Text>
          <Text style={styles.statLabel}>Leads</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>{stats.deals}</Text>
          <Text style={styles.statLabel}>Deals</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✅</Text>
          <Text style={styles.statValue}>{stats.activities}</Text>
          <Text style={styles.statLabel}>Activities</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={styles.statValue}>{stats.badges}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>

      {/* Leaderboards */}
      <LeaderboardWidget
        type="most_leads"
        period="weekly"
        limit={5}
        showCurrentUser={true}
      />

      <LeaderboardWidget
        type="most_deals"
        period="weekly"
        limit={5}
        showCurrentUser={true}
      />

      <LeaderboardWidget
        type="longest_streak"
        period="weekly"
        limit={5}
        showCurrentUser={true}
      />

      {/* Badge Unlock Modal */}
      <BadgeUnlockModal
        visible={showBadgeModal}
        badge={newBadge}
        onClose={handleBadgeModalClose}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

