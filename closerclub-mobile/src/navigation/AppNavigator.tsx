import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../config/theme';
import MainTabNavigator from './MainTabNavigator';

export default function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{flex:1, justifyContent:'center', backgroundColor: COLORS.background}}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <MainTabNavigator /> : <AuthScreen />}
    </NavigationContainer>
  );
}
