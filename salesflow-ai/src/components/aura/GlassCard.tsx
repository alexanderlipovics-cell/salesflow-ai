/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - GLASS CARD                                                      ║
 * ║  Premium Glassmorphism Card Component                                      ║
 * ║  - Frosted glass effect                                                    ║
 * ║  - Neon accent borders                                                     ║
 * ║  - Hover glow effects                                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS, AURA_RADIUS, AURA_SHADOWS } from './theme';

type GlassVariant = 'default' | 'cyan' | 'purple' | 'amber' | 'green' | 'rose';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  glowOnHover?: boolean;
  innerGlow?: boolean;
}

const VARIANT_COLORS: Record<GlassVariant, { border: string; glow: string; subtle: string }> = {
  default: {
    border: AURA_COLORS.glass.border,
    glow: 'rgba(255, 255, 255, 0.1)',
    subtle: 'rgba(255, 255, 255, 0.02)',
  },
  cyan: {
    border: 'rgba(34, 211, 238, 0.3)',
    glow: AURA_COLORS.neon.cyanGlow,
    subtle: AURA_COLORS.neon.cyanSubtle,
  },
  purple: {
    border: 'rgba(168, 85, 247, 0.3)',
    glow: AURA_COLORS.neon.purpleGlow,
    subtle: AURA_COLORS.neon.purpleSubtle,
  },
  amber: {
    border: 'rgba(245, 158, 11, 0.3)',
    glow: AURA_COLORS.neon.amberGlow,
    subtle: AURA_COLORS.neon.amberSubtle,
  },
  green: {
    border: 'rgba(16, 185, 129, 0.3)',
    glow: AURA_COLORS.neon.greenGlow,
    subtle: AURA_COLORS.neon.greenSubtle,
  },
  rose: {
    border: 'rgba(244, 63, 94, 0.3)',
    glow: AURA_COLORS.neon.roseGlow,
    subtle: AURA_COLORS.neon.roseSubtle,
  },
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  onPress,
  style,
  noPadding = false,
  glowOnHover = true,
  innerGlow = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colors = VARIANT_COLORS[variant];

  const handlePressIn = () => {
    if (glowOnHover) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (glowOnHover) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    }
  };

  const cardContent = (
    <View style={[
      styles.card,
      { borderColor: colors.border },
      noPadding ? {} : styles.padding,
      style,
    ]}>
      {/* Inner Glow Effect */}
      {innerGlow && (
        <View style={[styles.innerGlow, { backgroundColor: colors.subtle }]} />
      )}
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {cardContent}
        </Pressable>
      </Animated.View>
    );
  }

  return cardContent;
};

// ═══════════════════════════════════════════════════════════════════════════
// GLASS STAT CARD - Für KPIs und Stats
// ═══════════════════════════════════════════════════════════════════════════
interface GlassStatCardProps {
  value: string | number;
  label: string;
  icon?: string;
  variant?: GlassVariant;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const GlassStatCard: React.FC<GlassStatCardProps> = ({
  value,
  label,
  icon,
  variant = 'default',
  trend,
  trendValue,
}) => {
  const colors = VARIANT_COLORS[variant];
  const neonColor = variant === 'default' ? AURA_COLORS.neon.cyan : 
    variant === 'cyan' ? AURA_COLORS.neon.cyan :
    variant === 'purple' ? AURA_COLORS.neon.purple :
    variant === 'amber' ? AURA_COLORS.neon.amber :
    variant === 'green' ? AURA_COLORS.neon.green :
    AURA_COLORS.neon.rose;

  return (
    <View style={[styles.statCard, { borderColor: colors.border }]}>
      {/* Accent Line */}
      <View style={[styles.accentLine, { backgroundColor: neonColor }]} />
      
      {icon && (
        <View style={styles.statIcon}>
          <View style={[styles.iconGlow, { backgroundColor: colors.subtle }]} />
          <View style={styles.iconText}>{/* Icon placeholder */}</View>
        </View>
      )}
      
      <View style={styles.statContent}>
        <View style={styles.statValueRow}>
          <Animated.Text style={[styles.statValue, { color: neonColor }]}>
            {value}
          </Animated.Text>
          {trend && trendValue && (
            <View style={[
              styles.trendBadge,
              { backgroundColor: trend === 'up' ? AURA_COLORS.neon.greenSubtle : 
                trend === 'down' ? AURA_COLORS.neon.roseSubtle : colors.subtle }
            ]}>
              <Animated.Text style={[
                styles.trendText,
                { color: trend === 'up' ? AURA_COLORS.neon.green : 
                  trend === 'down' ? AURA_COLORS.neon.rose : AURA_COLORS.text.muted }
              ]}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </Animated.Text>
            </View>
          )}
        </View>
        <Animated.Text style={styles.statLabel}>{label}</Animated.Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// NEON BADGE - Status Badges
// ═══════════════════════════════════════════════════════════════════════════
interface NeonBadgeProps {
  text: string;
  variant?: GlassVariant;
  pulse?: boolean;
}

export const NeonBadge: React.FC<NeonBadgeProps> = ({
  text,
  variant = 'cyan',
  pulse = false,
}) => {
  const colors = VARIANT_COLORS[variant];
  const neonColor = variant === 'cyan' ? AURA_COLORS.neon.cyan :
    variant === 'purple' ? AURA_COLORS.neon.purple :
    variant === 'amber' ? AURA_COLORS.neon.amber :
    variant === 'green' ? AURA_COLORS.neon.green :
    variant === 'rose' ? AURA_COLORS.neon.rose :
    AURA_COLORS.neon.cyan;

  return (
    <View style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.subtle }]}>
      {pulse && <View style={[styles.pulseDot, { backgroundColor: neonColor }]} />}
      <Animated.Text style={[styles.badgeText, { color: neonColor }]}>{text}</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...AURA_SHADOWS.glass,
  },
  padding: {
    padding: 20,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopLeftRadius: AURA_RADIUS.xl,
    borderTopRightRadius: AURA_RADIUS.xl,
  },
  content: {
    position: 'relative',
    zIndex: 10,
  },
  // Stat Card
  statCard: {
    flex: 1,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    ...AURA_SHADOWS.subtle,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  statIcon: {
    marginBottom: 8,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    top: -5,
    left: -5,
  },
  iconText: {
    fontSize: 24,
  },
  statContent: {},
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AURA_RADIUS.full,
    borderWidth: 1,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default GlassCard;

