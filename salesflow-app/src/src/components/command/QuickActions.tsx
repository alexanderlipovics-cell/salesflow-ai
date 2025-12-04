/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMMAND CENTER - QUICK ACTIONS                                            ║
 * ║  2x2 Grid mit großen Touch-Targets                                         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { AURA_COLORS, AURA_SPACING, AURA_RADIUS, AURA_FONTS, AURA_SHADOWS } from '../aura';

interface QuickAction {
  icon: string;
  label: string;
  screen: string;
  color: string;
}

interface QuickActionsProps {
  onActionPress: (screen: string, actionLabel?: string) => void;
}

const ACTIONS: QuickAction[] = [
  { icon: '🎯', label: 'JAGEN', screen: 'Leads', color: AURA_COLORS.neon.cyan },
  { icon: '💰', label: 'CLOSEN', screen: 'Leads', color: AURA_COLORS.neon.green },
  { icon: '🏗️', label: 'BAUEN', screen: 'FollowUps', color: AURA_COLORS.neon.amber },
  { icon: '📊', label: 'STATUS', screen: 'AnalyticsDashboard', color: AURA_COLORS.neon.purple },
];

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {ACTIONS.map((action, index) => (
          <ActionButton
            key={index}
            action={action}
            onPress={() => onActionPress(action.screen, action.label)}
          />
        ))}
      </View>
    </View>
  );
};

interface ActionButtonProps {
  action: QuickAction;
  onPress: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.buttonWrapper}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: action.color + '15',
            borderColor: action.color + '40',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: action.color,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.2],
              }),
            },
          ]}
        />
        <Text style={styles.icon}>{action.icon}</Text>
        <Text style={[styles.label, { color: action.color }]}>{action.label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AURA_SPACING.lg,
    paddingVertical: AURA_SPACING.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: AURA_SPACING.md,
  },
  buttonWrapper: {
    width: '48%',
    aspectRatio: 1,
  },
  button: {
    flex: 1,
    borderRadius: AURA_RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...AURA_SHADOWS.md,
  },
  glow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  icon: {
    fontSize: 48,
    marginBottom: AURA_SPACING.sm,
  },
  label: {
    ...AURA_FONTS.title,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

