/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ERROR BOUNDARY                                                            ║
 * ║  Fängt React Fehler und zeigt Fallback UI                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// =============================================================================
// TYPES
// =============================================================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Callback
    this.props.onError?.(error, errorInfo);
    
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom Fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default Error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={48} color="#EF4444" />
            </View>
            
            <Text style={styles.title}>Etwas ist schiefgelaufen</Text>
            <Text style={styles.message}>
              Ein unerwarteter Fehler ist aufgetreten. Wir arbeiten daran, das Problem zu beheben.
            </Text>

            {/* Error Details (Development) */}
            {this.props.showDetails && this.state.error && (
              <ScrollView style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Fehlerdetails:</Text>
                <Text style={styles.detailsText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={this.handleRetry}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Erneut versuchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// HOOK: useErrorHandler
// =============================================================================

export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`[${context || 'Error'}]`, error);
    
    // TODO: Send to error tracking service
    // Sentry.captureException(error, { extra: { context } });
  }, []);

  return { handleError };
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  detailsContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    width: '100%',
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'monospace',
  },
  stackTrace: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ErrorBoundary;

