import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/colors';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ScriptsScreen from '../screens/ScriptsScreen';
import LeadsScreen from '../screens/LeadsScreen';
import ToolsScreen from '../screens/ToolsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              break;
            case 'Scripts':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Leads':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Tools':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return (
            <View style={focused ? styles.activeTab : undefined}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ tabBarLabel: 'Copilot' }}
      />
      <Tab.Screen 
        name="Scripts" 
        component={ScriptsScreen}
        options={{ tabBarLabel: 'Scripts' }}
      />
      <Tab.Screen 
        name="Leads" 
        component={LeadsScreen}
        options={{ tabBarLabel: 'Leads' }}
      />
      <Tab.Screen 
        name="Tools" 
        component={ToolsScreen}
        options={{ tabBarLabel: 'Tools' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeTab: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    padding: 4,
  },
});

