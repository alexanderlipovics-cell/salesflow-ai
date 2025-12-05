import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../services/api';

interface LeaderboardEntry {
  user_id: string;
  score: number;
  rank: number;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
}

interface LeaderboardWidgetProps {
  type: 'most_leads' | 'most_deals' | 'most_activities' | 'longest_streak';
  period?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
  showCurrentUser?: boolean;
}

export default function LeaderboardWidget({
  type,
  period = 'weekly',
  limit = 10,
  showCurrentUser = true,
}: LeaderboardWidgetProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [type, period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/gamification/leaderboard/${type}`, {
        params: { period },
      });
      setEntries(response.data.slice(0, limit));
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'most_leads': return '📊 Most Leads';
      case 'most_deals': return '💰 Most Deals';
      case 'most_activities': return '✅ Most Activities';
      case 'longest_streak': return '🔥 Longest Streaks';
      default: return 'Leaderboard';
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      default: return '';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return styles.goldRank;
      case 2: return styles.silverRank;
      case 3: return styles.bronzeRank;
      default: return styles.defaultRank;
    }
  };

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = showCurrentUser && item.user_id === currentUserId;

    return (
      <View
        style={[
          styles.entryContainer,
          isCurrentUser && styles.currentUserEntry,
          index === 0 && styles.firstPlace,
        ]}
      >
        <View style={[styles.rankBadge, getRankStyle(item.rank)]}>
          <Text style={styles.rankText}>{getMedalEmoji(item.rank)}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.userName, isCurrentUser && styles.currentUserText]}>
            {item.user?.full_name || item.user?.email || 'Unknown User'}
            {isCurrentUser && ' (You)'}
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, isCurrentUser && styles.currentUserText]}>
            {item.score}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data yet. Be the first!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getTypeLabel()}</Text>
        <Text style={styles.period}>{getPeriodLabel()}</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.user_id}
        scrollEnabled={false}
      />

      <TouchableOpacity style={styles.viewAllButton} onPress={() => {}}>
        <Text style={styles.viewAllText}>View Full Leaderboard →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  period: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  entryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  firstPlace: {
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  currentUserEntry: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goldRank: {
    backgroundColor: '#FFD700',
  },
  silverRank: {
    backgroundColor: '#C0C0C0',
  },
  bronzeRank: {
    backgroundColor: '#CD7F32',
  },
  defaultRank: {
    backgroundColor: '#F3F4F6',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  currentUserText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  scoreContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewAllButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

