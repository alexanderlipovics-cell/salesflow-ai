import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import TutorialScreen from '../screens/onboarding/TutorialScreen';
import CompanySelectScreen from '../screens/onboarding/CompanySelectScreen';
import GoalSelectScreen from '../screens/onboarding/GoalSelectScreen';
import MagicMomentScreen from '../screens/onboarding/MagicMomentScreen';
import { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Tutorial" component={TutorialScreen} />
      <Stack.Screen name="CompanySelect" component={CompanySelectScreen} />
      <Stack.Screen name="GoalSelect" component={GoalSelectScreen} />
      <Stack.Screen name="MagicMoment" component={MagicMomentScreen} />
    </Stack.Navigator>
  );
}

