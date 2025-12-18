/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in child component tree
 * Displays fallback UI instead of crashing the entire app
 * 
 * @author Gemini 3 Ultra - Frontend Optimization
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { 
    hasError: false,
    error: undefined
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // TODO: Send to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center backdrop-blur-md">
          <div className="rounded-full bg-red-500/20 p-4 text-red-400">
            <AlertTriangle size={32} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-red-400">
            Oops, etwas ging schief.
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button 
              onClick={this.handleReset}
              className="rounded-lg bg-red-500/20 px-4 py-2 text-red-300 transition-colors hover:bg-red-500/30"
            >
              Erneut versuchen
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-gray-300 transition-colors hover:bg-white/10"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

