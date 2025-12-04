/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMMAND CENTER - CEO DASHBOARD SCREEN                                     ║
 * ║  Premium Dashboard für Executive Overview                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { GreetingHeader } from '../components/command/GreetingHeader';
import { RevenueTracker } from '../components/command/RevenueTracker';
import { QuickActions } from '../components/command/QuickActions';
import { AURA_COLORS, AURA_SPACING, AURA_RADIUS, AURA_FONTS, AURA_SHADOWS } from '../components/aura';

interface CommandCenterScreenProps {
  navigation: any;
}

export default function CommandCenterScreen({ navigation }: CommandCenterScreenProps) {
  const { firstName, profile } = useAuth();
  const userName = firstName || profile?.first_name || 'Alexander';

  // Demo-Daten - später aus API laden
  const [revenue] = useState({
    current: 12500,
    goal: 30000,
  });

  const handleActionPress = (screen: string, actionLabel?: string) => {
    // Spezielle Navigation für bestimmte Actions
    if (screen === 'Leads') {
      if (actionLabel === 'JAGEN') {
        // Für "JAGEN" - Navigiere zu Campaign Screen
        navigation.navigate('CampaignScreen');
      } else if (actionLabel === 'CLOSEN') {
        // Für "CLOSEN" - offene Deals (qualified/proposal_sent)
        navigation.navigate('Leads', { filter: 'qualified' });
      } else {
        navigation.navigate(screen);
      }
    } else {
      navigation.navigate(screen);
    }
  };

  const handleMentorPress = () => {
    navigation.navigate('MentorChat');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* A) HEADER */}
        <GreetingHeader userName={userName} />

        {/* B) UMSATZ-TRACKER */}
        <View style={styles.section}>
          <RevenueTracker
            current={revenue.current}
            goal={revenue.goal}
            currency="€"
          />
        </View>

        {/* C) COMMAND BUTTONS */}
        <View style={styles.section}>
          <QuickActions onActionPress={handleActionPress} />
        </View>

        {/* D) ALERTS WIDGET PLACEHOLDER */}
        <View style={styles.section}>
          <View style={styles.alertsContainer}>
            <Text style={styles.alertsPlaceholder}>
              Alerts werden hier angezeigt
            </Text>
            <Text style={styles.alertsSubtext}>
              Später: AlertsWidget von Agent 2 einbinden
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* E) FLOATING MENTOR BUTTON */}
      <Pressable
        style={styles.mentorButton}
        onPress={handleMentorPress}
      >
        <LinearGradient
          colors={[AURA_COLORS.neon.purple, AURA_COLORS.neon.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mentorButtonGradient}
        >
          <Text style={styles.mentorButtonIcon}>🤖</Text>
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Platz für Floating Button
  },
  section: {
    paddingHorizontal: AURA_SPACING.lg,
    paddingVertical: AURA_SPACING.md,
  },
  alertsContainer: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    padding: AURA_SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...AURA_SHADOWS.md,
  },
  alertsPlaceholder: {
    ...AURA_FONTS.subtitle,
    fontSize: 16,
    color: AURA_COLORS.text.muted,
    marginBottom: AURA_SPACING.xs,
  },
  alertsSubtext: {
    ...AURA_FONTS.caption,
    fontSize: 12,
    color: AURA_COLORS.text.subtle,
    textAlign: 'center',
  },
  mentorButton: {
    position: 'absolute',
    bottom: AURA_SPACING.xl + (Platform.OS === 'ios' ? 20 : 0),
    right: AURA_SPACING.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    ...AURA_SHADOWS.lg,
  },
  mentorButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentorButtonIcon: {
    fontSize: 32,
  },
});

