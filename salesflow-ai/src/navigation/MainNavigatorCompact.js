import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Screen Imports ---
// Bestehende Screens
// import DashboardScreen from '../screens/main/DashboardScreen';

// Neue Screens
import CommissionTrackerScreen from '../screens/main/CommissionTrackerScreen';
import PerformanceInsightsScreen from '../screens/main/PerformanceInsightsScreen';
import { SalesToolsNavigator } from './SalesToolsNavigator';

const Tab = createBottomTabNavigator();

/**
 * Kompakte Navigation-Variante (max. 5 Tabs)
 * 
 * Diese Variante gruppiert die Sales Tools in einem Stack Navigator,
 * um die Bottom Bar nicht zu überfüllen (Best Practice: max. 5 Tabs).
 */
const MainNavigatorCompact = () => {
  const activeColor = '#007AFF';
  const inactiveColor = '#8E8E93';

  return (
    <Tab.Navigator
      initialRouteName="Performance"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          backgroundColor: '#FFFFFF',
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'circle';

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Commissions':
              iconName = focused ? 'cash-multiple' : 'cash';
              break;
            case 'SalesTools':
              iconName = focused ? 'tools' : 'tools';
              break;
            case 'Performance':
              iconName = focused ? 'chart-line' : 'chart-line-variant';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      {/* 1. Dashboard (Optional - auskommentiert falls nicht vorhanden) */}
      {/* <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Home' }}
      /> */}

      {/* 2. Commission Tracker */}
      <Tab.Screen 
        name="Commissions" 
        component={CommissionTrackerScreen} 
        options={{ tabBarLabel: 'Pay' }}
      />

      {/* 3. Sales Tools (Stack Navigator mit Closing Coach, Cold Call, Gamification) */}
      <Tab.Screen 
        name="SalesTools" 
        component={SalesToolsNavigator}
        options={{ tabBarLabel: 'Tools' }}
      />

      {/* 4. Performance Insights */}
      <Tab.Screen 
        name="Performance" 
        component={PerformanceInsightsScreen} 
        options={{ tabBarLabel: 'Stats' }}
      />

    </Tab.Navigator>
  );
};

export default MainNavigatorCompact;

