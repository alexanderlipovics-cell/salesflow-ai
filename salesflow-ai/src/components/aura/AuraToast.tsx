/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - TOAST NOTIFICATIONS                                             ║
 * ║  Glassmorphism Toast-System mit Neon-Accents                               ║
 * ║  - Success, Error, Warning, Info Varianten                                 ║
 * ║  - Animierte Ein-/Ausblendung                                              ║
 * ║  - Progress Bar für Auto-Dismiss                                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { AURA_COLORS, AURA_RADIUS, AURA_SHADOWS } from './theme';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST CONFIGS
// ═══════════════════════════════════════════════════════════════════════════

const TOAST_STYLES: Record<ToastType, { icon: string; color: string; bgColor: string }> = {
  success: {
    icon: '✓',
    color: AURA_COLORS.neon.green,
    bgColor: AURA_COLORS.neon.greenSubtle,
  },
  error: {
    icon: '✕',
    color: AURA_COLORS.neon.rose,
    bgColor: AURA_COLORS.neon.roseSubtle,
  },
  warning: {
    icon: '⚠',
    color: AURA_COLORS.neon.amber,
    bgColor: AURA_COLORS.neon.amberSubtle,
  },
  info: {
    icon: 'ℹ',
    color: AURA_COLORS.neon.cyan,
    bgColor: AURA_COLORS.neon.cyanSubtle,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const ToastContext = createContext<ToastContextType | null>(null);

export const useAuraToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAuraToast must be used within AuraToastProvider');
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface AuraToastProps extends ToastConfig {
  onDismiss: () => void;
}

const AuraToast: React.FC<AuraToastProps> = ({
  type,
  title,
  message,
  duration = 4000,
  action,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const style = TOAST_STYLES[type];
  
  useEffect(() => {
    // Slide In
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Progress Bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();
    
    // Auto Dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, duration);
    
    return () => clearTimeout(timer);
  }, []);
  
  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Glass Background */}
      <View style={styles.glassBackground}>
        {/* Accent Glow */}
        <View style={[styles.accentGlow, { backgroundColor: style.bgColor }]} />
        
        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: style.bgColor }]}>
            <Text style={[styles.icon, { color: style.color }]}>{style.icon}</Text>
          </View>
          
          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {message && (
              <Text style={styles.message} numberOfLines={2}>{message}</Text>
            )}
          </View>
          
          {/* Action or Close */}
          {action ? (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: style.color + '40' }]}
              onPress={() => {
                action.onPress();
                dismiss();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: style.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.closeButton} onPress={dismiss} activeOpacity={0.7}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: style.color,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TOAST PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export const AuraToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(ToastConfig & { id: string })[]>([]);
  
  const showToast = (config: ToastConfig) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...config, id }]);
  };
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const success = (title: string, message?: string) => showToast({ type: 'success', title, message });
  const error = (title: string, message?: string) => showToast({ type: 'error', title, message });
  const warning = (title: string, message?: string) => showToast({ type: 'warning', title, message });
  const info = (title: string, message?: string) => showToast({ type: 'info', title, message });

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <View key={toast.id} style={{ marginTop: index * 8 }}>
            <AuraToast
              {...toast}
              onDismiss={() => removeToast(toast.id)}
            />
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  
  toast: {
    width: width - 32,
    maxWidth: 400,
  },
  
  glassBackground: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    overflow: 'hidden',
    ...AURA_SHADOWS.glass,
  },
  
  accentGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 16,
    gap: 12,
  },
  
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: AURA_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  icon: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  textContainer: {
    flex: 1,
  },
  
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  
  message: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AURA_RADIUS.sm,
    borderWidth: 1,
  },
  
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AURA_COLORS.glass.highlight,
  },
  
  closeText: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
  
  progressContainer: {
    height: 2,
    backgroundColor: AURA_COLORS.glass.border,
  },
  
  progressBar: {
    height: '100%',
  },
});

export default AuraToastProvider;

