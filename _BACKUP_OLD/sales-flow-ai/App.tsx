// ============================================================================
// FILE: App.tsx - Main Entry Point for Sales Flow AI
// ============================================================================

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, Platform } from 'react-native';

/**
 * Main App Component
 * 
 * This is the entry point for the Expo/React Native app
 * 
 * TODO: Add Navigation (React Navigation or Expo Router)
 * TODO: Add State Management (Context API or Zustand)
 * TODO: Add Authentication Flow
 */
export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sales Flow AI</Text>
        <Text style={styles.subtitle}>App läuft erfolgreich! 🚀</Text>
        <Text style={styles.info}>Version 1.0.0</Text>
        <Text style={styles.platform}>
          Platform: {Platform.OS} {Platform.Version}
        </Text>
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22d3ee',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#cbd5e1',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 10,
  },
  platform: {
    fontSize: 12,
    color: '#475569',
    marginTop: 5,
  },
});

