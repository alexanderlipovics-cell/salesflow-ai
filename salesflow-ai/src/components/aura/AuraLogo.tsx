/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - Animated Logo Component                                         ║
 * ║  High-End SVG-Emblem mit lebendigen Animationen                            ║
 * ║  - Pulsierender Glow-Effekt                                                ║
 * ║  - Orbitale kreisende Animation                                            ║
 * ║  - Cyan/White Farbschema                                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type AuraLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  style?: object;
};

// Animated SVG Circle für die orbitale Animation
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const AuraLogo: React.FC<AuraLogoProps> = ({
  size = 'md',
  withText = true,
  style,
}) => {
  // Animation Values
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Größen-Mapping
  const sizes = {
    sm: { container: 24, text: 18, subtext: 12 },
    md: { container: 32, text: 24, subtext: 14 },
    lg: { container: 48, text: 32, subtext: 18 },
  };

  const currentSize = sizes[size];

  useEffect(() => {
    // Pulsierender Glow-Effekt
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Scale Animation (synchron mit Pulsieren)
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Orbitale Rotation (langsam)
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    scaleAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      scaleAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      {/* SVG Symbol mit Animationen */}
      <View style={[styles.symbolContainer, { width: currentSize.container, height: currentSize.container }]}>
        {/* Pulsierender Glow-Hintergrund */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              width: currentSize.container * 1.5,
              height: currentSize.container * 1.5,
              borderRadius: currentSize.container,
              opacity: pulseAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />
        
        {/* SVG Logo */}
        <Animated.View
          style={[
            styles.svgContainer,
            { transform: [{ rotate: rotateInterpolate }] },
          ]}
        >
          <Svg
            width={currentSize.container}
            height={currentSize.container}
            viewBox="0 0 24 24"
          >
            {/* Äußerer Ring - 50% Opacity */}
            <Path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.5}
            />
            {/* Mittlerer Ring */}
            <Path
              d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Zentraler Kern */}
            <Circle cx="12" cy="12" r="2" fill="#22d3ee" />
            {/* Orbitaler Satellit */}
            <Circle cx="12" cy="2" r="1.5" fill="#ffffff" />
          </Svg>
        </Animated.View>
      </View>

      {/* Text */}
      {withText && (
        <View style={styles.textContainer}>
          <Text style={[styles.auraText, { fontSize: currentSize.text }]}>
            AURA
            <Text style={styles.osText}> OS</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  symbolContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    backgroundColor: '#22d3ee',
    // Blur-Effekt simuliert durch halbtransparente Farbe
  },
  svgContainer: {
    zIndex: 10,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  auraText: {
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    // Text Shadow für Glow-Effekt
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  osText: {
    fontWeight: '300',
    color: '#22d3ee',
  },
});

export default AuraLogo;

