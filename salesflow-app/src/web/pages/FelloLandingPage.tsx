/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  FELLO - Landing Page (Web Version)                                      ║
 * ║  Hero & Problem Section - React Native Web Compatible                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const isWeb = Platform.OS === 'web';

// Colors
const COLORS = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  textPrimary: '#ffffff',
  textSecondary: '#e5e7eb',
  textMuted: '#9ca3af',
  bgDark: '#0f172a',
  bgCard: 'rgba(15, 23, 42, 0.6)',
  glass: 'rgba(255, 255, 255, 0.1)',
};

export default function FelloLandingPage() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const heroRef = useRef<View>(null);
  const problemRef = useRef<View>(null);

  const handleStartFree = () => {
    navigation.navigate('Register');
  };

  const handleViewPackages = () => {
    navigation.navigate('Pricing');
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={['#1e3a8a', '#7c3aed', '#4c1d95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        {/* Animated Background Particles */}
        <View style={styles.particlesContainer}>
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.1,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.heroContent} ref={heroRef}>
          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>✨</Text>
            <Text style={styles.badgeText}>
              Vertikale Sales-KI für Networker, MLM & Makler
            </Text>
          </View>

          {/* Headline */}
          <Text style={styles.heroHeadline}>
            Weniger tippen.{'\n'}
            <Text style={styles.heroHeadlineAccent}>Mehr abschließen.</Text>
          </Text>

          {/* Subheadline */}
          <Text style={styles.heroSubheadline}>
            FELLO – deine Sales KI für Networker, MLM & Makler.
          </Text>

          {/* Bullet Points */}
          <View style={styles.bulletPointsContainer}>
            {[
              {
                icon: '⏱️',
                text: 'Spare bis zu 10 Stunden Schreibarbeit pro Woche',
              },
              {
                icon: '💶',
                text: 'Hole Umsatz aus Kontakten, die du längst vergessen hast',
              },
              {
                icon: '🛡️',
                text: 'Reduziere dein Risiko für teure Abmahnungen',
              },
              {
                icon: '🤖',
                text: 'Dupliziere deine Sprache mit einer vertikalen Sales-KI',
              },
            ].map((point, index) => (
              <View key={index} style={styles.bulletCard}>
                <Text style={styles.bulletIcon}>{point.icon}</Text>
                <Text style={styles.bulletText}>{point.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={handleStartFree}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.accent, COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaPrimaryText}>Jetzt kostenlos starten</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={handleViewPackages}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaSecondaryText}>Alle Pakete ansehen</Text>
            </TouchableOpacity>
          </View>

          {/* Trust Badge */}
          <View style={styles.trustBadge}>
            <Text style={styles.trustIcon}>✓</Text>
            <Text style={styles.trustText}>
              14 Tage alle Funktionen testen. Keine Kreditkarte nötig.
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROBLEM SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={['#312e81', '#5b21b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.problemSection}
      >
        <View style={styles.problemContent} ref={problemRef}>
          {/* Headline */}
          <Text style={styles.problemHeadline}>
            Wie viel sind dir{' '}
            <Text style={styles.problemHeadlineAccent}>10 Stunden extra Fokus</Text>{' '}
            pro Woche wert?
          </Text>

          {/* Questions List */}
          <View style={styles.questionsContainer}>
            {[
              'Wie viel Zeit verbringst du täglich damit, E-Mails und Nachrichten zu schreiben?',
              'Wie viele Kontakte hast du in deiner Liste, die du nie wieder kontaktiert hast?',
              'Wie oft denkst du: "Hätte ich nur mehr Zeit für echte Verkaufsgespräche"?',
              'Wie viel kostet dich eine Abmahnung, wenn du versehentlich falsche Versprechen machst?',
              'Wie viele Leads gehen dir verloren, weil du nicht schnell genug antwortest?',
              'Wie viel Umsatz liegst du jeden Monat, weil du nicht alle Kontakte aktivierst?',
            ].map((question, index) => (
              <View key={index} style={styles.questionCard}>
                <View style={styles.questionNumber}>
                  <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.questionText}>{question}</Text>
              </View>
            ))}
          </View>

          {/* ROI Question */}
          <View style={styles.roiCard}>
            <Text style={styles.roiHeadline}>
              Was wäre, wenn du für{' '}
              <Text style={styles.roiPrice}>29–119€ pro Monat</Text>{' '}
              diese Probleme lösen könntest?
            </Text>
            <Text style={styles.roiSubtext}>
              Statt 10 Stunden pro Woche zu tippen, könntest du{' '}
              <Text style={styles.roiHighlight}>10 zusätzliche Verkaufsgespräche</Text>{' '}
              führen.
            </Text>
          </View>

          {/* Transition Text */}
          <View style={styles.transitionContainer}>
            <Text style={styles.transitionHeadline}>
              Genau hier setzt{' '}
              <Text style={styles.transitionAccent}>FELLO</Text>{' '}
              an...
            </Text>
            <Text style={styles.transitionText}>
              Eine vertikale Sales-KI, die deine Sprache lernt, deine Kontakte aktiviert und
              dein Risiko für Abmahnungen minimiert – während du dich auf das konzentrierst, was
              wirklich zählt: Verkaufen.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  contentContainer: {
    flexGrow: 1,
  },
  
  // Hero Section
  heroSection: {
    minHeight: isWeb ? 800 : 700,
    paddingTop: isWeb ? 100 : 60,
    paddingBottom: 60,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textPrimary,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  heroHeadline: {
    fontSize: isWeb ? 64 : 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: isWeb ? 76 : 44,
  },
  heroHeadlineAccent: {
    color: COLORS.accent,
  },
  heroSubheadline: {
    fontSize: isWeb ? 24 : 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: isWeb ? 36 : 26,
    maxWidth: 600,
  },
  bulletPointsContainer: {
    width: '100%',
    maxWidth: 800,
    marginBottom: 48,
  },
  bulletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  bulletIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  bulletText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: isWeb ? 18 : 16,
    fontWeight: '500',
  },
  ctaContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
    width: '100%',
  },
  ctaPrimary: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  ctaPrimaryText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaSecondary: {
    backgroundColor: COLORS.glass,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ctaSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustIcon: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  trustText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Problem Section
  problemSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  problemContent: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  problemHeadline: {
    fontSize: isWeb ? 42 : 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: isWeb ? 52 : 36,
  },
  problemHeadlineAccent: {
    color: COLORS.accent,
  },
  questionsContainer: {
    marginBottom: 32,
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.bgCard,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  questionNumberText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  questionText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: isWeb ? 18 : 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  roiCard: {
    backgroundColor: COLORS.bgCard,
    padding: 32,
    borderRadius: 16,
    marginBottom: 48,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    alignItems: 'center',
  },
  roiHeadline: {
    fontSize: isWeb ? 28 : 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: isWeb ? 36 : 30,
  },
  roiPrice: {
    color: COLORS.accent,
  },
  roiSubtext: {
    fontSize: isWeb ? 18 : 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  roiHighlight: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  transitionContainer: {
    alignItems: 'center',
  },
  transitionHeadline: {
    fontSize: isWeb ? 32 : 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  transitionAccent: {
    color: COLORS.accent,
  },
  transitionText: {
    fontSize: isWeb ? 18 : 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 700,
  },
});

