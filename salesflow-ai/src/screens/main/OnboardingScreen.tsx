/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ONBOARDING SCREEN                                                         ║
 * ║  Neue User zum ersten Erfolg führen                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import { OnboardingProgress } from '../../components/chief-v3';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { user } = useAuth();
  const {
    progress,
    tasks,
    loading,
    error,
    isOverwhelmed,
    completionPercent,
    currentStage,
    loadProgress,
    loadTasks,
    completeTask,
    trackMilestone,
    getNextAction,
  } = useOnboarding();

  const [refreshing, setRefreshing] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const celebrationAnim = React.useRef(new Animated.Value(0)).current;

  // Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  }, [loadProgress]);

  // Show Celebration
  const showCelebration = (message: string) => {
    setCelebration(message);
    Animated.sequence([
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(celebrationAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => setCelebration(null));
  };

  // Task Handler
  const handleTaskPress = async (taskId: string) => {
    const result = await completeTask(taskId);
    if (result.celebration) {
      showCelebration(result.celebration);
    }
  };

  // Quick Action Handler
  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'first_contact':
        navigation.navigate('Outreach');
        break;
      case 'chat':
        navigation.navigate('AIChat');
        break;
      case 'learn':
        navigation.navigate('ObjectionBrain');
        break;
    }
  };

  // Stage Labels
  const getStageInfo = () => {
    const stages: Record<string, { title: string; emoji: string; hint: string }> = {
      day_1: {
        title: 'Tag 1 - Dein Start',
        emoji: '🚀',
        hint: 'Heute geht es darum, dein System kennenzulernen',
      },
      days_2_3: {
        title: 'Tag 2-3 - Erste Schritte',
        emoji: '👣',
        hint: 'Zeit für deine erste echte Aktion',
      },
      days_4_7: {
        title: 'Tag 4-7 - Momentum',
        emoji: '⚡',
        hint: 'Du baust Routinen auf - bleib dran!',
      },
      days_8_14: {
        title: 'Woche 2 - Festigen',
        emoji: '💪',
        hint: 'Du wirst immer sicherer',
      },
      completed: {
        title: 'Onboarding abgeschlossen!',
        emoji: '🏆',
        hint: 'Du bist jetzt ready für den vollen Flow',
      },
    };
    return stages[currentStage] || stages.day_1;
  };

  const stageInfo = getStageInfo();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{stageInfo.emoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{stageInfo.title}</Text>
          <Text style={styles.headerHint}>{stageInfo.hint}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {/* Progress Overview */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Dein Fortschritt</Text>
            <Text style={styles.progressPercent}>
              {Math.round(completionPercent)}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${completionPercent}%` }]}
            />
          </View>
          <Text style={styles.progressDetail}>
            Tag {progress?.days_since_start || 1} • {progress?.tasks_completed || 0}/{progress?.tasks_total || 0} Tasks
          </Text>
        </View>

        {/* Milestones */}
        <View style={styles.milestonesCard}>
          <Text style={styles.sectionTitle}>🎯 Meilensteine</Text>
          <View style={styles.milestones}>
            <MilestonePill
              label="Erste Nachricht"
              completed={progress?.first_contact_sent || false}
              emoji="📤"
            />
            <MilestonePill
              label="Erste Antwort"
              completed={progress?.first_reply_received || false}
              emoji="📥"
            />
            <MilestonePill
              label="Erster Sale"
              completed={progress?.first_sale || false}
              emoji="🏆"
            />
          </View>
        </View>

        {/* Overwhelm Mode */}
        {isOverwhelmed && (
          <View style={styles.overwhelmCard}>
            <Text style={styles.overwhelmEmoji}>🌿</Text>
            <Text style={styles.overwhelmTitle}>
              Hey, alles okay - eins nach dem anderen
            </Text>
            <Text style={styles.overwhelmText}>
              Ich merke, es ist gerade viel. Konzentrier dich auf nur diese eine Sache:
            </Text>
            {progress?.next_task && (
              <TouchableOpacity
                style={styles.singleActionButton}
                onPress={() => handleTaskPress(progress.next_task!.id)}
              >
                <Text style={styles.singleActionText}>
                  👉 {progress.next_task.title}
                </Text>
                <Text style={styles.singleActionTime}>
                  ~{progress.next_task.estimated_minutes} Min.
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Next Action (wenn nicht overwhelmed) */}
        {!isOverwhelmed && progress?.next_task && (
          <View style={styles.nextActionCard}>
            <Text style={styles.nextLabel}>👆 Dein nächster Schritt</Text>
            <Text style={styles.nextTitle}>{progress.next_task.title}</Text>
            <Text style={styles.nextDesc}>{progress.next_task.description}</Text>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => handleTaskPress(progress.next_task!.id)}
            >
              <Text style={styles.nextButtonText}>Jetzt machen ✓</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => handleQuickAction('first_contact')}
            >
              <Text style={styles.quickEmoji}>📱</Text>
              <Text style={styles.quickText}>Outreach</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => handleQuickAction('chat')}
            >
              <Text style={styles.quickEmoji}>💬</Text>
              <Text style={styles.quickText}>Frag CHIEF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => handleQuickAction('learn')}
            >
              <Text style={styles.quickEmoji}>🧠</Text>
              <Text style={styles.quickText}>Lernen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Full Task List */}
        {!isOverwhelmed && tasks.length > 0 && (
          <View style={styles.taskListCard}>
            <Text style={styles.sectionTitle}>📋 Alle Tasks</Text>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskItem,
                  task.is_completed && styles.taskItemCompleted,
                ]}
                onPress={() => !task.is_completed && handleTaskPress(task.id)}
                disabled={task.is_completed}
              >
                <View style={styles.taskCheck}>
                  {task.is_completed ? (
                    <Text style={styles.taskCheckmark}>✓</Text>
                  ) : (
                    <View style={styles.taskCheckEmpty} />
                  )}
                </View>
                <View style={styles.taskContent}>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.is_completed && styles.taskTitleDone,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text style={styles.taskMeta}>
                    ~{task.estimated_minutes} Min.
                    {task.is_required && ' • Pflicht'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsEmoji}>💡</Text>
          <Text style={styles.tipsTitle}>Pro-Tipp</Text>
          <Text style={styles.tipsText}>
            Die erfolgreichsten Seller starten jeden Tag mit einer kurzen
            Power Hour. Frag CHIEF danach!
          </Text>
        </View>
      </ScrollView>

      {/* Celebration Overlay */}
      {celebration && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            {
              opacity: celebrationAnim,
              transform: [
                {
                  scale: celebrationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.celebrationText}>{celebration}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function MilestonePill({
  label,
  completed,
  emoji,
}: {
  label: string;
  completed: boolean;
  emoji: string;
}) {
  return (
    <View
      style={[styles.milestonePill, completed && styles.milestonePillDone]}
    >
      <Text style={styles.milestoneEmoji}>{completed ? emoji : '⬜'}</Text>
      <Text
        style={[
          styles.milestoneLabel,
          completed && styles.milestoneLabelDone,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a2e',
  },
  headerEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerHint: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  progressCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#2d2d44',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 5,
  },
  progressDetail: {
    fontSize: 13,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  milestonesCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  milestones: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  milestonePill: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    minWidth: 90,
  },
  milestonePillDone: {
    backgroundColor: '#10b981',
  },
  milestoneEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  milestoneLabel: {
    fontSize: 11,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  milestoneLabelDone: {
    color: '#ffffff',
  },
  overwhelmCard: {
    backgroundColor: '#2d2d44',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  overwhelmEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  overwhelmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 8,
  },
  overwhelmText: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 16,
    lineHeight: 20,
  },
  singleActionButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  singleActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  singleActionTime: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.8,
  },
  nextActionCard: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  nextLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 4,
  },
  nextTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  nextDesc: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  quickActionsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    minWidth: 80,
  },
  quickEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickText: {
    fontSize: 12,
    color: '#a0a0a0',
  },
  taskListCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 10,
    marginBottom: 8,
  },
  taskItemCompleted: {
    opacity: 0.5,
  },
  taskCheck: {
    width: 28,
    height: 28,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckEmpty: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#4a4a5a',
    borderRadius: 6,
  },
  taskCheckmark: {
    fontSize: 20,
    color: '#10b981',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#a0a0a0',
  },
  taskMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  tipsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  tipsEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  celebrationText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
});

