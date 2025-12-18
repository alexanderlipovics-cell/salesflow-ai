/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  LIVE ASSIST BANNER                                                        ║
 * ║  Zeigt an wenn Live Assist aktiv ist + Quick Action Chips                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Features:
 * - Pulse Animation für Live-Indikator
 * - Quick Facts Anzeige
 * - Quick Action Chips für häufige Anfragen
 * - Slide-In/Out Animation
 */

import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { QuickFactItem } from '../../types/liveAssist';

// =============================================================================
// QUICK ACTION CHIPS CONFIG
// =============================================================================

interface QuickChip {
  id: string;
  label: string;
  query: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const DEFAULT_QUICK_CHIPS: QuickChip[] = [
  {
    id: 'price_objection',
    label: 'Zu teuer',
    query: 'Kunde sagt: Das ist mir zu teuer',
    icon: 'cash-outline',
    color: '#EF4444',
  },
  {
    id: 'why_us',
    label: 'Warum wir?',
    query: 'Warum sollte der Kunde uns wählen?',
    icon: 'star-outline',
    color: '#F59E0B',
  },
  {
    id: 'facts',
    label: 'Zahlen',
    query: 'Gib mir die wichtigsten Zahlen und Fakten',
    icon: 'stats-chart-outline',
    color: '#3B82F6',
  },
  {
    id: 'closing',
    label: 'Closing',
    query: 'Wie schließe ich jetzt ab?',
    icon: 'checkmark-circle-outline',
    color: '#22C55E',
  },
  {
    id: 'time_objection',
    label: 'Keine Zeit',
    query: 'Kunde sagt: Ich habe gerade keine Zeit',
    icon: 'time-outline',
    color: '#8B5CF6',
  },
  {
    id: 'think_about',
    label: 'Überlegen',
    query: 'Kunde sagt: Ich muss noch darüber nachdenken',
    icon: 'help-circle-outline',
    color: '#EC4899',
  },
];

// =============================================================================
// PROPS
// =============================================================================

export interface LiveAssistBannerProps {
  isActive: boolean;
  companyName?: string;
  keyFacts?: QuickFactItem[];
  onDeactivate: () => void;
  /** Callback wenn ein Quick Chip geklickt wird */
  onQuickQuery?: (query: string) => void;
  /** Custom Quick Chips (ersetzt Default) */
  customChips?: QuickChip[];
  /** Anzahl sichtbarer Chips (default: 4) */
  visibleChipsCount?: number;
  /** Kompakter Modus (weniger Padding) */
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LiveAssistBanner({
  isActive,
  companyName,
  keyFacts = [],
  onDeactivate,
  onQuickQuery,
  customChips,
  visibleChipsCount = 4,
  compact = false,
}: LiveAssistBannerProps) {
  // Animation for the live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  
  // Chips to show
  const chips = customChips || DEFAULT_QUICK_CHIPS;
  
  useEffect(() => {
    if (isActive) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
      
      // Pulse animation for live dot
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, pulseAnim, slideAnim]);
  
  if (!isActive) return null;
  
  const handleDeactivate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDeactivate();
  };
  
  const handleQuickChip = (chip: QuickChip) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onQuickQuery?.(chip.query);
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        compact && styles.containerCompact,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.indicator}>
          <Animated.View 
            style={[
              styles.liveDot,
              { transform: [{ scale: pulseAnim }] }
            ]} 
          />
          <Text style={styles.liveText}>LIVE ASSIST</Text>
          {companyName && (
            <Text style={styles.companyName}>• {companyName}</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDeactivate}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      
      {/* Quick Action Chips */}
      <View style={styles.chipsSection}>
        <Text style={styles.chipsSectionLabel}>⚡ Schnellzugriff:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {chips.slice(0, visibleChipsCount + 2).map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.chip,
                { borderColor: `${chip.color}40` }
              ]}
              onPress={() => handleQuickChip(chip)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={chip.icon} 
                size={14} 
                color={chip.color} 
              />
              <Text style={[styles.chipLabel, { color: chip.color }]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Key Facts (if any) */}
      {keyFacts.length > 0 && !compact && (
        <View style={styles.factsContainer}>
          <Text style={styles.factsTitle}>💡 Quick Facts:</Text>
          {keyFacts.slice(0, 3).map((fact, i) => (
            <Text key={i} style={styles.factText}>
              • {fact.fact_short || fact.fact_value}
            </Text>
          ))}
        </View>
      )}
      
      {/* Hint (condensed if compact) */}
      <Text style={[styles.hint, compact && styles.hintCompact]}>
        {compact 
          ? 'Tippe oder frag: "Kunde sagt..."'
          : `Tippe einen Chip oder frag frei: "Warum ${companyName || 'wir'}?"`
        }
      </Text>
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Container
  container: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    // Subtle shadow
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  containerCompact: {
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 8,
    // Glow effect
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 1.2,
  },
  companyName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  closeButton: {
    padding: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderRadius: 8,
  },

  // Quick Action Chips
  chipsSection: {
    marginBottom: 12,
  },
  chipsSectionLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Facts
  factsContainer: {
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 12,
  },
  factsTitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
    fontWeight: '600',
  },
  factText: {
    fontSize: 12,
    color: '#E5E7EB',
    marginBottom: 3,
    lineHeight: 17,
  },

  // Hint
  hint: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  hintCompact: {
    marginTop: 4,
    fontSize: 10,
  },
});

export default LiveAssistBanner;
