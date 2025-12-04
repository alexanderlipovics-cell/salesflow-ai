/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  FELLO - Landing Page (Web Version)                                      ║
 * ║  Hero & Problem Section - React Native Web Compatible                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
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

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleAppStart = () => {
    // Navigiere zur Chat-App
    navigation.navigate('Login');
  };

  const handleSelectPlan = (planName: string) => {
    // Navigiere zu Register mit Plan-Parameter
    navigation.navigate('Register', { plan: planName });
  };

  const handleBookConsultation = async () => {
    // Öffne Calendly oder ähnliches
    const url = 'https://calendly.com/fello-consultation';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.log('Error opening URL:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>FELLO</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Login Link */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.7}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>Login</Text>
            </TouchableOpacity>

            {/* App starten Button */}
            <TouchableOpacity
              onPress={handleAppStart}
              activeOpacity={0.8}
              style={styles.appStartButton}
            >
              <Text style={styles.appStartButtonText}>App starten</Text>
            </TouchableOpacity>

            {/* Erstgespräch buchen Button */}
            <TouchableOpacity
              onPress={handleBookConsultation}
              activeOpacity={0.8}
              style={styles.consultationButton}
            >
              <Text style={styles.consultationButtonText}>Erstgespräch buchen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRICING SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#312e81']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pricingSection}
      >
        <View style={styles.pricingContent}>
          {/* Headline */}
          <Text style={styles.pricingHeadline}>
            Wähle deinen{' '}
            <Text style={styles.pricingHeadlineAccent}>FELLO Plan</Text>
          </Text>
          <Text style={styles.pricingSubheadline}>
            Starte mit 14 Tagen kostenlos. Keine Kreditkarte nötig.
          </Text>

          {/* Pricing Cards */}
          <View style={styles.pricingGrid}>
            {/* STARTER PLAN */}
            <View style={styles.pricingCard}>
              <Text style={styles.pricingCardName}>Starter</Text>
              <View style={styles.pricingCardPriceRow}>
                <Text style={styles.pricingCardPrice}>€29</Text>
                <Text style={styles.pricingCardPeriod}>/Monat</Text>
              </View>
              <Text style={styles.pricingCardYearly}>
                oder €290/Jahr (2 Monate gratis)
              </Text>
              <View style={styles.pricingCardFeatures}>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>100 Leads</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>KI-Copilot</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Follow-up Generator</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Basic Support</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.pricingCardButton}
                onPress={() => handleSelectPlan('starter')}
                activeOpacity={0.8}
              >
                <Text style={styles.pricingCardButtonText}>Jetzt starten</Text>
              </TouchableOpacity>
            </View>

            {/* GROWTH PLAN (BELIEBT) */}
            <View style={[styles.pricingCard, styles.pricingCardPopular]}>
              <View style={styles.pricingCardBadge}>
                <Text style={styles.pricingCardBadgeText}>BELIEBT</Text>
              </View>
              <Text style={styles.pricingCardName}>Growth</Text>
              <View style={styles.pricingCardPriceRow}>
                <Text style={styles.pricingCardPrice}>€59</Text>
                <Text style={styles.pricingCardPeriod}>/Monat</Text>
              </View>
              <Text style={styles.pricingCardYearly}>
                oder €590/Jahr
              </Text>
              <View style={styles.pricingCardFeatures}>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>500 Leads</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Alle Starter Features</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Team Features</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Priority Support</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.pricingCardButton, styles.pricingCardButtonPopular]}
                onPress={() => handleSelectPlan('growth')}
                activeOpacity={0.8}
              >
                <Text style={styles.pricingCardButtonText}>Jetzt starten</Text>
              </TouchableOpacity>
            </View>

            {/* SCALE PLAN */}
            <View style={styles.pricingCard}>
              <Text style={styles.pricingCardName}>Scale</Text>
              <View style={styles.pricingCardPriceRow}>
                <Text style={styles.pricingCardPrice}>€119</Text>
                <Text style={styles.pricingCardPeriod}>/Monat</Text>
              </View>
              <Text style={styles.pricingCardYearly}>
                oder €1.190/Jahr
              </Text>
              <View style={styles.pricingCardFeatures}>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Unlimited Leads</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>White-Label</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>API Access</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Dedicated Support</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.pricingCardButton}
                onPress={() => handleSelectPlan('scale')}
                activeOpacity={0.8}
              >
                <Text style={styles.pricingCardButtonText}>Jetzt starten</Text>
              </TouchableOpacity>
            </View>

            {/* FOUNDING MEMBER (Special) */}
            <View style={[styles.pricingCard, styles.pricingCardSpecial]}>
              <View style={styles.pricingCardBadge}>
                <Text style={styles.pricingCardBadgeText}>SPECIAL</Text>
              </View>
              <Text style={styles.pricingCardName}>Founding Member</Text>
              <View style={styles.pricingCardPriceRow}>
                <Text style={styles.pricingCardPrice}>€499</Text>
                <Text style={styles.pricingCardPeriod}>einmalig</Text>
              </View>
              <Text style={styles.pricingCardYearly}>
                Lifetime Access
              </Text>
              <View style={styles.pricingCardFeatures}>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Lifetime Zugang</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Alle Features</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Founder Badge</Text>
                </View>
                <View style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureCheck}>✓</Text>
                  <Text style={styles.pricingFeatureText}>Früher Zugang zu neuen Features</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.pricingCardButton, styles.pricingCardButtonSpecial]}
                onPress={() => handleSelectPlan('founding')}
                activeOpacity={0.8}
              >
                <Text style={styles.pricingCardButtonText}>Jetzt starten</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: isWeb ? 20 : 40,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  loginLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loginLinkText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  appStartButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  appStartButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  consultationButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  consultationButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Hero Section
  heroSection: {
    minHeight: isWeb ? 800 : 700,
    paddingTop: isWeb ? 180 : 140,
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

  // Pricing Section
  pricingSection: {
    paddingVertical: 100,
    paddingHorizontal: 24,
  },
  pricingContent: {
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  pricingHeadline: {
    fontSize: isWeb ? 48 : 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: isWeb ? 56 : 40,
  },
  pricingHeadlineAccent: {
    color: COLORS.accent,
  },
  pricingSubheadline: {
    fontSize: isWeb ? 20 : 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 64,
  },
  pricingGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
  },
  pricingCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 32,
    width: isWeb ? 280 : '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  pricingCardPopular: {
    borderColor: '#10b981',
    borderWidth: 2,
    transform: isWeb ? [{ scale: 1.05 }] : [],
  },
  pricingCardSpecial: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  pricingCardBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pricingCardBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pricingCardName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pricingCardPrice: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pricingCardPeriod: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  pricingCardYearly: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  pricingCardFeatures: {
    marginBottom: 32,
    minHeight: 200,
  },
  pricingFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pricingFeatureCheck: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
    width: 20,
  },
  pricingFeatureText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  pricingCardButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  pricingCardButtonPopular: {
    backgroundColor: '#10b981',
  },
  pricingCardButtonSpecial: {
    backgroundColor: '#f59e0b',
  },
  pricingCardButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});

