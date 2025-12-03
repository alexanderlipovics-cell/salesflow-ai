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

// ═══════════════════════════════════════════════════════════════════════════
// PRICING DATA
// ═══════════════════════════════════════════════════════════════════════════

const PRICING_PLANS = {
  solo: {
    name: 'Solo',
    subtitle: 'Für Einzelkämpfer',
    icon: '🚀',
    price: { monthly: 149, yearly: 1190 },
    priceId: { monthly: 'basic_monthly', yearly: 'basic_yearly' },
    features: [
      { text: '100 Leads', included: true },
      { text: '50 Chat-Imports/Monat', included: true },
      { text: '100 AI-Analysen/Monat', included: true },
      { text: 'Unbegrenzte Follow-ups', included: true },
      { text: 'CHIEF AI Chat', included: true },
      { text: 'DISG-Profiler', included: true },
      { text: 'Knowledge Base (1 GB)', included: true },
      { text: 'Voice-Steuerung', included: true },
      { text: 'Autopilot', included: false },
      { text: 'Team-Features', included: false },
      { text: 'Enterprise API', included: false },
    ],
    recommended: false,
    savings: null,
  },
  team: {
    name: 'Team',
    subtitle: 'Für High-Performer Teams',
    icon: '⚡',
    price: { monthly: 990, yearly: 7920 },
    priceId: { monthly: 'autopilot_pro_monthly', yearly: 'autopilot_pro_yearly' },
    features: [
      { text: 'Unbegrenzte Leads', included: true },
      { text: 'Unbegrenzte Chat-Imports', included: true },
      { text: 'Unbegrenzte AI-Analysen', included: true },
      { text: 'Unbegrenzte Follow-ups', included: true },
      { text: 'CHIEF AI Chat Pro', included: true },
      { text: 'DISG-Profiler Advanced', included: true },
      { text: 'Knowledge Base (10 GB)', included: true },
      { text: 'Voice + Wake Word', included: true },
      { text: 'Autopilot Basic', included: true },
      { text: 'Bis zu 5 Teammitglieder', included: true },
      { text: 'Team Analytics', included: true },
      { text: 'Priority Support', included: true },
      { text: 'Enterprise API', included: false },
    ],
    recommended: true,
    savings: '2 Monate gratis bei jährlicher Zahlung',
  },
  enterprise: {
    name: 'Enterprise',
    subtitle: 'Für Organisationen',
    icon: '🏢',
    price: { monthly: 2400, yearly: 19200 },
    priceId: { monthly: 'bundle_unlimited_monthly', yearly: 'bundle_unlimited_yearly' },
    features: [
      { text: 'Alles aus Team', included: true },
      { text: 'Unbegrenzte Teammitglieder', included: true },
      { text: 'Knowledge Base (100 GB)', included: true },
      { text: 'Autopilot Full', included: true },
      { text: 'Custom Branding', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'Enterprise API', included: true },
      { text: 'Dedicated Support', included: true },
      { text: 'SLA 99.9%', included: true },
      { text: 'Custom Integrationen', included: true },
      { text: 'Onboarding & Training', included: true },
    ],
    recommended: false,
    savings: '4 Monate gratis bei jährlicher Zahlung',
  },
};

