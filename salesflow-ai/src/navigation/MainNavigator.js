import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Screen Imports ---
// Bestehende Screens
// import DashboardScreen from '../screens/main/DashboardScreen';

// Neue Screens
import CommissionTrackerScreen from '../screens/main/CommissionTrackerScreen';
import ColdCallAssistantScreen from '../screens/main/ColdCallAssistantScreen';
import ClosingCoachScreen from '../screens/main/ClosingCoachScreen';
import PerformanceInsightsScreen from '../screens/main/PerformanceInsightsScreen';
import GamificationScreen from '../screens/main/GamificationScreen';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  // Konstanten für Farben
  const activeColor = '#007AFF';
  const inactiveColor = '#8E8E93';

  return (
    <Tab.Navigator
      initialRouteName="ColdCall"
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
        // Icon Logik
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'circle';

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

      {/* 2. Cold Call Assistant */}
      <Tab.Screen 
        name="ColdCall" 
        component={ColdCallAssistantScreen} 
        options={{ tabBarLabel: 'Calls' }}
      />

      {/* 3. Performance */}
      <Tab.Screen 
        name="Performance" 
        component={PerformanceInsightsScreen} 
        options={{ tabBarLabel: 'Stats' }}
      />

      {/* 4. Commission Tracker */}
      <Tab.Screen 
        name="Commissions" 
        component={CommissionTrackerScreen} 
        options={{ tabBarLabel: 'Pay' }}
      />

      {/* 5. Closing Coach */}
      <Tab.Screen 
        name="ClosingCoach" 
        component={ClosingCoachScreen} 
        options={{ tabBarLabel: 'Coach' }}
      />

      {/* HINWEIS: Gamification wurde hier weggelassen, um die Tab-Bar nicht zu überfüllen (max 5).
          Alternativ könnte man "ClosingCoach" und "Gamification" in einen Stack verschieben. 
      */}

    </Tab.Navigator>
  );
};

export default MainNavigator;

