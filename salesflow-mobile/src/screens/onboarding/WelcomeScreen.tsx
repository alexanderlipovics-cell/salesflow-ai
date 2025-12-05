import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary + '20', COLORS.background, COLORS.background]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="rocket" size={64} color={COLORS.text} />
              </LinearGradient>
            </View>
            
            <Text style={styles.title}>Willkommen bei</Text>
            <Text style={styles.appName}>SalesFlow</Text>
            <Text style={styles.subtitle}>
              Dein KI-gestützter Verkaufsassistent für maximalen Erfolg im Network Marketing
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: COLORS.primary + '20' }]}>
                  <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.featureText}>KI Chat</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                  <Ionicons name="document-text" size={24} color={COLORS.secondary} />
                </View>
                <Text style={styles.featureText}>Scripts</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: COLORS.accent + '20' }]}>
                  <Ionicons name="shield-checkmark" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.featureText}>Einwände</Text>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Tutorial')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>Los geht's</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Konfiguriere SalesFlow in nur 2 Minuten
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    paddingTop: height * 0.08,
    paddingBottom: SPACING.xl,
  },
  heroSection: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
  },
  featuresContainer: {
    marginVertical: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  disclaimer: {
    marginTop: SPACING.md,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

