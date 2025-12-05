/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  ERROR BOUNDARY                                                            ║
 * ║  Fängt React Fehler und zeigt Fallback UI                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

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
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.iconContainer}>
              <span style={{ fontSize: '48px' }}>⚠️</span>
            </div>
            
            <h2 style={styles.title}>Etwas ist schiefgelaufen</h2>
            <p style={styles.message}>
              Ein unerwarteter Fehler ist aufgetreten. Wir arbeiten daran, das Problem zu beheben.
            </p>

            {/* Error Details (Development) */}
            {this.props.showDetails && this.state.error && (
              <div style={styles.detailsContainer}>
                <h3 style={styles.detailsTitle}>Fehlerdetails:</h3>
                <pre style={styles.detailsText}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button 
                style={styles.retryButton}
                onClick={this.handleRetry}
              >
                <span style={{ marginRight: '8px' }}>🔄</span>
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    minHeight: '100vh',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    alignItems: 'center',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: '#FEE2E2',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: '8px',
    textAlign: 'center',
    margin: 0,
  },
  message: {
    fontSize: '14px',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: '22px',
    marginBottom: '24px',
    margin: 0,
  },
  detailsContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: '8px',
    padding: '12px',
    maxHeight: '200px',
    width: '100%',
    marginBottom: '24px',
    overflow: 'auto',
  },
  detailsTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px',
    margin: 0,
  },
  detailsText: {
    fontSize: '12px',
    color: '#EF4444',
    fontFamily: 'monospace',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  stackTrace: {
    fontSize: '10px',
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: '8px',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  actions: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
  },
  retryButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    padding: '12px 24px',
    borderRadius: '8px',
    gap: '8px',
    border: 'none',
    cursor: 'pointer',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '600',
  },
};

export default ErrorBoundary;

