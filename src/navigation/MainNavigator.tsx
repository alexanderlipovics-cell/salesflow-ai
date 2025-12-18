import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Screen Imports ---
// Bestehende Screens (Annahme - passe Pfade an)
// import DashboardScreen from '../screens/main/DashboardScreen';
// import ChatScreen from '../screens/main/ChatScreen';

// Neue Screens
import CommissionTrackerScreen from '../screens/main/CommissionTrackerScreen';
import ColdCallAssistantScreen from '../screens/main/ColdCallAssistantScreen';
import ClosingCoachScreen from '../screens/main/ClosingCoachScreen';
import PerformanceInsightsScreen from '../screens/main/PerformanceInsightsScreen';
import GamificationScreen from '../screens/main/GamificationScreen';

// --- TypeScript Definitions ---
export type MainTabParamList = {
  Dashboard: undefined;
  Commissions: undefined;
  ColdCall: undefined;
  ClosingCoach: undefined;
  Performance: undefined;
  Gamification: undefined;
  Chat: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  // Farben (kann aus Theme-Context kommen)
  const activeColor = '#007AFF';
  const inactiveColor = '#8E8E93';

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false, // Wir nutzen Header in den Screens selbst
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
        // Dynamisches Icon Mapping
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
            case 'Chat':
              iconName = focused ? 'message-text' : 'message-text-outline';
              break;
          }

          return <Icon name={iconName} size={24} color={color} />;
        },
      })}
    >
      {/* 1. Dashboard (Bestehend) */}
      {/* <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Home' }}
      /> */}

      {/* 2. Cold Call Assistant (High Frequency Usage) */}
      <Tab.Screen 
        name="ColdCall" 
        component={ColdCallAssistantScreen} 
        options={{ tabBarLabel: 'Calls' }}
      />

      {/* 3. Performance & Gamification (Zusammengefasst oder einzeln) */}
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

      {/* 6. Gamification (Optional: Könnte auch in Performance Stack sein) */}
      <Tab.Screen 
        name="Gamification" 
        component={GamificationScreen} 
        options={{ tabBarLabel: 'Rank' }}
      />

      {/* 7. Chat (Bestehend) */}
      {/* <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ tabBarLabel: 'Chat' }}
      /> */}

    </Tab.Navigator>
  );
};

export default MainNavigator;

