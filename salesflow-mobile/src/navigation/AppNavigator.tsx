import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import ObjectionHandlerScreen from '../screens/ObjectionHandlerScreen';
import FollowUpScreen from '../screens/FollowUpScreen';
import ColdCallScreen from '../screens/ColdCallScreen';
import ClosingScreen from '../screens/ClosingScreen';
import AutopilotScreen from '../screens/AutopilotScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ObjectionHandler" component={ObjectionHandlerScreen} />
        <Stack.Screen name="FollowUp" component={FollowUpScreen} />
        <Stack.Screen name="ColdCall" component={ColdCallScreen} />
        <Stack.Screen name="Closing" component={ClosingScreen} />
        <Stack.Screen name="Autopilot" component={AutopilotScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
