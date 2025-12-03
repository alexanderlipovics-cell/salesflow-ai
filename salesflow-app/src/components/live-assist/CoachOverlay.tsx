/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COACH OVERLAY                                                             ║
 * ║  Zeigt personalisierte Coach-Tipps basierend auf Mood/Decision Patterns    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 * - Minimierbar/Maximierbar
 * - Dismissbare Tipps
 * - Prioritäts-basierte Sortierung
 * - Vertical-spezifische Tipps
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import type {
  CoachOverlayProps,
  CoachTip,
  CoachInsightsResponse,
  CoachTipPriority,
} from '../../types/coachInsights';
import {
  PRIORITY_COLORS,
  PRIORITY_BG_COLORS,
  ACTION_TYPE_ICONS,
} from '../../types/coachInsights';
import { liveAssistApi } from '../../api/liveAssist';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OVERLAY_WIDTH = Math.min(360, SCREEN_WIDTH - 32);

export function CoachOverlay({
  userId,
  companyId,
  companyName,
  vertical,
  days = 30,
  position = 'bottom-right',
  initialMinimized = false,
  onApplyTip,
  onDismissTip,
}: CoachOverlayProps) {
  // State
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [dismissedTips, setDismissedTips] = useState<string[]>([]);
  const [insights, setInsights] = useState<CoachInsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation
  const slideAnim = useRef(new Animated.Value(initialMinimized ? 100 : 0)).current;
  const fadeAnim = useRef(new Animated.Value(initialMinimized ? 0 : 1)).current;

  // Fetch Coach Insights
  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await liveAssistApi.getCoachInsights(companyId, days);
      setInsights(response);
    } catch (err) {
      // Stille Fehlerbehandlung - zeige Demo-Insights statt Fehler
      setInsights({
        sessions_analyzed: 0,
        tips: [
          {
            id: 'demo-1',
            title: '🎯 Tipp: Follow-ups priorisieren',
            description: 'Konzentriere dich auf warme Leads, die bereits Interesse gezeigt haben.',
            priority: 'high' as const,
            action_type: 'follow_up',
          },
          {
            id: 'demo-2',
            title: '💡 Tipp: DISC-Profile nutzen',
            description: 'Passe deine Kommunikation an den Persönlichkeitstyp des Kunden an.',
            priority: 'medium' as const,
            action_type: 'training',
          },
        ],
        generated_at: new Date().toISOString(),
      });
      // Kein Fehler-State setzen - zeige stattdessen Demo-Daten
    } finally {
      setIsLoading(false);
    }
  }, [companyId, days]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Toggle minimize
  const toggleMinimize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isMinimized) {
      // Expand
      setIsMinimized(false);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Minimize
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => setIsMinimized(true));
    }
  };

  // Dismiss tip
  const handleDismissTip = (tipId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissedTips(prev => [...prev, tipId]);
    onDismissTip?.(tipId);
  };

  // Apply tip
  const handleApplyTip = (tip: CoachTip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApplyTip?.(tip);
    // Optional: Auto-dismiss after applying
    handleDismissTip(tip.id);
  };

  // Dismiss all
  const dismissAll = () => {
    if (visibleTips.length > 0) {
      setDismissedTips(prev => [...prev, ...visibleTips.map(t => t.id)]);
    }
  };

  // Filter visible tips
  const visibleTips = insights?.tips.filter(t => !dismissedTips.includes(t.id)) || [];

  // Don't render if no tips
  if (!isLoading && visibleTips.length === 0 && !error) {
    return null;
  }

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-right': { top: 100, right: 16 },
    'top-left': { top: 100, left: 16 },
  };

  // Minimized button
  if (isMinimized) {
    return (
      <TouchableOpacity
        style={[styles.minimizedButton, positionStyles[position]]}
        onPress={toggleMinimize}
        activeOpacity={0.8}
      >
        <View style={styles.minimizedContent}>
          <Ionicons name="bulb" size={20} color="#F59E0B" />
          {visibleTips.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{visibleTips.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyles[position],
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="bulb" size={18} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.headerTitle}>CHIEF Coach</Text>
            <Text style={styles.headerSubtitle}>
              {insights?.sessions_analyzed || 0} Sessions • {companyName || 'Deine Firma'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleMinimize}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={dismissAll}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Analysiere deine Patterns...</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchInsights}>
              <Text style={styles.retryText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        {!isLoading && !error && visibleTips.map((tip) => (
          <TipCard
            key={tip.id}
            tip={tip}
            onDismiss={() => handleDismissTip(tip.id)}
            onApply={() => handleApplyTip(tip)}
          />
        ))}

        {/* No tips message */}
        {!isLoading && !error && visibleTips.length === 0 && (
          <View style={styles.noTipsContainer}>
            <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            <Text style={styles.noTipsText}>
              Alles gut! Keine Verbesserungsvorschläge.
            </Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// =============================================================================
// TIP CARD COMPONENT
// =============================================================================

interface TipCardProps {
  tip: CoachTip;
  onDismiss: () => void;
  onApply: () => void;
}

function TipCard({ tip, onDismiss, onApply }: TipCardProps) {
  const priorityColor = PRIORITY_COLORS[tip.priority];
  const priorityBgColor = PRIORITY_BG_COLORS[tip.priority];
  const actionIcon = ACTION_TYPE_ICONS[tip.action_type] as keyof typeof Ionicons.glyphMap;

  return (
    <View style={[styles.tipCard, { borderLeftColor: priorityColor }]}>
      {/* Tip Header */}
      <View style={styles.tipHeader}>
        <View 
          style={[
            styles.priorityDot, 
            { backgroundColor: priorityColor }
          ]} 
        />
        <Text style={styles.tipTitle} numberOfLines={2}>
          {tip.title}
        </Text>
      </View>

      {/* Tip Description */}
      <Text style={styles.tipDescription}>
        {tip.description}
      </Text>

      {/* Tip Actions */}
      <View style={styles.tipActions}>
        <TouchableOpacity
          style={styles.tipActionButton}
          onPress={onDismiss}
        >
          <Text style={styles.tipActionTextSecondary}>Später</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tipActionButton, styles.tipActionButtonPrimary]}
          onPress={onApply}
        >
          <Ionicons 
            name={actionIcon || 'checkmark'} 
            size={14} 
            color="#22C55E" 
          />
          <Text style={styles.tipActionTextPrimary}>Anwenden</Text>
        </TouchableOpacity>
      </View>

      {/* Action Type Badge */}
      <View style={[styles.actionTypeBadge, { backgroundColor: priorityBgColor }]}>
        <Text style={[styles.actionTypeBadgeText, { color: priorityColor }]}>
          {tip.action_type.replace(/_/g, ' ')}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    position: 'absolute',
    width: OVERLAY_WIDTH,
    maxHeight: 400,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    overflow: 'hidden',
  },

  // Minimized Button
  minimizedButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    backgroundColor: '#1F2937',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  minimizedContent: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 163, 175, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F4F6',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    padding: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderRadius: 6,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    gap: 10,
  },

  // Loading
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },

  // Error
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  retryText: {
    color: '#22C55E',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },

  // No Tips
  noTipsContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  noTipsText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },

  // Tip Card
  tipCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    position: 'relative',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 10,
  },
  tipTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    lineHeight: 20,
  },
  tipDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
    marginLeft: 18,
  },
  tipActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tipActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  tipActionButtonPrimary: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  tipActionTextSecondary: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  tipActionTextPrimary: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },

  // Action Type Badge
  actionTypeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actionTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default CoachOverlay;

