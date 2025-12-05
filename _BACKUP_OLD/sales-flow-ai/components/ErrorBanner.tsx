import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSalesFlow } from '../context/SalesFlowContext';

const ANIMATION_DURATION = 300;
const AUTO_DISMISS_MS = 6000;

export const ErrorBanner: React.FC = () => {
  const { apiError, dismissError } = useSalesFlow();
  const translateY = useRef(new Animated.Value(-140)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const title = useMemo(() => {
    const statusLabel = apiError.status ?? 'Unbekannt';
    return `⚠️ Fehler ${statusLabel}`;
  }, [apiError.status]);

  const animateTo = (toValue: number) => {
    animationRef.current?.stop();
    animationRef.current = Animated.timing(translateY, {
      toValue,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    });
    animationRef.current.start();
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (apiError.message) {
      animateTo(0);

      const shouldAutoDismiss = apiError.status !== 401 && apiError.status !== 403;
      if (shouldAutoDismiss) {
        timeoutRef.current = setTimeout(() => {
          dismissError();
        }, AUTO_DISMISS_MS);
      }
    } else {
      animateTo(-140);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      animationRef.current?.stop();
    };
  }, [apiError.message, apiError.status, apiError.timestamp, dismissError]);

  const hasError = Boolean(apiError.message);

  return (
    <Animated.View
      pointerEvents={hasError ? 'auto' : 'none'}
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.banner}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {apiError.message ?? 'Unbekannter Fehler'}
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={dismissError} activeOpacity={0.8}>
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  banner: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  button: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ErrorBanner;

