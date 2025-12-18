/**
 * 📊 DMO TRACKER - Daily Method of Operation
 * 
 * Komplette React Native Komponente für Network Marketing
 * Trackt tägliche einkommensproduzierende Aktivitäten
 * 
 * @version 2.0
 * @author NetworkerOS Team
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface DMOActivity {
  id: string;
  label: string;
  emoji: string;
  target: number;
  completed: number;
  color: string;
  description: string;
}

interface DMOState {
  date: string;
  activities: DMOActivity[];
  streakDays: number;
  totalPoints: number;
  lastCompletedDate: string | null;
}

interface ProspectSuggestion {
  id: string;
  name: string;
  avatar?: string;
  disg: 'D' | 'I' | 'S' | 'G' | null;
  lastContact: string;
  reason: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#6366F1',      // Indigo
  secondary: '#8B5CF6',    // Purple
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  danger: '#EF4444',       // Red
  background: '#0F172A',   // Dark blue
  card: '#1E293B',         // Slate
  cardLight: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#475569',
};

const DEFAULT_ACTIVITIES: DMOActivity[] = [
  {
    id: 'new_contacts',
    label: 'Neue Kontakte',
    emoji: '👋',
    target: 5,
    completed: 0,
    color: '#6366F1',
    description: 'Neue Menschen ansprechen',
  },
  {
    id: 'followups',
    label: 'Follow-Ups',
    emoji: '🔄',
    target: 3,
    completed: 0,
    color: '#8B5CF6',
    description: 'Bei Prospects nachfassen',
  },
  {
    id: 'presentations',
    label: 'Präsentationen',
    emoji: '🎬',
    target: 1,
    completed: 0,
    color: '#EC4899',
    description: 'Business zeigen',
  },
  {
    id: 'social_posts',
    label: 'Social Posts',
    emoji: '📱',
    target: 2,
    completed: 0,
    color: '#14B8A6',
    description: 'Content veröffentlichen',
  },
];

const MOTIVATIONAL_QUOTES = [
  "Jedes NEIN bringt dich näher zum JA! 💪",
  "Konsistenz schlägt Talent. Jeden Tag! 🔥",
  "Dein Future Self wird dir danken! 🚀",
  "Die besten Networker wurden auch abgelehnt. Mach weiter! 👊",
  "Ein Gespräch kann alles verändern. Führe es! 🎯",
  "Kleine Schritte, große Ergebnisse. Du schaffst das! ✨",
  "Heute ist der perfekte Tag für deinen Durchbruch! 🌟",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getProgressPercentage = (completed: number, target: number): number => {
  return Math.min(100, Math.round((completed / target) * 100));
};

const getTotalProgress = (activities: DMOActivity[]): number => {
  const totalCompleted = activities.reduce((sum, a) => sum + a.completed, 0);
  const totalTarget = activities.reduce((sum, a) => sum + a.target, 0);
  return getProgressPercentage(totalCompleted, totalTarget);
};

const getRandomQuote = (): string => {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
};

const getDISGColor = (disg: 'D' | 'I' | 'S' | 'G' | null): string => {
  switch (disg) {
    case 'D': return '#EF4444'; // Red
    case 'I': return '#F59E0B'; // Yellow
    case 'S': return '#10B981'; // Green
    case 'G': return '#3B82F6'; // Blue
    default: return '#6B7280';  // Gray
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Streak Display Component
 */
const StreakBadge: React.FC<{ days: number }> = ({ days }) => {
  const streakEmojis = useMemo(() => {
    const emojis = [];
    for (let i = 0; i < Math.min(days, 7); i++) {
      emojis.push('🔥');
    }
    for (let i = days; i < 7; i++) {
      emojis.push('⬜');
    }
    return emojis;
  }, [days]);

  return (
    <View style={styles.streakContainer}>
      <Text style={styles.streakLabel}>7-TAGE STREAK</Text>
      <View style={styles.streakEmojis}>
        {streakEmojis.map((emoji, index) => (
          <Text key={index} style={styles.streakEmoji}>{emoji}</Text>
        ))}
      </View>
      <Text style={styles.streakCount}>{days} Tage</Text>
    </View>
  );
};

/**
 * Progress Ring Component
 */
const ProgressRing: React.FC<{ 
  progress: number; 
  size?: number;
  strokeWidth?: number;
}> = ({ progress, size = 120, strokeWidth = 12 }) => {
  const animatedProgress = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: progress,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [progress]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  return (
    <View style={[styles.progressRingContainer, { width: size, height: size }]}>
      <View style={styles.progressRingBackground}>
        <View 
          style={[
            styles.progressRingTrack, 
            { 
              width: size, 
              height: size, 
              borderRadius: size / 2,
              borderWidth: strokeWidth,
            }
          ]} 
        />
      </View>
      <View style={styles.progressRingContent}>
        <Text style={styles.progressRingPercentage}>{progress}%</Text>
        <Text style={styles.progressRingLabel}>erledigt</Text>
      </View>
    </View>
  );
};

