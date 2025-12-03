import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/components/ui/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';

// Initialize i18n (must be imported before any component that uses translations)
import './src/i18n';

export default function App() {
  return (
    <ErrorBoundary showDetails={__DEV__}>
      <AuthProvider>
        <ToastProvider>
          <AppNavigator />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}