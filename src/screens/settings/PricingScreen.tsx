/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - PRICING SCREEN                                                 ║
 * ║  Premium Stripe Checkout Integration                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AURA_COLORS, AURA_SHADOWS } from '../../components/aura';
import { useBilling } from '../../hooks/useBilling';
import {
  BASIC_PLAN,
  AUTOPILOT_ADDON,
  FINANCE_ADDON,
  LEADGEN_ADDON,
  type PricingTier,
} from '../../config/pricing';

// ═══════════════════════════════════════════════════════════════════════════
// PRICING DATA (aus config/pricing.ts)
// ═══════════════════════════════════════════════════════════════════════════

// Alle 9 Preise: Basic + 3 Add-Ons mit jeweils 3 Tiers
const ALL_PRICING_TIERS: (PricingTier & { category: string; icon: string })[] = [
  // Basic Plan
  {
    ...BASIC_PLAN,
    category: 'basic',
    icon: '🚀',
  },
  // Autopilot Tiers (3)
  ...AUTOPILOT_ADDON.tiers.map(tier => ({
    ...tier,
    category: 'autopilot',
    icon: AUTOPILOT_ADDON.icon,
  })),
  // Finance Tiers (3)
  ...FINANCE_ADDON.tiers.map(tier => ({
    ...tier,
    category: 'finance',
    icon: FINANCE_ADDON.icon,
  })),
  // Leadgen Tiers (3)
  ...LEADGEN_ADDON.tiers.map(tier => ({
    ...tier,
    category: 'leadgen',
    icon: LEADGEN_ADDON.icon,
  })),
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const PlanCard = ({
  tier,
  isYearly,
  isCurrentPlan,
  onSelect,
  loading,
}: {
  tier: PricingTier & { category: string; icon: string };
  isYearly: boolean;
  isCurrentPlan: boolean;
  onSelect: () => void;
  loading: boolean;
}) => {
  const price = isYearly ? tier.yearlyPrice / 12 : tier.price;
  const totalPrice = isYearly ? tier.yearlyPrice : tier.price;
  const categoryLabels: Record<string, string> = {
    basic: 'Basis-Plan',
    autopilot: 'Autopilot',
    finance: 'Finanzen',
    leadgen: 'Lead-Generierung',
  };
  
  return (
    <View style={[styles.planCard, tier.popular && styles.planCardRecommended]}>
      {tier.popular && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>⭐ BELIEBT</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={styles.planIcon}>{tier.icon}</Text>
        <Text style={styles.planName}>{tier.name}</Text>
        <Text style={styles.planSubtitle}>{categoryLabels[tier.category] || tier.category}</Text>
      </View>
      
      <View style={styles.priceContainer}>
        <Text style={styles.priceAmount}>€{Math.round(price)}</Text>
        <Text style={styles.pricePeriod}>/Monat</Text>
        {isYearly && (
          <Text style={styles.priceTotal}>€{totalPrice}/Jahr</Text>
        )}
      </View>
      
      {isYearly && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>💡 2 Monate gratis</Text>
        </View>
      )}
      
      <View style={styles.featuresContainer}>
        {tier.features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity
        style={[
          styles.selectButton,
          tier.popular && styles.selectButtonRecommended,
          isCurrentPlan && styles.selectButtonCurrent,
        ]}
        onPress={onSelect}
        disabled={isCurrentPlan || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.selectButtonText}>
            {isCurrentPlan ? 'Aktueller Plan' : 'Auswählen'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const PricingScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const billing = useBilling();
  
  const [isYearly, setIsYearly] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  
  // Gruppiere Preise nach Kategorie
  const groupedTiers = ALL_PRICING_TIERS.reduce((acc, tier) => {
    if (!acc[tier.category]) {
      acc[tier.category] = [];
    }
    acc[tier.category].push(tier);
    return acc;
  }, {} as Record<string, typeof ALL_PRICING_TIERS>);
  
  const categories = Object.keys(groupedTiers);
  const displayedTiers = selectedCategory 
    ? groupedTiers[selectedCategory] 
    : ALL_PRICING_TIERS;
  
  const handleSelectPlan = async (tierId: string) => {
    setLoadingPlan(tierId);
    try {
      // TODO: Implementiere Stripe Checkout mit tierId
      const priceId = `${tierId}_${isYearly ? 'yearly' : 'monthly'}`;
      await billing.upgrade(priceId);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoadingPlan(null);
    }
  };
  
  const currentPlan = billing.subscription?.plan || 'free';
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#0d0d0f', '#1a1a2e', '#0d0d0f']}
        style={styles.header}
      >
        <Text style={styles.headerIcon}>💎</Text>
        <Text style={styles.headerTitle}>Wähle deinen Plan</Text>
        <Text style={styles.headerSubtitle}>
          Starte mit 7 Tagen kostenlos • Jederzeit kündbar
        </Text>
      </LinearGradient>
      
      {/* Billing Toggle */}
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
          <View style={styles.toggleSaveBadge}>
            <Text style={styles.toggleSaveText}>-20%</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Current Plan Info */}
      {!billing.isFree && (
        <View style={styles.currentPlanBanner}>
          <Text style={styles.currentPlanText}>
            📋 Aktueller Plan: <Text style={styles.currentPlanName}>{currentPlan}</Text>
          </Text>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => billing.openPortal()}
          >
            <Text style={styles.manageButtonText}>Verwalten →</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
            Alle (9)
          </Text>
        </TouchableOpacity>
        {categories.map(category => {
          const categoryLabels: Record<string, string> = {
            basic: '🚀 Basis',
            autopilot: '🤖 Autopilot',
            finance: '💰 Finanzen',
            leadgen: '🎯 Lead-Gen',
          };
          return (
            <TouchableOpacity
              key={category}
              style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === category ? null : category)}
            >
              <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
                {categoryLabels[category] || category} ({groupedTiers[category].length})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Plans - Alle 9 Preise */}
      <View style={styles.plansContainer}>
        {displayedTiers.map(tier => (
          <PlanCard
            key={tier.id}
            tier={tier}
            isYearly={isYearly}
            isCurrentPlan={currentPlan === tier.id}
            onSelect={() => handleSelectPlan(tier.id)}
            loading={loadingPlan === tier.id}
          />
        ))}
      </View>
      
      {/* Trust Badges */}
      <View style={styles.trustSection}>
        <View style={styles.trustBadge}>
          <Text style={styles.trustIcon}>🔒</Text>
          <Text style={styles.trustText}>SSL-verschlüsselt</Text>
        </View>
        <View style={styles.trustBadge}>
          <Text style={styles.trustIcon}>💳</Text>
          <Text style={styles.trustText}>Sichere Zahlung via Stripe</Text>
        </View>
        <View style={styles.trustBadge}>
          <Text style={styles.trustIcon}>🇪🇺</Text>
          <Text style={styles.trustText}>DSGVO-konform</Text>
        </View>
      </View>
      
      {/* FAQ Link */}
      <TouchableOpacity style={styles.faqButton}>
        <Text style={styles.faqButtonText}>❓ Häufige Fragen zum Pricing</Text>
      </TouchableOpacity>
      
      {/* Spacer */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const { width } = Dimensions.get('window');
const isSmallScreen = width < 400;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AURA_COLORS.bg.primary,
  },
  
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: AURA_COLORS.text.primary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: -20,
    padding: 4,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
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
  },
  toggleSaveBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  toggleSaveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Current Plan
  currentPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AURA_COLORS.neon.cyan + '15',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.neon.cyan + '30',
  },
  currentPlanText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
  },
  currentPlanName: {
    fontWeight: '700',
    color: AURA_COLORS.neon.cyan,
    textTransform: 'capitalize',
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: AURA_COLORS.glass.border,
    borderRadius: 8,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  
  // Plans
  plansContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 16,
  },
  planCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardRecommended: {
    borderColor: AURA_COLORS.neon.cyan,
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: AURA_COLORS.neon.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    color: AURA_COLORS.text.primary,
  },
  planSubtitle: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  
  // Price
  priceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: AURA_COLORS.neon.cyan,
  },
  pricePeriod: {
    fontSize: 14,
    color: AURA_COLORS.text.muted,
  },
  priceTotal: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 4,
  },
  savingsBadge: {
    backgroundColor: '#22c55e20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  
  // Features
  featuresContainer: {
    marginBottom: 24,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    fontSize: 14,
    color: '#22c55e',
    width: 20,
    textAlign: 'center',
  },
  featureIconDisabled: {
    color: AURA_COLORS.text.muted,
  },
  featureText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
    flex: 1,
  },
  featureTextDisabled: {
    color: AURA_COLORS.text.muted,
    textDecorationLine: 'line-through',
  },
  
  // Select Button
  selectButton: {
    backgroundColor: AURA_COLORS.glass.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonRecommended: {
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  selectButtonCurrent: {
    backgroundColor: '#22c55e30',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Addons
  addonsSection: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  addonsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AURA_COLORS.text.primary,
    marginBottom: 4,
  },
  addonsSubtitle: {
    fontSize: 13,
    color: AURA_COLORS.text.muted,
    marginBottom: 16,
  },
  addonCard: {
    backgroundColor: AURA_COLORS.glass.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addonCardActive: {
    borderColor: AURA_COLORS.neon.cyan,
    backgroundColor: AURA_COLORS.neon.cyan + '10',
  },
  addonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 15,
    fontWeight: '600',
    color: AURA_COLORS.text.primary,
  },
  addonDesc: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
    marginTop: 2,
  },
  addonPrice: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  addonPriceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: AURA_COLORS.neon.cyan,
  },
  addonPricePeriod: {
    fontSize: 10,
    color: AURA_COLORS.text.muted,
  },
  addonToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AURA_COLORS.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonToggleActive: {
    backgroundColor: AURA_COLORS.neon.cyan,
  },
  addonToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Category Filter
  categoriesContainer: {
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: AURA_COLORS.neon.cyan,
    borderColor: AURA_COLORS.neon.cyan,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: AURA_COLORS.text.secondary,
  },
  categoryTextActive: {
    color: '#000',
  },
  
  // Trust
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 40,
    paddingHorizontal: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustIcon: {
    fontSize: 18,
  },
  trustText: {
    fontSize: 12,
    color: AURA_COLORS.text.muted,
  },
  
  // FAQ
  faqButton: {
    alignSelf: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: AURA_COLORS.glass.surface,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  faqButtonText: {
    fontSize: 14,
    color: AURA_COLORS.text.secondary,
  },
});

export default PricingScreen;