/**
 * Activity Card Component
 */
const ActivityCard: React.FC<{
  activity: DMOActivity;
  onIncrement: () => void;
  onDecrement: () => void;
  onLongPress: () => void;
}> = ({ activity, onIncrement, onDecrement, onLongPress }) => {
  const progress = getProgressPercentage(activity.completed, activity.target);
  const isComplete = activity.completed >= activity.target;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Haptic Feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Scale Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onIncrement();
  };

  return (
    <Animated.View style={[styles.activityCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity 
        style={styles.activityCardInner}
        onPress={handlePress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
      >
        {/* Left Side - Icon & Info */}
        <View style={styles.activityLeft}>
          <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
            <Text style={styles.activityEmoji}>{activity.emoji}</Text>
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityLabel}>{activity.label}</Text>
            <Text style={styles.activityDescription}>{activity.description}</Text>
          </View>
        </View>

        {/* Right Side - Counter */}
        <View style={styles.activityRight}>
          <View style={styles.counterContainer}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDecrement();
              }}
            >
              <Text style={styles.counterButtonText}>−</Text>
            </TouchableOpacity>
            
            <View style={styles.counterDisplay}>
              <Text style={[
                styles.counterValue,
                isComplete && styles.counterValueComplete
              ]}>
                {activity.completed}
              </Text>
              <Text style={styles.counterDivider}>/</Text>
              <Text style={styles.counterTarget}>{activity.target}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.counterButton, styles.counterButtonPlus]}
              onPress={handlePress}
            >
              <Text style={[styles.counterButtonText, styles.counterButtonTextPlus]}>+</Text>
            </TouchableOpacity>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.activityProgressContainer}>
            <View style={styles.activityProgressTrack}>
              <View 
                style={[
                  styles.activityProgressFill,
                  { 
                    width: `${progress}%`,
                    backgroundColor: isComplete ? COLORS.success : activity.color,
                  }
                ]} 
              />
            </View>
            {isComplete && <Text style={styles.completeCheck}>✅</Text>}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Prospect Suggestion Card
 */
