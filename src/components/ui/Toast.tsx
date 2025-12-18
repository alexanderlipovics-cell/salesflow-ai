/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TOAST NOTIFICATION SYSTEM                                                 ║
 * ║  Globale Toast-Nachrichten für Feedback                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
// @ts-ignore - Expo vector icons
import { Ionicons } from '@expo/vector-icons';

// =============================================================================
// TYPES
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  show: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// TOAST ITEM COMPONENT
// =============================================================================

const TOAST_CONFIG = {
  success: { icon: 'checkmark-circle', bg: '#22C55E', border: '#16A34A' },
  error: { icon: 'close-circle', bg: '#EF4444', border: '#DC2626' },
  warning: { icon: 'warning', bg: '#F59E0B', border: '#D97706' },
  info: { icon: 'information-circle', bg: '#3B82F6', border: '#2563EB' },
};

function ToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: Toast; 
  onDismiss: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  
  const config = TOAST_CONFIG[toast.type];
  
  useEffect(() => {
    // Einblenden
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto-dismiss
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        dismissWithAnimation();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const dismissWithAnimation = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id);
    });
  };
  
  return (
    <Animated.View
      style={[
        styles.toastItem,
        { 
          backgroundColor: config.bg,
          borderColor: config.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toastContent}>
        <Ionicons name={config.icon as any} size={24} color="#FFFFFF" />
        <View style={styles.toastText}>
          <Text style={styles.toastTitle}>{toast.title}</Text>
          {toast.message && (
            <Text style={styles.toastMessage}>{toast.message}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.toastActions}>
        {toast.action && (
          <TouchableOpacity 
            onPress={() => {
              toast.action?.onPress();
              dismissWithAnimation();
            }}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={dismissWithAnimation} style={styles.dismissButton}>
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// TOAST PROVIDER
// =============================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);
  
  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${idCounter.current++}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);
  
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);
  
  const success = useCallback((title: string, message?: string) => {
    show({ type: 'success', title, message });
  }, [show]);
  
  const error = useCallback((title: string, message?: string) => {
    show({ type: 'error', title, message, duration: 6000 }); // Errors länger anzeigen
  }, [show]);
  
  const warning = useCallback((title: string, message?: string) => {
    show({ type: 'warning', title, message });
  }, [show]);
  
  const info = useCallback((title: string, message?: string) => {
    show({ type: 'info', title, message });
  }, [show]);
  
  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss, dismissAll }}>
      {children}
      
      {/* Toast Container */}
      <SafeAreaView style={styles.container} pointerEvents="box-none">
        <View style={styles.toastList} pointerEvents="box-none">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toastList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastText: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastMessage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  toastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    padding: 4,
  },
});

export default ToastProvider;

