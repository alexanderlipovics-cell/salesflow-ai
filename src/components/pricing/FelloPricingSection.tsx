/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  FELLO - PRICING SECTION                                                   ║
 * ║  Pricing-Komponente mit 4 Tiers und Founding Member Option                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AURA_COLORS, AURA_SHADOWS, AURA_SPACING, AURA_RADIUS } from '../aura';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isSmallScreen = SCREEN_WIDTH < 768;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  priceYearly: number;
  badge?: string;
  claim: string;
  features: string[];
  cta: string;
  isPopular?: boolean;
}

interface FoundingMember {
  price: number;
  description: string;
  spotsRemaining: number;
  totalSpots: number;
  features: string[];
  cta: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    priceYearly: 0,
    claim: 'Reinschnuppern',
    features: [
      '20 Kontakte',
      '5 MENTOR Calls',
      '5 Compliance Checks',
      '1x CSV Import',
      'Basic Alerts',
    ],
    cta: 'Kostenlos starten',
  },
  {
    id: 'starter',
    name: 'STARTER',
    price: 29,
    priceYearly: 290, // 10 Monate = 2 Monate gratis
    claim: 'Bring Ordnung ins Chaos',
    features: [
      '500 Kontakte',
      '50 MENTOR Calls',
      '50 Compliance Checks',
      'Unlimited CSV Import',
      'Alle Alerts',
      'Basic Templates',
    ],
    cta: 'Starter wählen',
  },
  {
    id: 'growth',
    name: 'GROWTH',
    price: 59,
    priceYearly: 590, // 10 Monate = 2 Monate gratis
    badge: '⭐ POPULAR',
    claim: 'Automatisiere & hole Geld',
    features: [
      '3.000 Kontakte',
      '200 MENTOR Calls',
      'Unlimited Compliance',
      '100 Ghostbuster/mo',
      '500 Auto-Messages/mo',
      'Neuro-Profiler',
    ],
    cta: 'Growth wählen',
    isPopular: true,
  },
  {
    id: 'scale',
    name: 'SCALE',
    price: 119,
    priceYearly: 1190, // 10 Monate = 2 Monate gratis
    claim: 'Team im Griff + Finance',
    features: [
      '10.000 Kontakte',
      '500 MENTOR Calls',
      '300 Ghostbuster/mo',
      '2.000 Auto-Messages/mo',
      'CFO Dashboard',
      '3 Team Members',
      'Priority Support',
    ],
    cta: 'Scale wählen',
  },
];

const FOUNDING_MEMBER: FoundingMember = {
  price: 499,
  description: 'Growth-Plan für immer',
  spotsRemaining: 73, // Beispiel: 73 von 100
  totalSpots: 100,
  features: [
    'Alles aus Growth',
    'Lebenslanger Zugang',
    'Alle zukünftigen Features',
    'Exklusive Updates',
    'Priority Support',
  ],
  cta: 'Founding Member werden',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface PricingCardProps {
  plan: PricingPlan;
  isYearly: boolean;
  onSelect: () => void;
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, isYearly, onSelect }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const price = isYearly ? Math.round(plan.priceYearly / 12) : plan.price;
  const monthlyPrice = isYearly ? plan.priceYearly / 12 : plan.price;
  const displayPrice = isYearly ? Math.round(monthlyPrice) : plan.price;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.pricingCard,
          plan.isPopular && styles.pricingCardPopular,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Glow Effect */}
        {plan.isPopular && (
          <Animated.View
            style={[
              styles.cardGlow,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.6],
                }),
              },
            ]}
          />
        )}

        {/* Badge */}
        {plan.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </View>
        )}

        {/* Plan Name */}
        <Text style={styles.planName}>{plan.name}</Text>

        {/* Claim */}
        <Text style={styles.planClaim}>{plan.claim}</Text>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceCurrency}>€</Text>
          <Text style={styles.priceAmount}>{displayPrice}</Text>
          <Text style={styles.pricePeriod}>/mo</Text>
        </View>

        {isYearly && plan.price > 0 && (
          <Text style={styles.priceYearlyNote}>
            €{plan.priceYearly}/Jahr • 2 Monate gratis
          </Text>
        )}

        {/* Features */}
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureCheckmark}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[
            styles.ctaButton,
            plan.isPopular && styles.ctaButtonPopular,
            plan.price === 0 && styles.ctaButtonFree,
          ]}
          onPress={onSelect}
        >
          <Text
            style={[
              styles.ctaButtonText,
              plan.isPopular && styles.ctaButtonTextPopular,
              plan.price === 0 && styles.ctaButtonTextFree,
            ]}
          >
            {plan.cta}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
};