const ProspectSuggestionCard: React.FC<{
  prospect: ProspectSuggestion;
  onContact: () => void;
  onDismiss: () => void;
}> = ({ prospect, onContact, onDismiss }) => (
  <View style={styles.prospectCard}>
    <View style={styles.prospectLeft}>
      <View style={styles.prospectAvatar}>
        <Text style={styles.prospectAvatarText}>
          {prospect.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </Text>
        {prospect.disg && (
          <View style={[styles.disgBadge, { backgroundColor: getDISGColor(prospect.disg) }]}>
            <Text style={styles.disgBadgeText}>{prospect.disg}</Text>
          </View>
        )}
      </View>
      <View style={styles.prospectInfo}>
        <Text style={styles.prospectName}>{prospect.name}</Text>
        <Text style={styles.prospectReason}>{prospect.reason}</Text>
        <Text style={styles.prospectLastContact}>Letzter Kontakt: {prospect.lastContact}</Text>
      </View>
    </View>
    <View style={styles.prospectActions}>
      <TouchableOpacity 
        style={[styles.prospectButton, styles.prospectButtonPrimary]}
        onPress={onContact}
      >
        <Text style={styles.prospectButtonText}>📩 Schreiben</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Motivation Banner
 */
const MotivationBanner: React.FC<{ quote: string }> = ({ quote }) => (
  <LinearGradient
    colors={['#6366F1', '#8B5CF6']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.motivationBanner}
  >
    <Text style={styles.motivationQuote}>{quote}</Text>
    <Text style={styles.motivationLabel}>— MENTOR AI</Text>
  </LinearGradient>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DMOTracker: React.FC = () => {
  // State
  const [dmoState, setDmoState] = useState<DMOState>({
    date: getToday(),
    activities: DEFAULT_ACTIVITIES,
    streakDays: 0,
    totalPoints: 0,
    lastCompletedDate: null,
  });
  const [suggestedProspects, setSuggestedProspects] = useState<ProspectSuggestion[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DMOActivity | null>(null);
  const [motivationalQuote, setMotivationalQuote] = useState(getRandomQuote());
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculated Values
  const totalProgress = useMemo(() => getTotalProgress(dmoState.activities), [dmoState.activities]);
  const isAllComplete = useMemo(
    () => dmoState.activities.every(a => a.completed >= a.target),
    [dmoState.activities]
  );

  // Load Data on Mount
  useEffect(() => {
    loadDMOData();
    loadSuggestedProspects();
  }, []);

  // Check for Day Change
  useEffect(() => {
    const today = getToday();
    if (dmoState.date !== today) {
      handleDayChange(today);
    }
  }, [dmoState.date]);

  // Check for Completion
  useEffect(() => {
    if (isAllComplete && !showCelebration) {
      handleDayComplete();
    }
  }, [isAllComplete]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadDMOData = async () => {
    try {
      const stored = await AsyncStorage.getItem('dmo_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Check if stored data is from today
        if (parsed.date === getToday()) {
          setDmoState(parsed);
        } else {
          // Reset for new day but keep streak
          handleDayChange(getToday(), parsed);
        }
      }
    } catch (error) {
      console.error('Error loading DMO data:', error);
    }
  };

  const saveDMOData = async (state: DMOState) => {
    try {
      await AsyncStorage.setItem('dmo_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving DMO data:', error);
    }
  };

  const loadSuggestedProspects = async () => {
    // TODO: Replace with actual API call
    // For now, using mock data
    const mockProspects: ProspectSuggestion[] = [
      {
        id: '1',
        name: 'Maria Schmidt',
        disg: 'I',
        lastContact: 'Vor 3 Tagen',
        reason: 'Hat Interesse an Produkten gezeigt',
      },
      {
        id: '2',
        name: 'Thomas Müller',
        disg: 'D',
        lastContact: 'Vor 5 Tagen',
        reason: 'Follow-Up nach Präsentation',
      },
      {
        id: '3',
        name: 'Sandra Weber',
        disg: 'S',
        lastContact: 'Vor 1 Woche',
        reason: 'Wollte mit Partner sprechen',
      },
    ];
    setSuggestedProspects(mockProspects);
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleDayChange = (newDate: string, previousState?: DMOState) => {
    const prev = previousState || dmoState;
    const wasComplete = prev.activities.every(a => a.completed >= a.target);
    
    // Calculate new streak
    let newStreak = prev.streakDays;
    if (wasComplete && prev.lastCompletedDate === prev.date) {
      // Yesterday was complete, increment streak
      newStreak += 1;
    } else if (!wasComplete) {
      // Yesterday was not complete, reset streak
      newStreak = 0;
    }

    const newState: DMOState = {
      date: newDate,
      activities: DEFAULT_ACTIVITIES.map(a => ({ ...a, completed: 0 })),
      streakDays: newStreak,
      totalPoints: prev.totalPoints,
      lastCompletedDate: prev.lastCompletedDate,
    };

    setDmoState(newState);
    saveDMOData(newState);
    setMotivationalQuote(getRandomQuote());
  };

  const handleDayComplete = () => {
    setShowCelebration(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const newState = {
      ...dmoState,
      lastCompletedDate: dmoState.date,
      totalPoints: dmoState.totalPoints + 100, // Bonus points for completion
    };
    
    setDmoState(newState);
    saveDMOData(newState);

    // Hide celebration after 3 seconds
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const handleIncrement = (activityId: string) => {
    setDmoState(prev => {
      const newActivities = prev.activities.map(a => {
        if (a.id === activityId) {
          const newCompleted = Math.min(a.completed + 1, a.target * 2); // Max 2x target
          return { ...a, completed: newCompleted };
        }
        return a;
      });

      const newState = {
        ...prev,
        activities: newActivities,
        totalPoints: prev.totalPoints + 10, // Points per activity
      };
      
      saveDMOData(newState);
      return newState;
    });
  };

  const handleDecrement = (activityId: string) => {
    setDmoState(prev => {
      const newActivities = prev.activities.map(a => {
        if (a.id === activityId) {
          return { ...a, completed: Math.max(0, a.completed - 1) };
        }
        return a;
      });

      const newState = {
        ...prev,
        activities: newActivities,
        totalPoints: Math.max(0, prev.totalPoints - 10),
      };
      
      saveDMOData(newState);
      return newState;
    });
  };

  const handleEditActivity = (activity: DMOActivity) => {
    setEditingActivity(activity);
    setShowEditModal(true);
  };

  const handleSaveTarget = (newTarget: number) => {
    if (!editingActivity) return;
    
    setDmoState(prev => {
      const newActivities = prev.activities.map(a => {
        if (a.id === editingActivity.id) {
          return { ...a, target: newTarget };
        }
        return a;
      });

      const newState = { ...prev, activities: newActivities };
      saveDMOData(newState);
      return newState;
    });

    setShowEditModal(false);
    setEditingActivity(null);
  };

  const handleContactProspect = (prospect: ProspectSuggestion) => {
    // TODO: Navigate to compose message screen
    Alert.alert(
      'Nachricht an ' + prospect.name,
      'Öffne Chat mit ' + prospect.name + '?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Ja', onPress: () => console.log('Navigate to chat') },
      ]
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dein DMO</Text>
          <Text style={styles.headerSubtitle}>Daily Method of Operation</Text>
        </View>
        <StreakBadge days={dmoState.streakDays} />
      </View>

      {/* Progress Overview */}
      <View style={styles.progressSection}>
        <ProgressRing progress={totalProgress} size={140} />
        <View style={styles.progressStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{dmoState.totalPoints}</Text>
            <Text style={styles.statLabel}>Punkte</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {dmoState.activities.reduce((sum, a) => sum + a.completed, 0)}
            </Text>
            <Text style={styles.statLabel}>Aktivitäten</Text>
          </View>
        </View>
      </View>

      {/* Motivation Banner */}
      <MotivationBanner quote={motivationalQuote} />

      {/* Activities */}
      <View style={styles.activitiesSection}>
        <Text style={styles.sectionTitle}>📋 Heutige Aufgaben</Text>
        {dmoState.activities.map(activity => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onIncrement={() => handleIncrement(activity.id)}
            onDecrement={() => handleDecrement(activity.id)}
            onLongPress={() => handleEditActivity(activity)}
          />
        ))}
      </View>

      {/* Suggested Prospects */}
      {suggestedProspects.length > 0 && (
        <View style={styles.prospectsSection}>
          <Text style={styles.sectionTitle}>🎯 Vorgeschlagene Kontakte</Text>
          <Text style={styles.sectionSubtitle}>
            Basierend auf deinem letzten Kontakt
          </Text>
          {suggestedProspects.map(prospect => (
            <ProspectSuggestionCard
              key={prospect.id}
              prospect={prospect}
              onContact={() => handleContactProspect(prospect)}
              onDismiss={() => {
                setSuggestedProspects(prev => 
                  prev.filter(p => p.id !== prospect.id)
                );
              }}
            />
          ))}
        </View>
      )}

      {/* Bottom Spacer */}
      <View style={{ height: 100 }} />

      {/* Edit Target Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ziel anpassen</Text>
            <Text style={styles.modalLabel}>{editingActivity?.label}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              defaultValue={editingActivity?.target.toString()}
              onSubmitEditing={(e) => handleSaveTarget(parseInt(e.nativeEvent.text) || 1)}
              placeholder="Neues Ziel"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={() => handleSaveTarget(editingActivity?.target || 1)}
              >
                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Celebration Overlay */}
      {showCelebration && (
        <View style={styles.celebrationOverlay}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>GESCHAFFT!</Text>
          <Text style={styles.celebrationSubtitle}>
            Du hast dein DMO für heute abgeschlossen!
          </Text>
          <Text style={styles.celebrationStreak}>
            🔥 {dmoState.streakDays + 1} Tage Streak!
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Streak
  streakContainer: {
    alignItems: 'flex-end',
  },
  streakLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  streakEmojis: {
    flexDirection: 'row',
    gap: 2,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Progress Section
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  progressRingContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingBackground: {
    position: 'absolute',
  },
  progressRingTrack: {
    borderColor: COLORS.cardLight,
    backgroundColor: 'transparent',
  },
  progressRingContent: {
    alignItems: 'center',
  },
  progressRingPercentage: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressRingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },

  // Motivation Banner
  motivationBanner: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    borderRadius: 16,
  },
  motivationQuote: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  motivationLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
  },

  // Activities Section
  activitiesSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },

  // Activity Card
  activityCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  activityCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityEmoji: {
    fontSize: 24,
  },
  activityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  activityDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonPlus: {
    backgroundColor: COLORS.primary,
  },
  counterButtonText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  counterButtonTextPlus: {
    color: '#FFF',
  },
  counterDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 50,
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  counterValueComplete: {
    color: COLORS.success,
  },
  counterDivider: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  counterTarget: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  activityProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  activityProgressTrack: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardLight,
    overflow: 'hidden',
  },
  activityProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  completeCheck: {
    fontSize: 14,
  },

  // Prospects Section
  prospectsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  prospectCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prospectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prospectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  prospectAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  disgBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  disgBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  prospectInfo: {
    marginLeft: 12,
    flex: 1,
  },
  prospectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  prospectReason: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  prospectLastContact: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  prospectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  prospectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.cardLight,
  },
  prospectButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  prospectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.cardLight,
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Celebration Overlay
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  celebrationTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  celebrationStreak: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.warning,
  },
});

export default DMOTracker;
