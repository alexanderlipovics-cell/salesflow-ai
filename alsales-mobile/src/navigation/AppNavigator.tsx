import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import AICopilotScreen from '../screens/AICopilotScreen';
import InboxScreen from '../screens/InboxScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

interface AppNavigatorProps {
  onLogout: () => void;
}

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1A202C',
            borderTopColor: '#374151',
            borderTopWidth: 1,
            height: 85,
            paddingBottom: 30,
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#06B6D4',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text>,
          }}
        >
          {() => <DashboardScreen onLogout={onLogout} />}
        </Tab.Screen>
        
        <Tab.Screen
          name="Leads"
          component={LeadsScreen}
          options={{
            tabBarLabel: 'Leads',
            tabBarIcon: () => <Text style={{ fontSize: 24 }}>👥</Text>,
          }}
        />
        
        <Tab.Screen
          name="AI"
          component={AICopilotScreen}
          options={{
            tabBarLabel: 'CHIEF',
            tabBarIcon: () => <Text style={{ fontSize: 24 }}>🤖</Text>,
          }}
        />
        
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{
            tabBarLabel: 'Inbox',
            tabBarIcon: () => <Text style={{ fontSize: 24 }}>📥</Text>,
          }}
        />
        
        <Tab.Screen
          name="Profile"
          options={{
            tabBarLabel: 'Profil',
            tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text>,
          }}
        >
          {() => <ProfileScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
