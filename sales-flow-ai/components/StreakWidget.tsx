import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { apiClient } from '../services/api';

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  streak_start_date: string;
}

interface StreakWidgetProps {
  onPress?: () => void;
}

export default function StreakWidget({ onPress }: StreakWidgetProps) {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const flameAnimation = new Animated.Value(1);

  useEffect(() => {
    loadStreak();
    
    // Animate flame
    Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnimation, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(flameAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadStreak = async () => {
    try {
      const response = await apiClient.get('/gamification/streak');
      setStreak(response.data);
    } catch (error) {
      console.error('Failed to load streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !streak) {
    return null;
  }

  const getStreakEmoji = (days: number) => {
    if (days >= 100) return '💥';
    if (days >= 30) return '⚡';
    if (days >= 7) return '🔥';
    return '🔥';
  };

  const getStreakMessage = (days: number) => {
    if (days >= 100) return 'LEGENDARY!';
    if (days >= 30) return 'ON FIRE!';
    if (days >= 7) return 'HOT STREAK!';
    if (days >= 3) return 'Keep going!';
    return 'Great start!';
  };

  const getStreakColor = (days: number) => {
    if (days >= 100) return '#9333EA'; // Purple
    if (days >= 30) return '#DC2626'; // Red
    if (days >= 7) return '#EA580C'; // Orange
    return '#F59E0B'; // Yellow
  };

  const currentColor = getStreakColor(streak.current_streak);

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: currentColor }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.Text 
        style={[
          styles.flameIcon,
          { transform: [{ scale: flameAnimation }] }
        ]}
      >
        {getStreakEmoji(streak.current_streak)}
      </Animated.Text>
      
      <View style={styles.info}>
        <View style={styles.streakRow}>
          <Text style={[styles.streakNumber, { color: currentColor }]}>
            {streak.current_streak}
          </Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </View>
        
        <Text style={[styles.streakMessage, { color: currentColor }]}>
          {getStreakMessage(streak.current_streak)}
        </Text>
      </View>

      {streak.current_streak >= 7 && (
        <View style={[styles.badge, { backgroundColor: currentColor }]}>
          <Text style={styles.badgeText}>
            {streak.current_streak >= 100 ? '💎' : 
             streak.current_streak >= 30 ? '👑' : '⭐'}
          </Text>
        </View>
      )}

      {streak.longest_streak > streak.current_streak && (
        <View style={styles.recordBadge}>
          <Text style={styles.recordText}>
            Record: {streak.longest_streak}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    margin: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  flameIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 8,
  },
  streakLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  streakMessage: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  badgeText: {
    fontSize: 24,
  },
  recordBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recordText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
});

