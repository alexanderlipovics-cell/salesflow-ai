import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { apiClient } from '../services/api';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface Achievement {
  id: string;
  badge_id: string;
  earned_at: string;
  badges: Badge;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
}

export const AchievementsScreen = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    loadData();
    checkNewBadges();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [badgesRes, achievementsRes, streakRes, statsRes] = await Promise.all([
        apiClient.get('/gamification/badges'),
        apiClient.get('/gamification/achievements'),
        apiClient.get('/gamification/streak'),
        apiClient.get('/gamification/stats')
      ]);
      
      setBadges(badgesRes.data);
      setAchievements(achievementsRes.data);
      setStreak(streakRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const checkNewBadges = async () => {
    try {
      const response = await apiClient.post('/gamification/check-badges');
      
      if (response.data.new_badges.length > 0) {
        // Show celebration!
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        
        // Reload achievements
        loadData();
      }
    } catch (error) {
      console.error('Failed to check badges:', error);
    }
  };
  
  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      case 'platinum': return '💎';
      default: return '⭐';
    }
  };
  
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      case 'platinum': return '#E5E4E2';
      default: return '#FFA500';
    }
  };
  
  const earnedIds = new Set(achievements.map(a => a.badge_id));
  
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Confetti Effect */}
        {showConfetti && (
          <View className="absolute top-0 left-0 right-0 bottom-0 z-50 items-center justify-center">
            <Text className="text-6xl">🎉</Text>
            <Text className="text-2xl font-bold text-yellow-500 mt-4">
              Neues Achievement freigeschaltet!
            </Text>
          </View>
        )}
        
        {/* Streak Card */}
        <View className="bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-6 mb-6 shadow-lg">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-lg font-semibold mb-1">
                🔥 Daily Streak
              </Text>
              <Text className="text-white text-4xl font-bold">
                {streak?.current_streak || 0} Tage
              </Text>
              <Text className="text-white text-sm mt-2 opacity-90">
                Längste: {streak?.longest_streak || 0} Tage
              </Text>
            </View>
            <View className="bg-white rounded-full p-4">
              <Text className="text-5xl">🔥</Text>
            </View>
          </View>
        </View>
        
        {/* Stats Cards */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white rounded-lg p-4 shadow">
            <Text className="text-3xl mb-1">📊</Text>
            <Text className="text-2xl font-bold text-gray-900">
              {stats?.stats?.lead_count || 0}
            </Text>
            <Text className="text-sm text-gray-600">Leads</Text>
          </View>
          
          <View className="flex-1 bg-white rounded-lg p-4 shadow">
            <Text className="text-3xl mb-1">💰</Text>
            <Text className="text-2xl font-bold text-green-600">
              {stats?.stats?.deal_count || 0}
            </Text>
            <Text className="text-sm text-gray-600">Deals</Text>
          </View>
          
          <View className="flex-1 bg-white rounded-lg p-4 shadow">
            <Text className="text-3xl mb-1">🏆</Text>
            <Text className="text-2xl font-bold text-yellow-600">
              {stats?.badge_count || 0}
            </Text>
            <Text className="text-sm text-gray-600">Badges</Text>
          </View>
        </View>
        
        {/* Badges Section */}
        <View className="bg-white rounded-lg p-4 shadow mb-4">
          <Text className="text-2xl font-bold mb-4">🏆 Achievements</Text>
          <Text className="text-gray-600 mb-4">
            {achievements.length} von {badges.length} freigeschaltet
          </Text>
          
          <View className="flex-row flex-wrap">
            {badges.map((badge) => {
              const earned = earnedIds.has(badge.id);
              const achievement = achievements.find(a => a.badge_id === badge.id);
              
              return (
                <TouchableOpacity
                  key={badge.id}
                  className={`w-1/3 p-3 items-center ${!earned && 'opacity-30'}`}
                >
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-2"
                    style={{
                      backgroundColor: earned ? getTierColor(badge.tier) : '#E5E7EB'
                    }}
                  >
                    <Text className="text-3xl">
                      {getTierEmoji(badge.tier)}
                    </Text>
                  </View>
                  
                  <Text
                    className="text-sm font-semibold text-center text-gray-900"
                    numberOfLines={2}
                  >
                    {badge.name}
                  </Text>
                  
                  <Text
                    className="text-xs text-gray-600 text-center mt-1"
                    numberOfLines={2}
                  >
                    {badge.description}
                  </Text>
                  
                  {earned && achievement && (
                    <Text className="text-xs text-green-600 mt-1">
                      ✓ {new Date(achievement.earned_at).toLocaleDateString('de-DE')}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <View className="bg-white rounded-lg p-4 shadow">
            <Text className="text-xl font-bold mb-3">🎊 Zuletzt freigeschaltet</Text>
            
            {achievements.slice(0, 5).map((achievement) => (
              <View
                key={achievement.id}
                className="flex-row items-center py-3 border-b border-gray-100"
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: getTierColor(achievement.badges.tier)
                  }}
                >
                  <Text className="text-2xl">
                    {getTierEmoji(achievement.badges.tier)}
                  </Text>
                </View>
                
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">
                    {achievement.badges.name}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {achievement.badges.description}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {new Date(achievement.earned_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default AchievementsScreen;

