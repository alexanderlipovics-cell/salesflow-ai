import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screen Imports
import ClosingCoachScreen from '../screens/main/ClosingCoachScreen';
import ColdCallAssistantScreen from '../screens/main/ColdCallAssistantScreen';
import GamificationScreen from '../screens/main/GamificationScreen';

// --- TypeScript Definitions ---
export type SalesToolsStackParamList = {
  ToolsMenu: undefined;
  ClosingCoach: undefined;
  ColdCall: undefined;
  Gamification: undefined;
};

const ToolsStack = createStackNavigator<SalesToolsStackParamList>();

// --- Tools Menu Screen ---
function ToolsMenuScreen({ navigation }: any) {
  const tools = [
    {
      id: 'closing-coach',
      title: 'Closing Coach',
      description: 'KI-Analyse für Deal-Closing',
      icon: 'handshake',
      color: '#007AFF',
      screen: 'ClosingCoach',
    },
    {
      id: 'cold-call',
      title: 'Cold Call Assistant',
      description: 'Gesprächsleitfaden & Übungsmodus',
      icon: 'phone-in-talk',
      color: '#34C759',
      screen: 'ColdCall',
    },
    {
      id: 'gamification',
      title: 'Gamification',
      description: 'Achievements, Streaks & Leaderboard',
      icon: 'trophy',
      color: '#FF9500',
      screen: 'Gamification',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sales Tools</Text>
      <Text style={styles.subtitle}>Wähle ein Tool aus</Text>

      <View style={styles.grid}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.toolCard, { borderLeftColor: tool.color }]}
            onPress={() => navigation.navigate(tool.screen)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${tool.color}15` }]}>
              <Icon name={tool.icon} size={32} color={tool.color} />
            </View>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDescription}>{tool.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// --- Navigator ---
export function SalesToolsNavigator() {
  return (
    <ToolsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#FFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <ToolsStack.Screen
        name="ToolsMenu"
        component={ToolsMenuScreen}
        options={{
          title: 'Sales Tools',
          headerLeft: () => null, // Kein Back-Button auf Haupt-Screen
        }}
      />
      <ToolsStack.Screen
        name="ClosingCoach"
        component={ClosingCoachScreen}
        options={{
          title: 'Closing Coach',
        }}
      />
      <ToolsStack.Screen
        name="ColdCall"
        component={ColdCallAssistantScreen}
        options={{
          title: 'Cold Call Assistant',
        }}
      />
      <ToolsStack.Screen
        name="Gamification"
        component={GamificationScreen}
        options={{
          title: 'Gamification',
        }}
      />
    </ToolsStack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A2027',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  grid: {
    gap: 16,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2027',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default SalesToolsNavigator;

