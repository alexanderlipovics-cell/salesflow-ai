import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Dashboard error boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-sf-bg p-4">
          <div className="max-w-md space-y-4 rounded-3xl border border-sf-border bg-sf-card p-8 text-center shadow-sf-md">
            <AlertTriangle className="mx-auto h-10 w-10 text-sf-error" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-sf-text">Etwas ist schiefgelaufen</h2>
            <p className="text-sm text-sf-text-muted">
              {this.state.error?.message ?? 'Ein unerwarteter Fehler ist aufgetreten.'}
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Seite neu laden
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
