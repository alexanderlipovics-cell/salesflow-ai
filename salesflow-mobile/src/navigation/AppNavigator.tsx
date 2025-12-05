import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import OnboardingNavigator from './OnboardingNavigator';
import ObjectionHandlerScreen from '../screens/ObjectionHandlerScreen';
import FollowUpScreen from '../screens/FollowUpScreen';
import ColdCallScreen from '../screens/ColdCallScreen';
import ClosingScreen from '../screens/ClosingScreen';
import AutopilotScreen from '../screens/AutopilotScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PaywallScreen from '../screens/PaywallScreen';
import LeadListScreen from '../screens/LeadListScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import MagicScriptScreen from '../screens/MagicScriptScreen';
import { checkOnboardingComplete } from '../services/onboarding';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await checkOnboardingComplete();
      setHasCompletedOnboarding(completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        {!hasCompletedOnboarding ? (
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingNavigator} 
          />
        ) : null}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ObjectionHandler" component={ObjectionHandlerScreen} />
        <Stack.Screen name="FollowUp" component={FollowUpScreen} />
        <Stack.Screen name="ColdCall" component={ColdCallScreen} />
        <Stack.Screen name="Closing" component={ClosingScreen} />
        <Stack.Screen name="Autopilot" component={AutopilotScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen 
          name="Paywall" 
          component={PaywallScreen}
          options={{ 
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen name="LeadListScreen" component={LeadListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LeadDetailScreen" component={LeadDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen 
          name="MagicScriptScreen" 
          component={MagicScriptScreen} 
          options={{ 
            headerShown: false, 
            presentation: 'modal' 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
