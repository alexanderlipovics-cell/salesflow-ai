/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - ERROR SCREENS                                                   ║
 * ║  Premium Error & Empty State Komponenten                                   ║
 * ║  - Glassmorphism Design                                                    ║
 * ║  - Animierte Icons                                                         ║
 * ║  - Hilfreiche Aktionen                                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AURA_COLORS, AURA_RADIUS, AURA_SHADOWS } from './theme';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type ErrorType = 'network' | 'server' | 'notFound' | 'permission' | 'generic';
type EmptyStateType = 'leads' | 'followups' | 'messages' | 'search' | 'generic';

interface AuraErrorScreenProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
}

interface AuraEmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

const ERROR_CONFIGS: Record<ErrorType, { icon: string; titleKey: string; messageKey: string; color: string }> = {
  network: {
    icon: '📡',
    titleKey: 'errors.network.title',
    messageKey: 'errors.network.message',
    color: AURA_COLORS.neon.amber,
  },
  server: {
    icon: '⚠️',
    titleKey: 'errors.server.title',
    messageKey: 'errors.server.message',
    color: AURA_COLORS.neon.rose,
  },
  notFound: {
    icon: '🔍',
    titleKey: 'errors.notFound.title',
    messageKey: 'errors.notFound.message',
    color: AURA_COLORS.neon.purple,
  },
  permission: {
    icon: '🔒',
    titleKey: 'errors.permission.title',
    messageKey: 'errors.permission.message',
    color: AURA_COLORS.neon.rose,
  },
  generic: {
    icon: '💫',
    titleKey: 'errors.generic.title',
    messageKey: 'errors.generic.message',
    color: AURA_COLORS.neon.cyan,
  },
};

const EMPTY_CONFIGS: Record<EmptyStateType, { icon: string; titleKey: string; messageKey: string; actionKey: string }> = {
  leads: {
    icon: '👥',
    titleKey: 'empty.leads.title',
    messageKey: 'empty.leads.message',
    actionKey: 'empty.leads.action',
  },
  followups: {
    icon: '📋',
    titleKey: 'empty.followups.title',
    messageKey: 'empty.followups.message',
    actionKey: 'empty.followups.action',
  },
  messages: {
    icon: '💬',
    titleKey: 'empty.messages.title',
    messageKey: 'empty.messages.message',
    actionKey: 'empty.messages.action',
  },
  search: {
    icon: '🔍',
    titleKey: 'empty.search.title',
    messageKey: 'empty.search.message',
    actionKey: 'empty.search.action',
  },
  generic: {
    icon: '📭',
    titleKey: 'empty.generic.title',
    messageKey: 'empty.generic.message',
    actionKey: 'empty.generic.action',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ERROR SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export const AuraErrorScreen: React.FC<AuraErrorScreenProps> = ({
  type = 'generic',
  title,
  message,
  onRetry,
  onGoBack,
  onGoHome,
}) => {
  const { t } = useTranslation();
  const config = ERROR_CONFIGS[type];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Initial Shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[AURA_COLORS.bg.primary, AURA_COLORS.bg.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Glow Effect */}
      <View style={[styles.glowCircle, { backgroundColor: config.color + '20' }]} />
      
      {/* Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            borderColor: config.color + '40',
            transform: [{ scale: pulseAnim }, { translateX: shakeAnim }],
          },
        ]}
      >
        <Text style={styles.icon}>{config.icon}</Text>
      </Animated.View>
      
      {/* Text */}
      <Text style={styles.title}>{title || t(config.titleKey, { defaultValue: 'Etwas ist schiefgelaufen' })}</Text>
      <Text style={styles.message}>{message || t(config.messageKey, { defaultValue: 'Bitte versuche es erneut' })}</Text>
      
      {/* Actions */}
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: config.color }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('common.retry', { defaultValue: 'Erneut versuchen' })}</Text>
          </TouchableOpacity>
        )}
        
        {onGoBack && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onGoBack} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>{t('common.back', { defaultValue: 'Zurück' })}</Text>
          </TouchableOpacity>
        )}
        
        {onGoHome && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onGoHome} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>{t('common.home', { defaultValue: 'Startseite' })}</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* AURA OS Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AURA OS</Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

export const AuraEmptyState: React.FC<AuraEmptyStateProps> = ({
  type = 'generic',
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const { t } = useTranslation();
  const config = EMPTY_CONFIGS[type];
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      {/* Subtle Background */}
      <View style={styles.emptyGlow} />
      
      {/* Icon */}
      <Animated.View
        style={[
          styles.emptyIconContainer,
          { transform: [{ translateY: floatAnim }] },
        ]}
      >
        <Text style={styles.emptyIcon}>{config.icon}</Text>
      </Animated.View>
      
      {/* Text */}
      <Text style={styles.emptyTitle}>{title || t(config.titleKey, { defaultValue: 'Noch nichts hier' })}</Text>
      <Text style={styles.emptyMessage}>{message || t(config.messageKey, { defaultValue: 'Starte jetzt!' })}</Text>
      
      {/* Action */}
      {onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.emptyActionText}>
            {actionLabel || t(config.actionKey, { defaultValue: 'Loslegen' })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Error Screen
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.5,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: AURA_RADIUS.xl,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...AURA_SHADOWS.glass,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 32,
  },
  actions: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: AURA_COLORS.bg.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  secondaryButtonText: {
    color: AURA_COLORS.text.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AURA_RADIUS.sm,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: AURA_COLORS.text.subtle,
    letterSpacing: 2,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: AURA_RADIUS.lg,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
    marginBottom: 24,
  },
  emptyAction: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: AURA_RADIUS.md,
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  emptyActionText: {
    color: AURA_COLORS.bg.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AuraErrorScreen;

