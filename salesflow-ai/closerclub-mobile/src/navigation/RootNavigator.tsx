/**
 * Root Navigator für CloserClub Mobile
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { COLORS } from '../config/theme';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import SpeedHunterScreen from '../screens/SpeedHunterScreen';
import LeadManagementScreen from '../screens/LeadManagementScreen';
import AICoachScreen from '../screens/AICoachScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: COLORS.background,
          },
        }}
      >
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Dashboard',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="SpeedHunter"
          component={SpeedHunterScreen}
          options={{
            title: 'Speed Hunter',
          }}
        />
        <Stack.Screen
          name="LeadManagement"
          component={LeadManagementScreen}
          options={{
            title: 'Lead Management',
          }}
        />
        <Stack.Screen
          name="AICoach"
          component={AICoachScreen}
          options={{
            title: 'AI Coach',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

