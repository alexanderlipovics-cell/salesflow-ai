// src/screens/main/GamificationScreen.js

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  Platform,
  Share,
} from "react-native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { mobileApi } from "../../services/api";

const Tab = createMaterialTopTabNavigator();

// Erwartete API-Shapes (Beispiele):
// Achievement: { id, name, description, emoji, progress, target, xp }
// DailyActivity: { id, title, date, completed, xp }
// LeaderboardEntry: { id, rank, name, points, trend }

function ProgressBar({ progress }) {
  const pct = Math.max(0, Math.min(1, progress || 0));
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${pct * 100}%` }]} />
    </View>
  );
}

function AchievementsTab({ achievements, refreshing, onRefresh, onShare }) {
  return (
    <ScrollView
      style={styles.tabContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#a3e635"
        />
      }
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {achievements.length === 0 && (
        <Text style={styles.emptyText}>
          Noch keine Achievements – starte mit deinen Daily Tasks. 🚀
        </Text>
      )}
      {achievements.map((a) => {
        const progress = (a.progress || 0) / (a.target || 1);
        return (
          <View key={a.id} style={styles.achievementCard}>
            <View style={styles.achievementHeader}>
              <Text style={styles.achievementEmoji}>{a.emoji || "⭐"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementTitle}>{a.name}</Text>
                <Text style={styles.achievementDescription}>
                  {a.description}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.shareChip}
                onPress={() => onShare(a)}
              >
                <Text style={styles.shareChipText}>Teilen</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.achievementMetaRow}>
              <Text style={styles.achievementMeta}>
                {a.progress}/{a.target} · {a.xp ?? 0} XP
              </Text>
            </View>
            <ProgressBar progress={progress} />
          </View>
        );
      })}
    </ScrollView>
  );
}

function LeaderboardTab({ leaderboard, refreshing, onRefresh }) {
  return (
    <FlatList
      style={styles.tabContainer}
      data={leaderboard}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#a3e635"
        />
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: 24 }}>
          <Text style={styles.emptyText}>
            Noch keine Leaderboard-Daten. Sammle XP durch Aktivitäten.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const trend = item.trend || 0;
        const isUp = trend >= 0;
        const initials = (item.name || "")
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <View style={styles.leaderboardRow}>
            <Text style={styles.leaderboardRank}>{item.rank}</Text>
            <View style={styles.leaderboardAvatar}>
              <Text style={styles.leaderboardAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.leaderboardName}>{item.name}</Text>
              <Text style={styles.leaderboardPoints}>
                {item.points ?? 0} Punkte
              </Text>
            </View>
            <Text
              style={[
                styles.leaderboardTrend,
                isUp ? styles.trendUp : styles.trendDown,
              ]}
            >
              {isUp ? "▲" : "▼"} {Math.abs(trend)}
            </Text>
          </View>
        );
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

function DailyTasksTab({ tasks, refreshing, onRefresh, onToggle }) {
  return (
    <ScrollView
      style={styles.tabContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#a3e635"
        />
      }
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {tasks.length === 0 && (
        <Text style={styles.emptyText}>
          Für heute sind noch keine Tasks definiert.
        </Text>
      )}
      {tasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          style={[
            styles.taskCard,
            task.completed && styles.taskCardCompleted,
          ]}
          onPress={() => onToggle(task)}
        >
          <View style={styles.taskLeft}>
            <View
              style={[
                styles.taskCheckbox,
                task.completed && styles.taskCheckboxChecked,
              ]}
            >
              {task.completed && (
                <Text style={styles.taskCheckboxCheck}>✓</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.taskTitle,
                  task.completed && styles.taskTitleCompleted,
                ]}
              >
                {task.title}
              </Text>
              <Text style={styles.taskSubtitle}>
                {task.xp ?? 0} XP · {task.date}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function GamificationScreen() {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadGamificationData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Alle Daten parallel laden
      const data = await mobileApi.getGamificationData();

      // Streaks
      setStreak(data.streak.current || 0);
      setLongestStreak(data.streak.longest || 0);

      // Achievements transformieren
      const transformedAchievements = data.achievements.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        emoji: a.icon || "⭐",
        progress: a.progress,
        target: a.max_progress,
        xp: 0, // TODO: Wenn Backend XP liefert
        unlocked: a.unlocked,
        unlocked_at: a.unlocked_at,
      }));
      setAchievements(transformedAchievements);

      // Daily Tasks
      const transformedTasks = data.daily_activities.map((task) => ({
        id: task.id,
        title: task.name,
        description: task.description,
        xp: task.xp_reward,
        completed: task.completed,
        date: new Date().toISOString().slice(0, 10), // Heute
      }));
      setDailyTasks(transformedTasks);

      // Leaderboard transformieren
      const transformedLeaderboard = data.leaderboard.map((entry) => ({
        id: entry.user_id,
        rank: entry.rank,
        name: entry.user_name,
        points: entry.total_xp,
        trend: 0, // TODO: Wenn Backend Trend liefert
      }));
      setLeaderboard(transformedLeaderboard);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateHero();
    } catch (err) {
      console.error(err);
      setToast("Gamification-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGamificationData(false);
  }, []);

  const animateHero = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    // Bounce bei Streak-Update
    if (streak === 0) return;
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        friction: 4,
        tension: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [streak]);

  const onRefresh = () => {
    loadGamificationData(true);
  };

  const handleCompleteTask = async (task) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Optimistisch updaten
      setDailyTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: !t.completed } : t
        )
      );

      const result = await mobileApi.trackDailyActivity(task.id);

      // Wenn Task jetzt completed: XP-Feedback / Confetti
      if (!task.completed && result.xp_gained > 0) {
        setToast(`+${result.xp_gained} XP gesammelt!`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        // Neue Achievements anzeigen
        if (result.new_achievements && result.new_achievements.length > 0) {
          const achievementNames = result.new_achievements.map(a => a.name).join(', ');
          setTimeout(() => {
            setToast(`🎉 Neue Achievements: ${achievementNames}`);
          }, 2500);
        }
      }

      // Daten neu laden, um Achievements zu aktualisieren
      if (!task.completed) {
        loadGamificationData(false);
      }
    } catch (err) {
      console.error(err);
      setToast("Task konnte nicht aktualisiert werden.");
      // Rollback
      setDailyTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: task.completed } : t
        )
      );
    }
  };

  const handleShareAchievement = async (achievement) => {
    try {
      const msg =
        `${achievement.emoji || "⭐"} Achievement: ${
          achievement.name
        }\n\n` +
        `${achievement.description}\n` +
        `Progress: ${achievement.progress}/${achievement.target} · ${
          achievement.xp ?? 0
        } XP`;
      await Share.share({ message: msg });
    } catch (err) {
      console.error(err);
      setToast("Achievement konnte nicht geteilt werden.");
    }
  };


  return (
    <View style={styles.container}>
      {/* Toast */}
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Confetti (optional) */}
      {showConfetti && (
        <ConfettiCannon
          count={60}
          origin={{ x: 0, y: 0 }}
          fadeOut
          autoStart
        />
      )}

      {/* Hero-Streak */}
      <Animated.View
        style={[
          styles.hero,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.heroLabel}>Aktueller Streak</Text>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.heroSubLabel}>🔥 Tage in Folge aktiv</Text>
        <Text style={styles.heroSubText}>
          Längster Streak: {longestStreak} Tage
        </Text>
      </Animated.View>

      {/* Tabs */}
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {
              backgroundColor: "#020617",
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarIndicatorStyle: { backgroundColor: "#a3e635" },
            tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          }}
        >
          <Tab.Screen name="Achievements">
            {() => (
              <AchievementsTab
                achievements={achievements}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onShare={handleShareAchievement}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Leaderboard">
            {() => (
              <LeaderboardTab
                leaderboard={leaderboard}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Daily Tasks">
            {() => (
              <DailyTasksTab
                tasks={dailyTasks}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onToggle={handleToggleTask}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>

      {/* Optional Loader-Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Lade Gamification…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617", // slate-950
    paddingTop: Platform.OS === "ios" ? 48 : 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  infoText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#022c22",
    borderWidth: 1,
    borderColor: "#22c55e",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 12,
    color: "#bbf7d0",
    marginBottom: 2,
  },
  streakNumber: {
    fontSize: 40,
    fontWeight: "800",
    color: "#f97316",
  },
  heroSubLabel: {
    fontSize: 13,
    color: "#e5e7eb",
    marginTop: 4,
  },
  heroSubText: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: "#020617",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 12,
  },
  achievementCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 10,
    marginBottom: 8,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  achievementEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  achievementDescription: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  achievementMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  achievementMeta: {
    fontSize: 11,
    color: "#9ca3af",
  },
  progressOuter: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    overflow: "hidden",
  },
  progressInner: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#22c55e",
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 10,
    marginBottom: 6,
  },
  leaderboardRank: {
    width: 24,
    fontSize: 14,
    fontWeight: "700",
    color: "#e5e7eb",
    textAlign: "center",
    marginRight: 4,
  },
  leaderboardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  leaderboardAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  leaderboardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  leaderboardPoints: {
    fontSize: 11,
    color: "#9ca3af",
  },
  leaderboardTrend: {
    fontSize: 11,
    fontWeight: "600",
  },
  trendUp: {
    color: "#22c55e",
  },
  trendDown: {
    color: "#f97316",
  },
  taskCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 10,
    marginBottom: 6,
  },
  taskCardCompleted: {
    backgroundColor: "#022c22",
    borderColor: "#22c55e",
  },
  taskLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4b5563",
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  taskCheckboxChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  taskCheckboxCheck: {
    fontSize: 14,
    color: "#0b1120",
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#bbf7d0",
  },
  taskSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  toast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 28,
    alignSelf: "center",
    backgroundColor: "#064e3b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 30,
  },
  toastText: {
    fontSize: 11,
    color: "#bbf7d0",
  },
  loadingOverlay: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  loadingText: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  shareChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  shareChipText: {
    fontSize: 10,
    color: "#e5e7eb",
  },
});