const ADDONS = [
  {
    id: 'autopilot_starter',
    name: 'Autopilot Starter',
    icon: '🤖',
    description: '100 Auto-Aktionen/Monat',
    price: 49,
    priceId: 'autopilot_starter_monthly',
  },
  {
    id: 'finance_module',
    name: 'Finance Tracker',
    icon: '💰',
    description: 'Provisionen & Steuervorbereitung',
    price: 29,
    priceId: 'finance_starter_monthly',
  },
  {
    id: 'leadgen_module',
    name: 'Lead Generator',
    icon: '🎯',
    description: '50 AI Lead-Vorschläge/Monat',
    price: 39,
    priceId: 'leadgen_starter_monthly',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const PlanCard = ({
  plan,
  planKey,
  isYearly,
  isCurrentPlan,
  onSelect,
  loading,
}: {
  plan: typeof PRICING_PLANS.solo;
  planKey: string;
  isYearly: boolean;
  isCurrentPlan: boolean;
  onSelect: () => void;
  loading: boolean;
}) => {
  const price = isYearly ? plan.price.yearly / 12 : plan.price.monthly;
  const totalPrice = isYearly ? plan.price.yearly : plan.price.monthly;
  
  return (
    <View style={[styles.planCard, plan.recommended && styles.planCardRecommended]}>
      {plan.recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>⭐ BELIEBT</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={styles.planIcon}>{plan.icon}</Text>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
      </View>
      
      <View style={styles.priceContainer}>
        <Text style={styles.priceAmount}>€{Math.round(price)}</Text>
        <Text style={styles.pricePeriod}>/Monat</Text>
        {isYearly && (
          <Text style={styles.priceTotal}>€{totalPrice}/Jahr</Text>
        )}
      </View>
      
      {plan.savings && isYearly && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>💡 {plan.savings}</Text>
        </View>
      )}
      
      <View style={styles.featuresContainer}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Text style={[styles.featureIcon, !feature.included && styles.featureIconDisabled]}>
              {feature.included ? '✓' : '✗'}
            </Text>
            <Text style={[styles.featureText, !feature.included && styles.featureTextDisabled]}>
              {feature.text}
            </Text>
          </View>
        ))}
      </View>
      
      <TouchableOpacity
        style={[
          styles.selectButton,
          plan.recommended && styles.selectButtonRecommended,
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

const AddonCard = ({
  addon,
  isActive,
  onToggle,
  loading,
}: {
  addon: typeof ADDONS[0];
  isActive: boolean;
  onToggle: () => void;
  loading: boolean;
}) => (
  <TouchableOpacity
    style={[styles.addonCard, isActive && styles.addonCardActive]}
    onPress={onToggle}
    disabled={loading}
  >
    <View style={styles.addonHeader}>
      <Text style={styles.addonIcon}>{addon.icon}</Text>
      <View style={styles.addonInfo}>
        <Text style={styles.addonName}>{addon.name}</Text>
        <Text style={styles.addonDesc}>{addon.description}</Text>
      </View>
      <View style={styles.addonPrice}>
        <Text style={styles.addonPriceAmount}>+€{addon.price}</Text>
        <Text style={styles.addonPricePeriod}>/Mo</Text>
      </View>
    </View>
    <View style={[styles.addonToggle, isActive && styles.addonToggleActive]}>
      <Text style={styles.addonToggleText}>{isActive ? '✓' : '+'}</Text>
    </View>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const PricingScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const billing = useBilling();
  
  const [isYearly, setIsYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  
  const handleSelectPlan = async (planKey: string) => {
    const plan = PRICING_PLANS[planKey as keyof typeof PRICING_PLANS];
    if (!plan) return;
    
    setLoadingPlan(planKey);
    try {
      const priceId = isYearly ? plan.priceId.yearly : plan.priceId.monthly;
      await billing.upgrade(priceId);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoadingPlan(null);
    }
  };
  
  const handleAddAddon = async (addonId: string) => {
    const addon = ADDONS.find(a => a.id === addonId);
    if (!addon) return;
    
    setLoadingPlan(addonId);
    try {
      await billing.addAddon(addon.priceId);
    } catch (error) {
      console.error('Addon error:', error);
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
      
      {/* Plans */}
      <View style={styles.plansContainer}>
        {Object.entries(PRICING_PLANS).map(([key, plan]) => (
          <PlanCard
            key={key}
            planKey={key}
            plan={plan}
            isYearly={isYearly}
            isCurrentPlan={currentPlan === key}
            onSelect={() => handleSelectPlan(key)}
            loading={loadingPlan === key}
          />
        ))}
      </View>
      
      {/* Addons */}
      <View style={styles.addonsSection}>
        <Text style={styles.addonsTitle}>🔌 Add-Ons</Text>
        <Text style={styles.addonsSubtitle}>Erweitere deinen Plan mit zusätzlichen Features</Text>
        
        {ADDONS.map(addon => (
          <AddonCard
            key={addon.id}
            addon={addon}
            isActive={billing.hasAddon(addon.id)}
            onToggle={() => handleAddAddon(addon.id)}
            loading={loadingPlan === addon.id}
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