interface FoundingMemberBoxProps {
  data: FoundingMember;
  onSelect: () => void;
}

const FoundingMemberBox: React.FC<FoundingMemberBoxProps> = ({ data, onSelect }) => {
  const progress = ((data.totalSpots - data.spotsRemaining) / data.totalSpots) * 100;

  return (
    <View style={styles.foundingMemberContainer}>
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.foundingMemberBox}
      >
        <View style={styles.foundingMemberHeader}>
          <Text style={styles.foundingMemberIcon}>💎</Text>
          <View style={styles.foundingMemberTitleContainer}>
            <Text style={styles.foundingMemberTitle}>
              FOUNDING MEMBER - €{data.price} einmalig
            </Text>
            <Text style={styles.foundingMemberSubtitle}>{data.description}</Text>
          </View>
        </View>

        {/* Counter */}
        <View style={styles.foundingMemberCounter}>
          <Text style={styles.foundingMemberCounterText}>
            Nur {data.spotsRemaining} von {data.totalSpots} Plätzen verfügbar
          </Text>
          <View style={styles.foundingMemberProgressBar}>
            <View
              style={[
                styles.foundingMemberProgressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Features */}
        <View style={styles.foundingMemberFeatures}>
          {data.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureCheckmark}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.foundingMemberCTA} onPress={onSelect}>
          <Text style={styles.foundingMemberCTAText}>{data.cta}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface FelloPricingSectionProps {
  onPlanSelect?: (planId: string, isYearly: boolean) => void;
  onFoundingMemberSelect?: () => void;
}

export const FelloPricingSection: React.FC<FelloPricingSectionProps> = ({
  onPlanSelect,
  onFoundingMemberSelect,
}) => {
  const [isYearly, setIsYearly] = useState(false);

  const handlePlanSelect = (planId: string) => {
    if (onPlanSelect) {
      onPlanSelect(planId, isYearly);
    }
  };

  const handleFoundingMemberSelect = () => {
    if (onFoundingMemberSelect) {
      onFoundingMemberSelect();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headline}>Wähle den Hebel, der zu deinem Business passt</Text>
        <Text style={styles.subline}>Alle Pakete starten mit FREE. Upgrade jederzeit.</Text>
      </View>

      {/* Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, !isYearly && styles.toggleButtonActive]}
          onPress={() => setIsYearly(false)}
        >
          <Text style={[styles.toggleText, !isYearly && styles.toggleTextActive]}>
            Monatlich
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, isYearly && styles.toggleButtonActive]}
          onPress={() => setIsYearly(true)}
        >
          <Text style={[styles.toggleText, isYearly && styles.toggleTextActive]}>
            Jährlich
          </Text>
          <View style={styles.toggleBadge}>
            <Text style={styles.toggleBadgeText}>2 Monate gratis</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Pricing Cards */}
      {isSmallScreen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pricingCardsContainer}
          style={styles.pricingCardsScroll}
        >
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              onSelect={() => handlePlanSelect(plan.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.pricingCardsGrid}>
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              onSelect={() => handlePlanSelect(plan.id)}
            />
          ))}
        </View>
      )}

      {/* Founding Member Box */}
      <View style={styles.foundingMemberSection}>
        <FoundingMemberBox data={FOUNDING_MEMBER} onSelect={handleFoundingMemberSelect} />
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: AURA_SPACING.xxl,
    paddingHorizontal: isSmallScreen ? AURA_SPACING.md : AURA_SPACING.xxl,
    backgroundColor: AURA_COLORS.bg.primary,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: AURA_SPACING.xl,
  },
  headline: {
    fontSize: isSmallScreen ? 28 : 36,
    fontWeight: '800',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: AURA_SPACING.md,
    lineHeight: isSmallScreen ? 36 : 44,
  },
  subline: {
    fontSize: 16,
    color: AURA_COLORS.text.secondary,
    textAlign: 'center',
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.lg,
    padding: 4,
    marginBottom: AURA_SPACING.xl,
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: AURA_SPACING.md,
    paddingHorizontal: AURA_SPACING.lg,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: AURA_COLORS.text.muted,
  },
  toggleTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  toggleBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toggleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Pricing Cards
  pricingCardsScroll: {
    marginBottom: AURA_SPACING.xl,
  },
  pricingCardsContainer: {
    gap: AURA_SPACING.lg,
    paddingHorizontal: isSmallScreen ? AURA_SPACING.md : 0,
  },
  pricingCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AURA_SPACING.lg,
    marginBottom: AURA_SPACING.xl,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  pricingCard: {
    width: isSmallScreen ? SCREEN_WIDTH - 48 : 280,
    minWidth: 260,
    flex: isSmallScreen ? 0 : 1,
    maxWidth: 300,
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.xl,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    position: 'relative',
    overflow: 'hidden',
  },
  pricingCardPopular: {
    borderColor: AURA_COLORS.neon.cyan,
    borderWidth: 2,
    ...AURA_SHADOWS.neonCyan,
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  badge: {
    position: 'absolute',
    top: AURA_SPACING.lg,
    right: AURA_SPACING.lg,
    backgroundColor: AURA_COLORS.neon.cyan,
    paddingHorizontal: AURA_SPACING.md,
    paddingVertical: 4,
    borderRadius: AURA_RADIUS.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  planClaim: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginBottom: AURA_SPACING.lg,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: AURA_SPACING.sm,
  },
  priceCurrency: {
    fontSize: 20,
    color: AURA_COLORS.text.secondary,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: AURA_COLORS.neon.cyan,
    lineHeight: 56,
  },
  pricePeriod: {
    fontSize: 16,
    color: AURA_COLORS.text.muted,
    marginBottom: 8,
    marginLeft: 4,
  },
  priceYearlyNote: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginBottom: AURA_SPACING.lg,
  },
  featuresContainer: {
    marginBottom: AURA_SPACING.xl,
    gap: AURA_SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AURA_SPACING.sm,
  },
  featureCheckmark: {
    fontSize: 16,
    color: AURA_COLORS.neon.green,
    marginTop: 2,
  },
  featureText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: AURA_COLORS.glass.border,
    paddingVertical: AURA_SPACING.md,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  ctaButtonPopular: {
    backgroundColor: AURA_COLORS.neon.cyan,
    borderColor: AURA_COLORS.neon.cyan,
  },
  ctaButtonFree: {
    backgroundColor: AURA_COLORS.neon.green + '20',
    borderColor: AURA_COLORS.neon.green,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
  },
  ctaButtonTextPopular: {
    color: '#000',
  },
  ctaButtonTextFree: {
    color: AURA_COLORS.neon.green,
  },

  // Founding Member
  foundingMemberSection: {
    marginTop: AURA_SPACING.xl,
    paddingHorizontal: isSmallScreen ? AURA_SPACING.md : 0,
  },
  foundingMemberContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  foundingMemberBox: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: AURA_RADIUS.xl,
    padding: AURA_SPACING.xl,
    borderWidth: 2,
    borderColor: AURA_COLORS.neon.amber,
    ...AURA_SHADOWS.neonAmber,
  },
  foundingMemberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AURA_SPACING.lg,
    gap: AURA_SPACING.md,
  },
  foundingMemberIcon: {
    fontSize: 32,
  },
  foundingMemberTitleContainer: {
    flex: 1,
  },
  foundingMemberTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  foundingMemberSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
  },
  foundingMemberCounter: {
    marginBottom: AURA_SPACING.lg,
  },
  foundingMemberCounterText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    marginBottom: AURA_SPACING.sm,
  },
  foundingMemberProgressBar: {
    height: 8,
    backgroundColor: AURA_COLORS.glass.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  foundingMemberProgressFill: {
    height: '100%',
    backgroundColor: AURA_COLORS.neon.amber,
    borderRadius: 4,
  },
  foundingMemberFeatures: {
    marginBottom: AURA_SPACING.lg,
    gap: AURA_SPACING.md,
  },
  foundingMemberCTA: {
    backgroundColor: AURA_COLORS.neon.amber,
    paddingVertical: AURA_SPACING.md,
    borderRadius: AURA_RADIUS.md,
    alignItems: 'center',
  },
  foundingMemberCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});

export default FelloPricingSection;

