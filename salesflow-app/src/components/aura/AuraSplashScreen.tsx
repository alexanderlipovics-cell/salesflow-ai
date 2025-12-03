/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - SPLASH SCREEN                                                   ║
 * ║  Premium animierter Startup-Bildschirm                                     ║
 * ║  - Pulsierendes Logo mit Neon-Glow                                         ║
 * ║  - Fließende Partikel-Animation                                            ║
 * ║  - Glassmorphism Background                                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS, AURA_FONTS } from './theme';

const { width, height } = Dimensions.get('window');

interface AuraSplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export const AuraSplashScreen: React.FC<AuraSplashScreenProps> = ({
  onFinish,
  duration = 2500,
}) => {
  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const particleRotation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Sequentielle Animationen
    Animated.sequence([
      // Phase 1: Logo erscheint
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Glow und Ring
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1.5,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 3: Text erscheint
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      
      // Phase 4: Warten
      Animated.delay(800),
      
      // Phase 5: Ausblenden
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onFinish?.();
    });
    
    // Kontinuierliche Partikel-Rotation
    Animated.loop(
      Animated.timing(particleRotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  const spin = particleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Deep Space Background */}
      <LinearGradient
        colors={[AURA_COLORS.bg.primary, AURA_COLORS.bg.secondary, AURA_COLORS.bg.primary]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Ambient Glow Blobs */}
      <Animated.View style={[styles.glowBlob, styles.glowBlobCyan, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.glowBlob, styles.glowBlobPurple, { opacity: glowOpacity }]} />
      
      {/* Rotating Particles */}
      <Animated.View style={[styles.particleContainer, { transform: [{ rotate: spin }] }]}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                transform: [
                  { rotate: `${i * 60}deg` },
                  { translateY: -100 },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
      
      {/* Expanding Ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      
      {/* Main Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Inner Glow */}
        <Animated.View style={[styles.innerGlow, { opacity: glowOpacity }]} />
        
        {/* Logo Icon */}
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>⚡</Text>
        </View>
      </Animated.View>
      
      {/* Text */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.logoText}>AURA</Text>
        <Text style={styles.logoSubtext}>OS</Text>
        <Text style={styles.tagline}>Intelligent Sales Operating System</Text>
        <View style={styles.poweredBy}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Text style={styles.chiefText}>CHIEF AI</Text>
        </View>
      </Animated.View>
      
      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View 
            style={[
              styles.loadingProgress,
              {
                width: logoOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AURA_COLORS.bg.primary,
  },
  
  // Glow Blobs
  glowBlob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowBlobCyan: {
    top: height * 0.2,
    left: -50,
    backgroundColor: AURA_COLORS.neon.cyanGlow,
    opacity: 0.3,
  },
  glowBlobPurple: {
    bottom: height * 0.2,
    right: -50,
    backgroundColor: AURA_COLORS.neon.purpleGlow,
    opacity: 0.3,
  },
  
  // Particles
  particleContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AURA_COLORS.neon.cyan,
    shadowColor: AURA_COLORS.neon.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  
  // Ring
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: AURA_COLORS.neon.cyan,
    opacity: 0.3,
  },
  
  // Logo
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: AURA_COLORS.glass.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  innerGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AURA_COLORS.neon.cyanSubtle,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 32,
  },
  
  // Text
  textContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: AURA_COLORS.text.primary,
    letterSpacing: 8,
  },
  logoSubtext: {
    fontSize: 24,
    fontWeight: '300',
    color: AURA_COLORS.neon.cyan,
    letterSpacing: 12,
    marginTop: -8,
  },
  tagline: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 12,
    letterSpacing: 1,
  },
  poweredBy: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  poweredByText: {
    fontSize: 11,
    color: AURA_COLORS.text.subtle,
  },
  chiefText: {
    fontSize: 11,
    fontWeight: '700',
    color: AURA_COLORS.neon.amber,
  },
  
  // Loading
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.5,
  },
  loadingBar: {
    height: 2,
    backgroundColor: AURA_COLORS.glass.border,
    borderRadius: 1,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: AURA_COLORS.neon.cyan,
    borderRadius: 1,
  },
});

export default AuraSplashScreen;

