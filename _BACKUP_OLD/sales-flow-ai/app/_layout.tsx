import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SalesFlowProvider } from '../context/SalesFlowContext';
import { notificationManager } from '../utils/notifications';
import { notificationPreferences } from '../utils/notificationPreferences';
import { notificationAnalytics } from '../utils/notificationAnalytics';
import "../global.css"; // Wichtig: Importiert Tailwind
import { ErrorBanner } from '../components/ErrorBanner';

// QueryClient einmalig erstellen
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 Minuten
      retry: 2,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    const init = async () => {
      // Initialize notification managers
      await notificationPreferences.initialize();
      await notificationAnalytics.initialize();
      await notificationManager.initialize();

      // Request permissions
      await notificationManager.requestPermissions();
    };

    init();

    // Cleanup on unmount
    return () => {
      notificationManager.cleanup();
    };
  }, []);

  return (
    <SalesFlowProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <View className="flex-1 bg-slate-950">
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="lead-detail" 
              options={{ 
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right'
              }} 
            />
          </Stack>
          <ErrorBanner />
        </View>
      </QueryClientProvider>
    </SalesFlowProvider>
  );
}
