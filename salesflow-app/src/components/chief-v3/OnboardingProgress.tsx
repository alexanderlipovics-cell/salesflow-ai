/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  OnboardingProgress Component                                              ║
 * ║  Zeigt den Onboarding-Fortschritt für neue User                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useOnboarding } from '../../hooks/useOnboarding';

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingProgressProps {
  onTaskPress?: (taskId: string) => void;
  onComplete?: () => void;
  showTasks?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OnboardingProgress({
  onTaskPress,
  onComplete,
  showTasks = true,
}: OnboardingProgressProps) {
  const {
    progress,
    tasks,
    loading,
    isOverwhelmed,
    loadTasks,
    completeTask,
    getNextAction,
  } = useOnboarding();

  const [celebration, setCelebration] = useState<string | null>(null);
  const celebrationAnim = React.useRef(new Animated.Value(0)).current;

  // Load tasks when progress changes
  useEffect(() => {
    if (progress?.current_stage) {
      loadTasks(progress.current_stage);
    }
  }, [progress?.current_stage, loadTasks]);

  // Handle task completion
  const handleCompleteTask = async (taskId: string) => {
    const result = await completeTask(taskId);
    if (result.celebration) {
      showCelebration(result.celebration);
    }
  };

  // Show celebration animation
  const showCelebration = (message: string) => {
    setCelebration(message);
    Animated.sequence([
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(celebrationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setCelebration(null));
  };

  if (loading && !progress) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Lade...</Text>
      </View>
    );
  }

  if (!progress) return null;

  // Stage Labels
  const stageLabels: Record<string, string> = {
    day_1: 'Tag 1 - Los geht\'s!',
    days_2_3: 'Tag 2-3 - Erste Schritte',
    days_4_7: 'Tag 4-7 - Momentum aufbauen',
    days_8_14: 'Tag 8-14 - Routinen festigen',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stageLabel}>
          {stageLabels[progress.current_stage] || progress.current_stage}
        </Text>
        <Text style={styles.dayCount}>
          Tag {progress.days_since_start}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progress.completion_percent}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {progress.tasks_completed}/{progress.tasks_total} Tasks
        </Text>
      </View>

      {/* Milestones */}
      <View style={styles.milestones}>
        <MilestoneBadge 
          label="Erste Nachricht" 
          completed={progress.first_contact_sent}
          emoji="📤"
        />
        <MilestoneBadge 
          label="Erste Antwort" 
          completed={progress.first_reply_received}
          emoji="📥"
        />
        <MilestoneBadge 
          label="Erster Sale" 
          completed={progress.first_sale}
          emoji="🏆"
        />
      </View>

      {/* Overwhelm Message */}
      {isOverwhelmed && progress.message && (
        <View style={styles.overwhelmCard}>
          <Text style={styles.overwhelmEmoji}>🌿</Text>
          <Text style={styles.overwhelmText}>{progress.message}</Text>
          <Text style={styles.overwhelmHint}>
            Konzentrier dich auf eine Sache:
          </Text>
          {progress.next_task && (
            <TouchableOpacity 
              style={styles.singleAction}
              onPress={() => onTaskPress?.(progress.next_task!.id)}
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

      {/* Next Task (wenn nicht overwhelmed) */}
      {!isOverwhelmed && progress.next_task && (
        <TouchableOpacity 
          style={styles.nextTaskCard}
          onPress={() => onTaskPress?.(progress.next_task!.id)}
        >
          <Text style={styles.nextTaskLabel}>Nächster Schritt:</Text>
          <Text style={styles.nextTaskTitle}>{progress.next_task.title}</Text>
          <Text style={styles.nextTaskDesc}>{progress.next_task.description}</Text>
          <View style={styles.nextTaskMeta}>
            <Text style={styles.nextTaskTime}>
              ⏱️ ~{progress.next_task.estimated_minutes} Min.
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Task List */}
      {showTasks && !isOverwhelmed && (
        <View style={styles.taskList}>
          <Text style={styles.taskListHeader}>Alle Tasks</Text>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskItem,
                task.is_completed && styles.taskItemCompleted,
              ]}
              onPress={() => 
                task.is_completed 
                  ? null 
                  : handleCompleteTask(task.id)
              }
              disabled={task.is_completed}
            >
              <View style={styles.taskCheckbox}>
                {task.is_completed ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <View style={styles.checkboxEmpty} />
                )}
              </View>
              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskTitle,
                  task.is_completed && styles.taskTitleCompleted,
                ]}>
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

      {/* Celebration Overlay */}
      {celebration && (
        <Animated.View 
          style={[
            styles.celebration,
            { opacity: celebrationAnim }
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

function MilestoneBadge({ 
  label, 
  completed, 
  emoji 
}: { 
  label: string; 
  completed: boolean; 
  emoji: string;
}) {
  return (
    <View style={[
      styles.milestoneBadge,
      completed && styles.milestoneBadgeCompleted,
    ]}>
      <Text style={styles.milestoneEmoji}>
        {completed ? emoji : '⬜'}
      </Text>
      <Text style={[
        styles.milestoneLabel,
        completed && styles.milestoneLabelCompleted,
      ]}>
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
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    margin: 16,
  },
  loadingText: {
    color: '#a0a0a0',
    textAlign: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stageLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  dayCount: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2d2d44',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#a0a0a0',
    textAlign: 'right',
  },
  milestones: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  milestoneBadge: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2d2d44',
    minWidth: 80,
  },
  milestoneBadgeCompleted: {
    backgroundColor: '#10b981',
  },
  milestoneEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  milestoneLabel: {
    fontSize: 11,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  milestoneLabelCompleted: {
    color: '#ffffff',
  },
  overwhelmCard: {
    backgroundColor: '#2d2d44',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 16,
  },
  overwhelmEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  overwhelmText: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 12,
    lineHeight: 20,
  },
  overwhelmHint: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 8,
  },
  singleAction: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  singleActionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  singleActionTime: {
    color: '#ffffff',
    opacity: 0.8,
    fontSize: 12,
  },
  nextTaskCard: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  nextTaskLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 4,
  },
  nextTaskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  nextTaskDesc: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 8,
    lineHeight: 20,
  },
  nextTaskMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  nextTaskTime: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  taskList: {
    marginTop: 8,
  },
  taskListHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0a0a0',
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2d2d44',
    borderRadius: 8,
    marginBottom: 8,
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxEmpty: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#4a4a5a',
    borderRadius: 4,
  },
  checkmark: {
    fontSize: 18,
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
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 2,
  },
  celebration: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: '#10b981',
    padding: 20,
    borderRadius: 16,
    width: 200,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default OnboardingProgress;

