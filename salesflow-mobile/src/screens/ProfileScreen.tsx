import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

export default function ProfileScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // TODO: Navigation zur Login-Seite
  };

  const menuItems = [
    { label: 'Einstellungen', icon: '⚙️', onPress: () => {} },
    { label: 'Abonnement', icon: '💳', onPress: () => {} },
    { label: 'Hilfe & Support', icon: '❓', onPress: () => {} },
    { label: 'Abmelden', icon: '🚪', onPress: handleLogout },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileIconContainer}>
            <Ionicons name="person-circle" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.profileName}>Benutzer</Text>
          <Text style={styles.profileEmail}>user@example.com</Text>
        </View>

        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            <View style={styles.menuItem}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  profileCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  profileIconContainer: {
    marginBottom: SPACING.md,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
});

