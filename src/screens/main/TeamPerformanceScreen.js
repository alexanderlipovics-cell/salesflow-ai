/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - TEAM PERFORMANCE SCREEN                                         ║
 * ║  Zeigt Squad Success Patterns, Top-Performer & Mentoren                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useSuccessPatterns, useMentors } from '../../hooks/useSuccessPatterns';
import { 
  getPatternLabel, 
  getPatternEmoji, 
  getPatternColor,
  getMentorAreaLabel,
  getScoreLevel 
} from '../../services/successPatternsService';
import { COLORS, SHADOWS, SPACING, RADIUS } from '../../components/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN COLORS (Erweitert für visuelles Design)
// ═══════════════════════════════════════════════════════════════════════════

const PATTERN_STYLES = {
  elite_performer: {
    gradient: ['#FFD700', '#FFA500'],
    bg: '#FFFBEB',
    border: '#FCD34D',
    text: '#92400E'
  },
  script_master: {
    gradient: ['#8B5CF6', '#7C3AED'],
    bg: '#F5F3FF',
    border: '#C4B5FD',
    text: '#5B21B6'
  },
  closing_expert: {
    gradient: ['#10B981', '#059669'],
    bg: '#ECFDF5',
    border: '#6EE7B7',
    text: '#065F46'
  },
  timing_champion: {
    gradient: ['#F59E0B', '#D97706'],
    bg: '#FFFBEB',
    border: '#FCD34D',
    text: '#92400E'
  },
  solid_performer: {
    gradient: ['#3B82F6', '#2563EB'],
    bg: '#EFF6FF',
    border: '#93C5FD',
    text: '#1E40AF'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Score Ring - Visualisiert den Team-Score
 */
const ScoreRing = ({ score, size = 120 }) => {
  const { level, emoji, color } = getScoreLevel(score);
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const progress = (score / 100) * circumference;
  
  return (
    <View style={[styles.scoreRingContainer, { width: size, height: size }]}>
      {/* Background Ring */}
      <View style={[styles.scoreRingBg, { 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        borderWidth: 8
      }]} />
      
      {/* Progress Ring (simplified without SVG) */}
      <View style={[styles.scoreRingProgress, { 
        width: size - 16, 
        height: size - 16, 
        borderRadius: (size - 16) / 2,
        borderWidth: 8,
        borderColor: getScoreColor(score)
      }]} />
      
      {/* Center Content */}
      <View style={styles.scoreRingCenter}>
        <Text style={styles.scoreRingEmoji}>{emoji}</Text>
        <Text style={styles.scoreRingValue}>{Math.round(score)}</Text>
        <Text style={styles.scoreRingLabel}>{level}</Text>
      </View>
    </View>
  );
};

/**
 * Podium - Top 3 Performer Anzeige
 */
const Podium = ({ performers }) => {
  if (performers.length === 0) return null;
  
  // Reihenfolge: 2. Platz | 1. Platz | 3. Platz
  const [first, second, third] = [
    performers[0],
    performers[1],
    performers[2]
  ];
  
  return (
    <View style={styles.podiumContainer}>
      {/* 2. Platz */}
      <View style={styles.podiumPlace}>
        {second && (
          <>
            <View style={[styles.podiumAvatar, styles.podiumSecond]}>
              <Text style={styles.podiumAvatarText}>
                {second.full_name?.charAt(0) || '?'}
              </Text>
              <View style={styles.podiumBadge}>
                <Text style={styles.podiumBadgeText}>🥈</Text>
              </View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
              {second.full_name?.split(' ')[0] || 'User'}
            </Text>
            <Text style={styles.podiumScore}>{Math.round(second.success_score)}</Text>
            <View style={[styles.podiumBar, { height: 60, backgroundColor: '#C0C0C0' }]} />
          </>
        )}
      </View>
      
      {/* 1. Platz */}
      <View style={styles.podiumPlace}>
        {first && (
          <>
            <View style={[styles.podiumAvatar, styles.podiumFirst]}>
              <Text style={styles.podiumAvatarText}>
                {first.full_name?.charAt(0) || '?'}
              </Text>
              <View style={[styles.podiumBadge, styles.podiumBadgeGold]}>
                <Text style={styles.podiumBadgeText}>👑</Text>
              </View>
            </View>
            <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>
              {first.full_name?.split(' ')[0] || 'User'}
            </Text>
            <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
              {Math.round(first.success_score)}
            </Text>
            <View style={[styles.podiumBar, { height: 80, backgroundColor: '#FFD700' }]} />
          </>
        )}
      </View>
      
      {/* 3. Platz */}
      <View style={styles.podiumPlace}>
        {third && (
          <>
            <View style={[styles.podiumAvatar, styles.podiumThird]}>
              <Text style={styles.podiumAvatarText}>
                {third.full_name?.charAt(0) || '?'}
              </Text>
              <View style={styles.podiumBadge}>
                <Text style={styles.podiumBadgeText}>🥉</Text>
              </View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
              {third.full_name?.split(' ')[0] || 'User'}
            </Text>
            <Text style={styles.podiumScore}>{Math.round(third.success_score)}</Text>
            <View style={[styles.podiumBar, { height: 40, backgroundColor: '#CD7F32' }]} />
          </>
        )}
      </View>
    </View>
  );
};

/**
 * Pattern Distribution Card
 */
const PatternCard = ({ pattern, count, percentage }) => {
  const style = PATTERN_STYLES[pattern] || PATTERN_STYLES.solid_performer;
  
  return (
    <View style={[styles.patternCard, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={styles.patternEmoji}>{getPatternEmoji(pattern)}</Text>
      <Text style={[styles.patternCount, { color: style.text }]}>{count}</Text>
      <Text style={[styles.patternLabel, { color: style.text }]}>
        {getPatternLabel(pattern).replace(/^. /, '')}
      </Text>
      <View style={[styles.patternBar, { backgroundColor: style.border }]}>
        <View style={[styles.patternBarFill, { 
          width: `${percentage}%`, 
          backgroundColor: getPatternColor(pattern) 
        }]} />
      </View>
    </View>
  );
};

/**
 * Leaderboard Entry
 */
const LeaderboardEntry = ({ performer, rank, onPress }) => {
  const style = PATTERN_STYLES[performer.success_pattern] || PATTERN_STYLES.solid_performer;
  const { emoji: scoreEmoji } = getScoreLevel(performer.success_score);
  
  return (
    <TouchableOpacity 
      style={styles.leaderboardEntry} 
      onPress={() => onPress?.(performer)}
      activeOpacity={0.7}
    >
      {/* Rank */}
      <View style={styles.leaderboardRank}>
        <Text style={styles.leaderboardRankText}>
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </Text>
      </View>
      
      {/* Avatar & Info */}
      <View style={[styles.leaderboardAvatar, { borderColor: getPatternColor(performer.success_pattern) }]}>
        <Text style={styles.leaderboardAvatarText}>
          {performer.full_name?.charAt(0) || '?'}
        </Text>
      </View>
      
      <View style={styles.leaderboardInfo}>
        <Text style={styles.leaderboardName} numberOfLines={1}>
          {performer.full_name || performer.email}
        </Text>
        <View style={styles.leaderboardMeta}>
          <View style={[styles.leaderboardPattern, { backgroundColor: style.bg }]}>
            <Text style={{ fontSize: 10 }}>{getPatternEmoji(performer.success_pattern)}</Text>
            <Text style={[styles.leaderboardPatternText, { color: style.text }]}>
              {getPatternLabel(performer.success_pattern).replace(/^. /, '')}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Stats */}
      <View style={styles.leaderboardStats}>
        <Text style={styles.leaderboardScore}>{scoreEmoji} {Math.round(performer.success_score)}</Text>
        <Text style={styles.leaderboardSubstat}>
          📈 {performer.conversion_rate_percent}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Mentor Card
 */
const MentorCard = ({ mentor, area }) => {
  const areaLabel = getMentorAreaLabel(area);
  
  return (
    <View style={styles.mentorCard}>
      <View style={styles.mentorHeader}>
        <View style={styles.mentorAvatar}>
          <Text style={styles.mentorAvatarText}>
            {mentor.full_name?.charAt(0) || '?'}
          </Text>
        </View>
        <View style={styles.mentorInfo}>
          <Text style={styles.mentorName}>{mentor.full_name || mentor.email}</Text>
          <Text style={styles.mentorPattern}>
            {getPatternEmoji(mentor.success_pattern)} {getPatternLabel(mentor.success_pattern).replace(/^. /, '')}
          </Text>
        </View>
        <View style={styles.mentorScore}>
          <Text style={styles.mentorScoreValue}>{Math.round(mentor.success_score)}</Text>
          <Text style={styles.mentorScoreLabel}>Score</Text>
        </View>
      </View>
      
      <View style={styles.mentorStrengths}>
        <Text style={styles.mentorStrengthsLabel}>Stärken:</Text>
        <View style={styles.mentorStrengthsList}>
          {mentor.strengths?.slice(0, 2).map((strength, i) => (
            <View key={i} style={styles.mentorStrengthBadge}>
              <Text style={styles.mentorStrengthText}>{strength}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <TouchableOpacity style={styles.mentorContactBtn}>
        <Text style={styles.mentorContactText}>💬 Kontaktieren</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Section Header mit optionalem Action Button
 */
const SectionHeader = ({ title, emoji, actionText, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{emoji} {title}</Text>
    {actionText && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/**
 * Empty State
 */
const EmptyState = ({ title, description, emoji = '📊' }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyDescription}>{description}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getScoreColor(score) {
  if (score >= 90) return '#8B5CF6'; // Platin
  if (score >= 80) return '#FFD700'; // Gold
  if (score >= 70) return '#C0C0C0'; // Silber
  if (score >= 50) return '#CD7F32'; // Bronze
  return '#94A3B8'; // Starter
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function TeamPerformanceScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedMentorArea, setSelectedMentorArea] = useState(null);
  const [showAllPerformers, setShowAllPerformers] = useState(false);
  
  // Workspace-ID aus User-Metadaten oder null (keine ungültige UUID mehr)
  const workspaceId = user?.user_metadata?.workspace_id || user?.workspace_id || null;
  
  // Hooks
  const {
    patterns,
    summary,
    topPerformers,
    teamStats,
    patternDistribution,
    isLoading,
    error,
    refresh
  } = useSuccessPatterns(workspaceId, { loadSummary: true });
  
  const { 
    mentors,
    scriptMentors,
    closingMentors,
    timingMentors
  } = useMentors(workspaceId);
  
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);
  
  const handlePerformerPress = (performer) => {
    // TODO: Navigate to performer detail
    console.log('Performer pressed:', performer);
  };
  
  // Loading State
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Lade Team-Performance...</Text>
      </View>
    );
  }
  
  // Error State
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Fehler beim Laden</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Demo-Daten wenn keine echten Daten
  const hasData = patterns.length > 0;
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Team Performance</Text>
          <Text style={styles.headerSubtitle}>Squad Success Patterns</Text>
        </View>
        
        {/* Team Score Ring */}
        <ScoreRing score={teamStats.avgScore || summary?.avg_team_score || 0} size={100} />
      </View>
      
      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatValue}>{patterns.length || 0}</Text>
          <Text style={styles.quickStatLabel}>Performer</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={[styles.quickStatValue, { color: COLORS.success }]}>
            {teamStats.avgConversionRate || 0}%
          </Text>
          <Text style={styles.quickStatLabel}>Ø Conversion</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={[styles.quickStatValue, { color: COLORS.secondary }]}>
            {teamStats.avgReplyRate || 0}%
          </Text>
          <Text style={styles.quickStatLabel}>Ø Reply Rate</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={[styles.quickStatValue, { color: COLORS.warning }]}>
            {teamStats.totalSignups || 0}
          </Text>
          <Text style={styles.quickStatLabel}>Abschlüsse</Text>
        </View>
      </View>
      
      {hasData ? (
        <>
          {/* Podium - Top 3 */}
          <SectionHeader 
            title="Top Performer" 
            emoji="🏆" 
          />
          <Podium performers={topPerformers} />
          
          {/* Pattern Distribution */}
          <SectionHeader 
            title="Pattern-Verteilung" 
            emoji="📊" 
          />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.patternScroll}
            contentContainerStyle={styles.patternScrollContent}
          >
            {patternDistribution
              .filter(p => p.count > 0)
              .map((item, index) => (
                <PatternCard 
                  key={item.pattern}
                  pattern={item.pattern}
                  count={item.count}
                  percentage={item.percentage}
                />
              ))}
          </ScrollView>
          
          {/* Leaderboard */}
          <SectionHeader 
            title="Leaderboard" 
            emoji="📋"
            actionText={showAllPerformers ? "Weniger" : "Alle anzeigen"}
            onAction={() => setShowAllPerformers(!showAllPerformers)}
          />
          <View style={styles.leaderboardContainer}>
            {(showAllPerformers ? patterns : patterns.slice(0, 5)).map((performer, index) => (
              <LeaderboardEntry
                key={performer.user_id}
                performer={performer}
                rank={index + 1}
                onPress={handlePerformerPress}
              />
            ))}
          </View>
          
          {/* Mentoren */}
          {mentors.length > 0 && (
            <>
              <SectionHeader 
                title="Mentoren verfügbar" 
                emoji="🎓" 
              />
              
              {/* Mentor Filter */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.mentorFilterScroll}
              >
                {[
                  { key: null, label: 'Alle' },
                  { key: 'script_optimization', label: '📝 Scripts' },
                  { key: 'closing_techniques', label: '🎯 Closing' },
                  { key: 'time_management', label: '⏰ Timing' }
                ].map(filter => (
                  <TouchableOpacity
                    key={filter.key || 'all'}
                    style={[
                      styles.mentorFilterBtn,
                      selectedMentorArea === filter.key && styles.mentorFilterBtnActive
                    ]}
                    onPress={() => setSelectedMentorArea(filter.key)}
                  >
                    <Text style={[
                      styles.mentorFilterText,
                      selectedMentorArea === filter.key && styles.mentorFilterTextActive
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Mentor Cards */}
              <View style={styles.mentorList}>
                {(selectedMentorArea === null 
                  ? mentors 
                  : mentors.filter(m => m.can_mentor_in?.includes(selectedMentorArea))
                ).slice(0, 3).map((mentor, index) => (
                  <MentorCard 
                    key={mentor.user_id} 
                    mentor={mentor}
                    area={selectedMentorArea || mentor.can_mentor_in?.[0]}
                  />
                ))}
              </View>
            </>
          )}
        </>
      ) : (
        <EmptyState
          emoji="📊"
          title="Noch keine Daten"
          description="Sobald dein Team aktiv ist, erscheinen hier die Success Patterns und Top-Performer."
        />
      )}
      
      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  
  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.lg,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xxl,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
  },
  
  // Score Ring
  scoreRingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scoreRingBg: {
    position: 'absolute',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scoreRingProgress: {
    position: 'absolute',
  },
  scoreRingCenter: {
    alignItems: 'center',
  },
  scoreRingEmoji: {
    fontSize: 20,
  },
  scoreRingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scoreRingLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: -30,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  quickStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionAction: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  podiumPlace: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 100,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    position: 'relative',
  },
  podiumFirst: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderColor: '#FFD700',
    backgroundColor: '#FFFBEB',
  },
  podiumSecond: {
    borderColor: '#C0C0C0',
  },
  podiumThird: {
    borderColor: '#CD7F32',
  },
  podiumAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 2,
    ...SHADOWS.sm,
  },
  podiumBadgeGold: {
    bottom: -10,
  },
  podiumBadgeText: {
    fontSize: 14,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  podiumNameFirst: {
    fontSize: 14,
  },
  podiumScore: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  podiumScoreFirst: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  podiumBar: {
    width: '80%',
    marginTop: SPACING.sm,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
  },
  
  // Pattern Cards
  patternScroll: {
    marginLeft: SPACING.lg,
  },
  patternScrollContent: {
    paddingRight: SPACING.xxl,
  },
  patternCard: {
    width: 100,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginRight: SPACING.md,
    alignItems: 'center',
  },
  patternEmoji: {
    fontSize: 24,
  },
  patternCount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  patternLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  patternBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  patternBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  // Leaderboard
  leaderboardContainer: {
    marginHorizontal: SPACING.lg,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center',
  },
  leaderboardRankText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  leaderboardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: SPACING.md,
  },
  leaderboardAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  leaderboardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  leaderboardPattern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  leaderboardPatternText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  leaderboardStats: {
    alignItems: 'flex-end',
  },
  leaderboardScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  leaderboardSubstat: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  
  // Mentors
  mentorFilterScroll: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  mentorFilterBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mentorFilterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  mentorFilterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  mentorFilterTextActive: {
    color: COLORS.white,
  },
  mentorList: {
    paddingHorizontal: SPACING.lg,
  },
  mentorCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentorAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  mentorInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  mentorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  mentorPattern: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mentorScore: {
    alignItems: 'center',
  },
  mentorScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  mentorScoreLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  mentorStrengths: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  mentorStrengthsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  mentorStrengthsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mentorStrengthBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  mentorStrengthText: {
    fontSize: 11,
    color: COLORS.success,
  },
  mentorContactBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  mentorContactText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxxl,
    marginTop: SPACING.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Bottom Spacer
  bottomSpacer: {
    height: 100,
  },
});

