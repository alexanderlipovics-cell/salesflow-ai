/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - VOICE BUTTON COMPONENT                                         ║
 * ║  Animierter Mikrofon-Button für Spracheingabe                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { AURA_COLORS } from '../aura';
import { VoiceState } from '../../hooks/useVoice';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface VoiceButtonProps {
  voiceState: VoiceState;
  isSupported: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  partialTranscript?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  voiceState,
  isSupported,
  onPress,
  onLongPress,
  size = 'medium',
  disabled = false,
  partialTranscript,
}) => {
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // Pulse Animation when listening
  useEffect(() => {
    if (voiceState === 'listening' || voiceState === 'hearing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
    
    return () => {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [voiceState, pulseAnim, glowAnim]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const getButtonSize = () => {
    switch (size) {
      case 'small': return 40;
      case 'large': return 72;
      default: return 56;
    }
  };
  
  const getIconSize = () => {
    switch (size) {
      case 'small': return 18;
      case 'large': return 32;
      default: return 24;
    }
  };
  
  const getIcon = () => {
    if (!isSupported) return '🔇';
    
    switch (voiceState) {
      case 'listening':
      case 'hearing':
        return '🎤';
      case 'processing':
        return '⏳';
      case 'speaking':
        return '🔊';
      case 'paused':
        return '⏸️';
      case 'error':
        return '❌';
      default:
        return '🎙️';
    }
  };
  
  const getBackgroundColor = () => {
    if (!isSupported || disabled) return AURA_COLORS.glass.border;
    
    switch (voiceState) {
      case 'listening':
      case 'hearing':
        return AURA_COLORS.neon.cyan;
      case 'processing':
        return '#f59e0b';
      case 'speaking':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      default:
        return AURA_COLORS.glass.surface;
    }
  };
  
  const isActive = voiceState === 'listening' || voiceState === 'hearing';
  const buttonSize = getButtonSize();
  
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <View style={styles.container}>
      {/* Glow Ring */}
      {isActive && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: buttonSize + 20,
              height: buttonSize + 20,
              borderRadius: (buttonSize + 20) / 2,
              opacity: glowAnim,
            },
          ]}
        />
      )}
      
      {/* Main Button */}
      <Animated.View
        style={[
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              backgroundColor: getBackgroundColor(),
            },
          ]}
          onPress={onPress}
          onLongPress={onLongPress}
          disabled={disabled || !isSupported}
          activeOpacity={0.7}
        >
          <Text style={[styles.icon, { fontSize: getIconSize() }]}>
            {getIcon()}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Status Text */}
      {isActive && partialTranscript && (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText} numberOfLines={1}>
            {partialTranscript}
          </Text>
        </View>
      )}
      
      {/* Helper Text */}
      {!isSupported && (
        <Text style={styles.helperText}>Nicht verfügbar</Text>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  glowRing: {
    position: 'absolute',
    backgroundColor: AURA_COLORS.neon.cyanGlow,
    borderWidth: 2,
    borderColor: AURA_COLORS.neon.cyan,
  },
  
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AURA_COLORS.glass.border,
    ...Platform.select({
      ios: {
        shadowColor: AURA_COLORS.neon.cyan,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  icon: {
    textAlign: 'center',
  },
  
  transcriptContainer: {
    position: 'absolute',
    bottom: -30,
    left: -100,
    right: -100,
    alignItems: 'center',
  },
  transcriptText: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 200,
  },
  
  helperText: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    color: AURA_COLORS.text.muted,
  },
});

export default VoiceButton;

