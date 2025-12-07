/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  CLOSERCLUB MOBILE APP                                                     ║
 * ║  Main Entry Point                                                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { setAuthTokenProvider } from './src/services/api';

// Inner Component to access AuthContext
function AppContent() {
  const { session } = useAuth();

  useEffect(() => {
    // Set Auth Token Provider für API Service
    setAuthTokenProvider(async () => {
      return session?.accessToken || null;
    });
  }, [session]);

  return (
    <>
      <AppNavigator />
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
