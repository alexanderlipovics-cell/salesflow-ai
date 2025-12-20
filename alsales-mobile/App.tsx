import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('access_token');
    setIsLoggedIn(!!token);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F1419' }}>
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator onLogout={() => setIsLoggedIn(false)} />
    </>
  );
}
