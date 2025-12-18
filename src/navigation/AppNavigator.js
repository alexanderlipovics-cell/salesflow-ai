import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Auth Screens
// import LoginScreen from '../screens/auth/LoginScreen';
// import SignupScreen from '../screens/auth/SignupScreen';

// Main Navigation
import MainNavigator from './MainNavigator';
// Oder kompakte Variante:
// import MainNavigatorCompact from './MainNavigatorCompact';

const Stack = createStackNavigator();

/**
 * Root Navigator - Verbindet Auth und Main App
 * 
 * Entscheide dich für eine Variante:
 * - MainNavigator: Alle Features als separate Tabs (6+ Tabs)
 * - MainNavigatorCompact: Tools gruppiert in Stack (4-5 Tabs) ⭐ EMPFOHLEN
 */
export default function AppNavigator() {
  // TODO: Auth-Status aus Context/AsyncStorage holen
  const isAuthenticated = true; // Hier Logik für Auth-Status einfügen (z.B. aus Context)

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
          // Oder kompakte Variante:
          // <Stack.Screen name="Main" component={MainNavigatorCompact} />
        ) : (
          // Auth Screens (auskommentiert falls nicht vorhanden)
          // <Stack.Screen name="Login" component={LoginScreen} />
          // <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

