/**
 * Main Tab Navigator für CloserClub Mobile
 * Bottom Tab Navigation mit den 5 neuen Features
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/theme';

// Neue Screens (werden importiert, sobald sie existieren)
import CommissionTrackerScreen from '../screens/main/CommissionTrackerScreen';
import ColdCallAssistantScreen from '../screens/main/ColdCallAssistantScreen';
import ClosingCoachScreen from '../screens/main/ClosingCoachScreen';
import PerformanceInsightsScreen from '../screens/main/PerformanceInsightsScreen';
import GamificationScreen from '../screens/main/GamificationScreen';

// Bestehende Screens
import DashboardScreen from '../screens/DashboardScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Commissions: undefined;
  ColdCall: undefined;
  ClosingCoach: undefined;
  Performance: undefined;
  Gamification: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary || '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          backgroundColor: COLORS.background || '#FFFFFF',
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'circle';

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Commissions':
              iconName = focused ? 'cash-multiple' : 'cash';
              break;
            case 'ColdCall':
              iconName = focused ? 'phone-in-talk' : 'phone-classic';
              break;
            case 'ClosingCoach':
              iconName = focused ? 'handshake' : 'handshake-outline';
              break;
            case 'Performance':
              iconName = focused ? 'chart-line' : 'chart-line-variant';
              break;
            case 'Gamification':
              iconName = focused ? 'trophy' : 'trophy-outline';
              break;
          }

          return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="ColdCall"
        component={ColdCallAssistantScreen}
        options={{ tabBarLabel: 'Calls' }}
      />
      <Tab.Screen
        name="Performance"
        component={PerformanceInsightsScreen}
        options={{ tabBarLabel: 'Stats' }}
      />
      <Tab.Screen
        name="Commissions"
        component={CommissionTrackerScreen}
        options={{ tabBarLabel: 'Pay' }}
      />
      <Tab.Screen
        name="ClosingCoach"
        component={ClosingCoachScreen}
        options={{ tabBarLabel: 'Coach' }}
      />
      {/* Gamification auskommentiert, um Tab-Bar nicht zu überfüllen */}
      {/* <Tab.Screen
        name="Gamification"
        component={GamificationScreen}
        options={{ tabBarLabel: 'Rank' }}
      /> */}
    </Tab.Navigator>
  );
}

