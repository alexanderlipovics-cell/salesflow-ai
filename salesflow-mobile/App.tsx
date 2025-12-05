import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { AppTheme, COLORS } from './src/theme';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import LeadListScreen from './src/screens/LeadListScreen';
import LeadDetailScreen from './src/screens/LeadDetailScreen';
import MagicScriptScreen from './src/screens/MagicScriptScreen';
import ChatScreen from './src/screens/ChatScreen';
import ScriptsScreen from './src/screens/ScriptsScreen';
import PaywallScreen from './src/screens/PaywallScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarIcon: ({ color, size }) => {
        let icon = 'home';
        if (route.name === 'Home') icon = 'home';
        else if (route.name === 'Leads') icon = 'people';
        else if (route.name === 'Scripts') icon = 'document-text';
        else if (route.name === 'Chat') icon = 'chatbubble';
        return <Ionicons name={icon as any} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leads" component={LeadListScreen} />
      <Tab.Screen name="Scripts" component={ScriptsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then(value => {
      setHasOnboarded(value === 'true');
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}><ActivityIndicator color={COLORS.primary} /></View>;

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasOnboarded && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="LeadDetailScreen" component={LeadDetailScreen} />
        <Stack.Screen name="MagicScriptScreen" component={MagicScriptScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="PaywallScreen" component={PaywallScreen} options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
