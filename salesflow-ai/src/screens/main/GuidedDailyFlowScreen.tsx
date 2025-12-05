/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  GUIDED DAILY FLOW SCREEN - NetworkerOS                                    ║
 * ║  Kombiniert: DMO Tracker + Check-ins + Vorgeschlagene Kontakte             ║
 * ║                                                                            ║
 * ║  Der zentrale Screen für den täglichen Workflow:                           ║
 * ║  1. DMO Fortschritt auf einen Blick                                        ║
 * ║  2. Fällige Check-ins (Follow-ups)                                         ║
 * ║  3. Vorgeschlagene Kontakte für heute                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Animated,
} from 'react-native';
import { AURA_COLORS, AURA_SHADOWS, AURA_SPACING, AURA_RADIUS } from '../../components/aura/theme';

// =============================================================================
// TYPES
// =============================================================================

interface DMOSummary {
  newContacts: { current: number; target: number };
  checkIns: { current: number; target: number };
  reactivations: { current: number; target: number };
  calls: { current: number; target: number };
  completionRate: number;
}

interface CheckIn {
  id: string;
  leadName: string;
  action: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  isOverdue: boolean;
  disgType?: 'D' | 'I' | 'S' | 'G';
  suggestedMessage?: string;
}

interface SuggestedContact {
  id: string;
  name: string;
  reason: string;
  lastContact: string;
  score: number;
  disgType?: 'D' | 'I' | 'S' | 'G';
  suggestedAction: string;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const getMockDMOSummary = (): DMOSummary => ({
  newContacts: { current: 3, target: 8 },
  checkIns: { current: 4, target: 6 },
  reactivations: { current: 1, target: 2 },
  calls: { current: 2, target: 3 },
  completionRate: 52,
});

const getMockCheckIns = (): CheckIn[] => [
  {
    id: '1',
    leadName: 'Sarah M.',
    action: 'Nachfragen wegen Produktinteresse',
    dueDate: 'Heute',
    priority: 'high',
    isOverdue: false,
    disgType: 'I',
    suggestedMessage: 'Hey Sarah! 🌟 Wie geht\'s dir? Hatte noch an unser Gespräch über die Produkte gedacht...',
  },
  {
    id: '2',
    leadName: 'Thomas K.',
    action: 'Business-Möglichkeit ansprechen',
    dueDate: 'Überfällig (2 Tage)',
    priority: 'high',
    isOverdue: true,
    disgType: 'D',
    suggestedMessage: 'Hi Thomas, kurz und direkt: Hast du 15 Minuten für ein Gespräch über die Geschäftsmöglichkeit?',
  },
  {
    id: '3',
    leadName: 'Lisa R.',
    action: 'Testergebnis besprechen',
    dueDate: 'Heute',
    priority: 'medium',
    isOverdue: false,
    disgType: 'S',
    suggestedMessage: 'Liebe Lisa, ich hoffe es geht dir gut! Ich wollte mal nachfragen, wie es dir mit dem Test geht...',
  },
];

const getMockSuggestedContacts = (): SuggestedContact[] => [
  {
    id: '1',
    name: 'Michael B.',
    reason: 'Hat auf Instagram geliked',
    lastContact: 'Vor 3 Tagen',
    score: 85,
    disgType: 'I',
    suggestedAction: 'Story Reply',
  },
  {
    id: '2',
    name: 'Anna S.',
    reason: 'Geburtstag heute! 🎂',
    lastContact: 'Vor 2 Wochen',
    score: 70,
    disgType: 'S',
    suggestedAction: 'Gratulieren',
  },
  {
    id: '3',
    name: 'Peter W.',
    reason: 'Neue Position bei LinkedIn',
    lastContact: 'Vor 1 Monat',
    score: 65,
    disgType: 'D',
    suggestedAction: 'Gratulieren',
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const DISG_CONFIG = {
  D: { label: 'Dominant', color: '#ef4444', icon: '🔴' },
  I: { label: 'Initiativ', color: '#f59e0b', icon: '🟡' },
  S: { label: 'Stetig', color: '#22c55e', icon: '🟢' },
  G: { label: 'Gewissenhaft', color: '#3b82f6', icon: '🔵' },
};

const DISGBadge = ({ type }: { type?: 'D' | 'I' | 'S' | 'G' }) => {
  if (!type || !DISG_CONFIG[type]) return null;
  const config = DISG_CONFIG[type];
  
  return (
    <View style={[styles.disgBadge, { backgroundColor: config.color + '20' }]}>
      <Text style={styles.disgBadgeText}>{config.icon}</Text>
    </View>
  );
};

const PriorityBadge = ({ priority }: { priority: 'high' | 'medium' | 'low' }) => {
  const colors = {
    high: AURA_COLORS.neon.rose,
    medium: AURA_COLORS.neon.amber,
    low: AURA_COLORS.neon.green,
  };
  const labels = {
    high: '🔥 Wichtig',
    medium: '⚡ Mittel',
    low: '📌 Normal',
  };
  
  return (
    <View style={[styles.priorityBadge, { backgroundColor: colors[priority] + '20' }]}>
      <Text style={[styles.priorityBadgeText, { color: colors[priority] }]}>
        {labels[priority]}
      </Text>
    </View>
  );
};

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

interface DMOOverviewProps {
  summary: DMOSummary;
  onPress: () => void;
}

const DMOOverview: React.FC<DMOOverviewProps> = ({ summary, onPress }) => {
  const getProgressColor = (rate: number) => {
    if (rate >= 80) return AURA_COLORS.neon.green;
    if (rate >= 50) return AURA_COLORS.neon.amber;
    return AURA_COLORS.neon.rose;
  };

  return (
    <TouchableOpacity style={styles.dmoCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.dmoHeader}>
        <View>
          <Text style={styles.dmoTitle}>📊 DMO Status</Text>
          <Text style={styles.dmoSubtitle}>Daily Method of Operation</Text>
        </View>
        <View style={[styles.dmoBadge, { backgroundColor: getProgressColor(summary.completionRate) }]}>
          <Text style={styles.dmoBadgeText}>{summary.completionRate}%</Text>
        </View>
      </View>
      
      <View style={styles.dmoMetrics}>
        <View style={styles.dmoMetric}>
          <Text style={styles.dmoMetricValue}>
            {summary.newContacts.current}/{summary.newContacts.target}
          </Text>
          <Text style={styles.dmoMetricLabel}>Kontakte</Text>
        </View>
        <View style={styles.dmoMetricDivider} />
        <View style={styles.dmoMetric}>
          <Text style={styles.dmoMetricValue}>
            {summary.checkIns.current}/{summary.checkIns.target}
          </Text>
          <Text style={styles.dmoMetricLabel}>Check-ins</Text>
        </View>
        <View style={styles.dmoMetricDivider} />
        <View style={styles.dmoMetric}>
          <Text style={styles.dmoMetricValue}>
            {summary.reactivations.current}/{summary.reactivations.target}
          </Text>
          <Text style={styles.dmoMetricLabel}>Reaktiv.</Text>
        </View>
        <View style={styles.dmoMetricDivider} />
        <View style={styles.dmoMetric}>
          <Text style={styles.dmoMetricValue}>
            {summary.calls.current}/{summary.calls.target}
          </Text>
          <Text style={styles.dmoMetricLabel}>Calls</Text>
        </View>
      </View>
      
      <View style={styles.dmoProgressBar}>
        <View 
          style={[
            styles.dmoProgressFill, 
            { 
              width: `${summary.completionRate}%`,
              backgroundColor: getProgressColor(summary.completionRate),
            }
          ]} 
        />
      </View>
      
      <Text style={styles.dmoHint}>Tippe für Details →</Text>
    </TouchableOpacity>
  );
};

interface CheckInCardProps {
  checkIn: CheckIn;
  onComplete: () => void;
  onPress: () => void;
}

const CheckInCard: React.FC<CheckInCardProps> = ({ checkIn, onComplete, onPress }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.checkInCard,
        checkIn.isOverdue && styles.checkInCardOverdue,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.checkInHeader}>
        <View style={styles.checkInLeft}>
          <DISGBadge type={checkIn.disgType} />
          <View style={styles.checkInInfo}>
            <Text style={styles.checkInName}>{checkIn.leadName}</Text>
            <Text style={styles.checkInAction} numberOfLines={1}>{checkIn.action}</Text>
          </View>
        </View>
        <PriorityBadge priority={checkIn.priority} />
      </View>
      
      <Text style={[
        styles.checkInDue,
        checkIn.isOverdue && styles.checkInDueOverdue,
      ]}>
        📅 {checkIn.dueDate}
      </Text>
      
      {checkIn.suggestedMessage && (
        <View style={styles.suggestedMessage}>
          <Text style={styles.suggestedMessageLabel}>💬 Vorschlag:</Text>
          <Text style={styles.suggestedMessageText} numberOfLines={2}>
            {checkIn.suggestedMessage}
          </Text>
        </View>
      )}
      
      <View style={styles.checkInActions}>
        <TouchableOpacity 
          style={styles.checkInCompleteBtn}
          onPress={onComplete}
        >
          <Text style={styles.checkInCompleteBtnText}>✓ Erledigt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkInCopyBtn}>
          <Text style={styles.checkInCopyBtnText}>📋 Kopieren</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

interface SuggestedContactCardProps {
  contact: SuggestedContact;
  onPress: () => void;
}

const SuggestedContactCard: React.FC<SuggestedContactCardProps> = ({ contact, onPress }) => {
  return (
    <TouchableOpacity style={styles.suggestedCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.suggestedHeader}>
        <DISGBadge type={contact.disgType} />
        <View style={styles.suggestedInfo}>
          <Text style={styles.suggestedName}>{contact.name}</Text>
          <Text style={styles.suggestedReason}>{contact.reason}</Text>
        </View>
        <View style={styles.suggestedScore}>
          <Text style={styles.suggestedScoreValue}>{contact.score}</Text>
          <Text style={styles.suggestedScoreLabel}>Score</Text>
        </View>
      </View>
      
      <View style={styles.suggestedMeta}>
        <Text style={styles.suggestedLastContact}>🕐 {contact.lastContact}</Text>
        <View style={styles.suggestedActionBadge}>
          <Text style={styles.suggestedActionText}>{contact.suggestedAction}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// =============================================================================
// MAIN SCREEN
// =============================================================================

interface GuidedDailyFlowScreenProps {
  navigation: any;
}

export default function GuidedDailyFlowScreen({ navigation }: GuidedDailyFlowScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dmoSummary, setDmoSummary] = useState<DMOSummary | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [suggestedContacts, setSuggestedContacts] = useState<SuggestedContact[]>([]);
  
  // Animation for greeting
  const fadeAnim = useState(new Animated.Value(0))[0];

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDmoSummary(getMockDMOSummary());
      setCheckIns(getMockCheckIns());
      setSuggestedContacts(getMockSuggestedContacts());
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      console.error('Failed to load daily flow data:', error);
    } finally {
      setLoading(false);
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // =============================================================================
  // HELPERS
  // =============================================================================

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen! ☀️';
    if (hour < 18) return 'Guten Tag! 🌤️';
    return 'Guten Abend! 🌙';
  };

  const handleCompleteCheckIn = (id: string) => {
    setCheckIns(prev => prev.filter(c => c.id !== id));
    // TODO: API call to mark as complete
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading && !dmoSummary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Lade deinen Tagesplan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AURA_COLORS.neon.cyan}
          />
        }
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.headerTitle}>Dein Guided Daily Flow</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString('de-DE', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
          </View>

          {/* DMO Overview */}
          {dmoSummary && (
            <DMOOverview 
              summary={dmoSummary}
              onPress={() => navigation.navigate('DMOTracker')}
            />
          )}

          {/* Check-ins Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔄 Fällige Check-ins</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{checkIns.length}</Text>
              </View>
            </View>
            
            {checkIns.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>✅</Text>
                <Text style={styles.emptyStateText}>Alle Check-ins erledigt!</Text>
              </View>
            ) : (
              checkIns.map(checkIn => (
                <CheckInCard
                  key={checkIn.id}
                  checkIn={checkIn}
                  onComplete={() => handleCompleteCheckIn(checkIn.id)}
                  onPress={() => navigation.navigate('FollowUps', { checkInId: checkIn.id })}
                />
              ))
            )}
          </View>

          {/* Suggested Contacts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💡 Vorgeschlagene Kontakte</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Kontakte')}>
                <Text style={styles.sectionLink}>Alle →</Text>
              </TouchableOpacity>
            </View>
            
            {suggestedContacts.map(contact => (
              <SuggestedContactCard
                key={contact.id}
                contact={contact}
                onPress={() => navigation.navigate('Kontakte', { contactId: contact.id })}
              />
            ))}
          </View>

          {/* MENTOR Quick Access */}
          <TouchableOpacity 
            style={styles.mentorCard}
            onPress={() => navigation.navigate('Chat', {
              initialMessage: 'Was sollte ich heute als erstes tun?',
            })}
          >
            <Text style={styles.mentorIcon}>🧠</Text>
            <View style={styles.mentorContent}>
              <Text style={styles.mentorTitle}>MENTOR fragen</Text>
              <Text style={styles.mentorSubtitle}>
                "Was sollte ich heute als erstes tun?"
              </Text>
            </View>
            <Text style={styles.mentorArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    padding: AURA_SPACING.md,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: AURA_COLORS.text.muted,
    fontSize: 16,
  },

  // Header
  header: {
    marginBottom: AURA_SPACING.lg,
    paddingTop: AURA_SPACING.md,
  },
  greeting: {
    fontSize: 16,
    color: AURA_COLORS.neon.cyan,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },

  // DMO Card
  dmoCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.lg,
    marginBottom: AURA_SPACING.lg,
    borderWidth: 1,
    borderColor: AURA_COLORS.neon.cyan,
    ...AURA_SHADOWS.glass,
  },
  dmoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: AURA_SPACING.md,
  },
  dmoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  dmoSubtitle: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  dmoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AURA_RADIUS.lg,
  },
  dmoBadgeText: {
    color: AURA_COLORS.bg.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  dmoMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: AURA_SPACING.md,
  },
  dmoMetric: {
    alignItems: 'center',
  },
  dmoMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: AURA_COLORS.text.primary,
  },
  dmoMetricLabel: {
    fontSize: 11,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  dmoMetricDivider: {
    width: 1,
    backgroundColor: AURA_COLORS.glass.border,
  },
  dmoProgressBar: {
    height: 8,
    backgroundColor: AURA_COLORS.bg.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: AURA_SPACING.sm,
  },
  dmoProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dmoHint: {
    fontSize: 12,
    color: AURA_COLORS.neon.cyan,
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: AURA_SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AURA_SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  sectionBadge: {
    backgroundColor: AURA_COLORS.neon.purple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AURA_RADIUS.full,
  },
  sectionBadgeText: {
    color: AURA_COLORS.text.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionLink: {
    color: AURA_COLORS.neon.cyan,
    fontSize: 14,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: AURA_SPACING.xl,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: AURA_SPACING.sm,
  },
  emptyStateText: {
    color: AURA_COLORS.text.muted,
    fontSize: 14,
  },

  // DISG Badge
  disgBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AURA_SPACING.sm,
  },
  disgBadgeText: {
    fontSize: 14,
  },

  // Priority Badge
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AURA_RADIUS.sm,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Check-in Card
  checkInCard: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.md,
    marginBottom: AURA_SPACING.sm,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  checkInCardOverdue: {
    borderColor: AURA_COLORS.neon.rose,
    backgroundColor: AURA_COLORS.neon.roseSubtle,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AURA_SPACING.sm,
  },
  checkInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkInInfo: {
    flex: 1,
  },
  checkInName: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  checkInAction: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  checkInDue: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginBottom: AURA_SPACING.sm,
  },
  checkInDueOverdue: {
    color: AURA_COLORS.neon.rose,
    fontWeight: '600',
  },
  suggestedMessage: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.md,
    padding: AURA_SPACING.sm,
    marginBottom: AURA_SPACING.sm,
  },
  suggestedMessageLabel: {
    fontSize: 11,
    color: AURA_COLORS.neon.cyan,
    marginBottom: 4,
  },
  suggestedMessageText: {
    fontSize: 13,
    color: AURA_COLORS.text.secondary,
    fontStyle: 'italic',
  },
  checkInActions: {
    flexDirection: 'row',
    gap: AURA_SPACING.sm,
  },
  checkInCompleteBtn: {
    flex: 1,
    backgroundColor: AURA_COLORS.neon.green,
    paddingVertical: 10,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
  },
  checkInCompleteBtnText: {
    color: AURA_COLORS.bg.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  checkInCopyBtn: {
    paddingVertical: 10,
    paddingHorizontal: AURA_SPACING.md,
    borderRadius: AURA_RADIUS.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    alignItems: 'center',
  },
  checkInCopyBtnText: {
    color: AURA_COLORS.text.muted,
    fontSize: 14,
  },

  // Suggested Contact Card
  suggestedCard: {
    backgroundColor: AURA_COLORS.bg.secondary,
    borderRadius: AURA_RADIUS.lg,
    padding: AURA_SPACING.md,
    marginBottom: AURA_SPACING.sm,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  suggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AURA_SPACING.sm,
  },
  suggestedInfo: {
    flex: 1,
  },
  suggestedName: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  suggestedReason: {
    fontSize: 13,
    color: AURA_COLORS.neon.amber,
    marginTop: 2,
  },
  suggestedScore: {
    alignItems: 'center',
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AURA_RADIUS.md,
  },
  suggestedScoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AURA_COLORS.neon.cyan,
  },
  suggestedScoreLabel: {
    fontSize: 9,
    color: AURA_COLORS.text.muted,
  },
  suggestedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestedLastContact: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
  suggestedActionBadge: {
    backgroundColor: AURA_COLORS.neon.purpleSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AURA_RADIUS.full,
  },
  suggestedActionText: {
    fontSize: 11,
    color: AURA_COLORS.neon.purple,
    fontWeight: '500',
  },

  // MENTOR Card
  mentorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.neon.cyan,
    marginTop: AURA_SPACING.md,
  },
  mentorIcon: {
    fontSize: 32,
    marginRight: AURA_SPACING.md,
  },
  mentorContent: {
    flex: 1,
  },
  mentorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  mentorSubtitle: {
    fontSize: 12,
    color: AURA_COLORS.neon.cyan,
    marginTop: 2,
    fontStyle: 'italic',
  },
  mentorArrow: {
    fontSize: 20,
    color: AURA_COLORS.neon.cyan,
  },
});

