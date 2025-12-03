/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - VERSION BADGE                                                   ║
 * ║  Zeigt aktuelle Version mit Neon-Glow Effekt                               ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { AURA_COLORS, AURA_RADIUS } from './theme';

// App Version - hier aktualisieren bei Releases
export const AURA_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  build: '2024.12.03',
  codename: 'Genesis',
  channel: 'beta' as 'alpha' | 'beta' | 'stable',
};

export const getVersionString = () => 
  `v${AURA_VERSION.major}.${AURA_VERSION.minor}.${AURA_VERSION.patch}`;

export const getFullVersionString = () =>
  `${getVersionString()} (${AURA_VERSION.build})`;

interface AuraVersionBadgeProps {
  showChannel?: boolean;
  showCodename?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export const AuraVersionBadge: React.FC<AuraVersionBadgeProps> = ({
  showChannel = true,
  showCodename = false,
  size = 'md',
  onPress,
}) => {
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  const channelColors = {
    alpha: AURA_COLORS.neon.rose,
    beta: AURA_COLORS.neon.amber,
    stable: AURA_COLORS.neon.green,
  };
  
  const sizes = {
    sm: { container: 6, text: 10, channel: 8 },
    md: { container: 10, text: 12, channel: 9 },
    lg: { container: 14, text: 14, channel: 11 },
  };
  
  const currentSize = sizes[size];

  const content = (
    <View style={[styles.container, { padding: currentSize.container }]}>
      {/* Glow Background */}
      <Animated.View 
        style={[
          styles.glow, 
          { 
            opacity: glowAnim,
            backgroundColor: channelColors[AURA_VERSION.channel] + '20',
          }
        ]} 
      />
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>⚡</Text>
      </View>
      
      {/* Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { fontSize: currentSize.text }]}>AURA OS</Text>
        <View style={styles.versionRow}>
          <Text style={[styles.version, { fontSize: currentSize.channel }]}>
            {getVersionString()}
          </Text>
          {showChannel && (
            <View style={[
              styles.channelBadge,
              { backgroundColor: channelColors[AURA_VERSION.channel] + '20' }
            ]}>
              <Text style={[
                styles.channelText,
                { 
                  color: channelColors[AURA_VERSION.channel],
                  fontSize: currentSize.channel - 1,
                }
              ]}>
                {AURA_VERSION.channel.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        {showCodename && (
          <Text style={[styles.codename, { fontSize: currentSize.channel }]}>
            "{AURA_VERSION.codename}"
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT AURA OS Section (für Settings)
// ═══════════════════════════════════════════════════════════════════════════

export const AuraAboutSection: React.FC<{ onViewChangelog?: () => void }> = ({
  onViewChangelog,
}) => {
  return (
    <View style={styles.aboutContainer}>
      {/* Header */}
      <View style={styles.aboutHeader}>
        <View style={styles.aboutLogo}>
          <Text style={styles.aboutLogoText}>⚡</Text>
        </View>
        <View>
          <Text style={styles.aboutTitle}>AURA OS</Text>
          <Text style={styles.aboutSubtitle}>Intelligent Sales Operating System</Text>
        </View>
      </View>
      
      {/* Version Info */}
      <View style={styles.aboutInfo}>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>{getFullVersionString()}</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Codename</Text>
          <Text style={styles.aboutValue}>"{AURA_VERSION.codename}"</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Channel</Text>
          <View style={[styles.channelBadge, { backgroundColor: AURA_COLORS.neon.amber + '20' }]}>
            <Text style={[styles.channelText, { color: AURA_COLORS.neon.amber }]}>
              {AURA_VERSION.channel.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>AI Engine</Text>
          <Text style={styles.aboutValue}>CHIEF v3.0</Text>
        </View>
      </View>
      
      {/* Changelog Button */}
      {onViewChangelog && (
        <TouchableOpacity style={styles.changelogButton} onPress={onViewChangelog}>
          <Text style={styles.changelogButtonText}>📋 Changelog anzeigen</Text>
        </TouchableOpacity>
      )}
      
      {/* Footer */}
      <Text style={styles.aboutFooter}>
        Made with ⚡ in Germany
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Version Badge
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.md,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AURA_RADIUS.md,
  },
  logoContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logo: {
    fontSize: 14,
  },
  textContainer: {},
  title: {
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    letterSpacing: 0.5,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  version: {
    color: AURA_COLORS.text.muted,
    fontFamily: 'monospace',
  },
  channelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  channelText: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  codename: {
    color: AURA_COLORS.text.subtle,
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  // About Section
  aboutContainer: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    padding: 20,
    margin: 16,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AURA_COLORS.glass.border,
  },
  aboutLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  aboutLogoText: {
    fontSize: 24,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    letterSpacing: 0.5,
  },
  aboutSubtitle: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  aboutInfo: {
    gap: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
  },
  aboutValue: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    fontFamily: 'monospace',
  },
  changelogButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: AURA_RADIUS.md,
    backgroundColor: AURA_COLORS.bg.tertiary,
    alignItems: 'center',
  },
  changelogButtonText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    fontWeight: '500',
  },
  aboutFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: AURA_COLORS.text.subtle,
    marginTop: 20,
  },
});

export default AuraVersionBadge;

