/**
 * Sentry Error Monitoring für SalesFlow AI Frontend
 *
 * Features:
 * - React Error Boundary Integration
 * - Performance Monitoring
 * - User Context Tracking
 * - Release Tracking
 */

import * as Sentry from '@sentry/react';
import {
  useEffect,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';

// Sentry Konfiguration
const initSentry = () => {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN nicht konfiguriert, überspringe Initialisierung');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,

    integrations: [
      // React Error Boundary Integration
      Sentry.browserTracingIntegration(),
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Error Filtering
    beforeSend: beforeSendHandler,
    beforeBreadcrumb: beforeBreadcrumbHandler,

    // Release Tracking
    release: getReleaseVersion(),
    dist: getDistribution(),
  });

  console.log(`Sentry initialisiert für Environment: ${SENTRY_ENVIRONMENT}`);
};

/**
 * Filter und bereichere Error Events vor dem Senden
 */
const beforeSendHandler = (event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null => {
  // Filter häufige nicht-fehlerhafte Events
  if (hint.originalException) {
    const error = hint.originalException;

    // Filter Network Errors für externe APIs (häufig temporär)
    if (error instanceof TypeError && error.message?.includes('fetch')) {
      return null;
    }

    // Filter Auth Errors (sind normales Verhalten)
    if (error.message?.includes('401') || error.message?.includes('403')) {
      return null;
    }
  }

  // Bereichere Event mit zusätzlichen Context
  if (event.exception) {
    event.tags = {
      ...event.tags,
      component: 'frontend',
      user_agent: navigator.userAgent,
    };
  }

  return event;
};

/**
 * Filter und bereichere Breadcrumbs
 */
const beforeBreadcrumbHandler = (breadcrumb: Sentry.Breadcrumb, hint?: Sentry.BreadcrumbHint): Sentry.Breadcrumb | null => {
  // Filter noisy Breadcrumbs
  if (breadcrumb.category === 'navigation' && breadcrumb.data?.to?.includes('/health')) {
    return null;
  }

  if (breadcrumb.category === 'xhr' && breadcrumb.data?.url?.includes('/health')) {
    return null;
  }

  return breadcrumb;
};

/**
 * Release Version für Sentry
 */
const getReleaseVersion = (): string => {
  try {
    // Versuche Version aus package.json zu lesen
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
    return `salesflow-ai-frontend@${version}`;
  } catch {
    return 'salesflow-ai-frontend@unknown';
  }
};

/**
 * Distribution Identifier
 */
const getDistribution = (): string => {
  return 'frontend';
};

// User Context Helper
export const setUserContext = (userId: string, email?: string, additionalContext?: Record<string, any>) => {
  Sentry.setUser({
    id: userId,
    email: email,
    ...additionalContext,
  });
};

export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Performance Tracking
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({ name, op });
};

export const addBreadcrumb = (message: string, category?: string, level?: Sentry.SeverityLevel) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
};

// Error Capture Helpers
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureMessage(message, level);
  });
};

// Performance Measurement
export const measurePerformance = (name: string, startTime: number, endTime?: number) => {
  const duration = (endTime || Date.now()) - startTime;
  Sentry.metrics.distribution(name, duration, { unit: 'millisecond' });
};

// React Error Boundary für automatische Error Capturing
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Initialize Sentry beim Import wenn DSN verfügbar
if (SENTRY_DSN) {
  initSentry();
}

// Export für manuelle Verwendung
export { Sentry };
export default Sentry;
