import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import { View, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../config/theme';

// Placeholder für Dashboard (wird morgen ersetzt)
const DashboardPlaceholder = () => (
  <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: COLORS.background}}>
    <Text style={{color: '#fff', fontSize: 20}}>🎉 Eingeloggt! Dashboard kommt morgen.</Text>
  </View>
);

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
      {session ? <DashboardPlaceholder /> : <AuthScreen />}
    </NavigationContainer>
  );
}
