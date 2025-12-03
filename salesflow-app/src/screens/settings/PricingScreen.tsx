/**
 * PricingScreen - Zeigt alle Pakete und Add-Ons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BASIC_PLAN,
  ALL_ADDONS,
  BUNDLES,
  formatPrice,
  isUnlimited,
  type PricingTier,
  type AddOn,
  type Bundle,
} from '../../config/pricing';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function PricingScreen() {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  
  const toggleAddon = (tierId: string) => {
    setSelectedAddons(prev => 
      prev.includes(tierId)
        ? prev.filter(id => id !== tierId)
        : [...prev, tierId]
    );
  };
  
  const calculateTotal = () => {
    let total = isYearly ? BASIC_PLAN.yearlyPrice / 12 : BASIC_PLAN.price;
    
    ALL_ADDONS.forEach(addon => {
      addon.tiers.forEach(tier => {
        if (selectedAddons.includes(tier.id)) {
          total += isYearly ? tier.yearlyPrice / 12 : tier.price;
        }
      });
    });
    
    return total;
  };
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Wähle deinen Plan</Text>
        <Text style={styles.headerSubtitle}>
          Starte mit Basic und füge Add-Ons nach Bedarf hinzu
        </Text>
        
        {/* Yearly Toggle */}
        <View style={styles.yearlyToggle}>
          <Text style={[styles.toggleText, !isYearly && styles.toggleTextActive]}>
            Monatlich
          </Text>
          <Switch
            value={isYearly}
            onValueChange={setIsYearly}
            trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#10B981' }}
            thumbColor="white"
          />
          <Text style={[styles.toggleText, isYearly && styles.toggleTextActive]}>
            Jährlich
          </Text>
          {isYearly && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>2 Monate gratis!</Text>
            </View>
          )}
        </View>
      </LinearGradient>
      
      {/* Basic Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Basis-Paket</Text>
        <PlanCard
          tier={BASIC_PLAN}
          isYearly={isYearly}
          isSelected={true}
          onSelect={() => {}}
          isBasic
        />
      </View>
      
      {/* Add-Ons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Add-Ons</Text>
        <Text style={styles.sectionSubtitle}>
          Erweitere dein Basic-Paket nach Bedarf
        </Text>
        
        {ALL_ADDONS.map((addon) => (
          <AddonSection
            key={addon.id}
            addon={addon}
            isYearly={isYearly}
            selectedTier={selectedAddons.find(id => 
              addon.tiers.some(t => t.id === id)
            )}
            onSelectTier={toggleAddon}
          />
        ))}
      </View>
      
      {/* Bundles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎁 Bundles (Spare bis zu 26%)</Text>
        
        {BUNDLES.map((bundle) => (
          <BundleCard
            key={bundle.id}
            bundle={bundle}
            isYearly={isYearly}
          />
        ))}
      </View>
      
      {/* Total */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Dein Plan:</Text>
          <Text style={styles.totalPrice}>
            {formatPrice(calculateTotal())}/Monat
          </Text>
        </View>
        {isYearly && (
          <Text style={styles.totalYearly}>
            = {formatPrice(calculateTotal() * 10)}/Jahr (2 Monate gratis)
          </Text>
        )}
        
        <Pressable style={styles.ctaButton}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Jetzt starten 🚀</Text>
          </LinearGradient>
        </Pressable>
      </View>
      
      {/* Spacer */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface PlanCardProps {
  tier: PricingTier;
  isYearly: boolean;
  isSelected: boolean;
  onSelect: () => void;
  isBasic?: boolean;
}

function PlanCard({ tier, isYearly, isSelected, onSelect, isBasic }: PlanCardProps) {
  const price = isYearly ? tier.yearlyPrice / 12 : tier.price;
  
  return (
    <Pressable
      style={[
        styles.planCard,
        isSelected && styles.planCardSelected,
        tier.popular && styles.planCardPopular,
      ]}
      onPress={onSelect}
    >
      {tier.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>⭐ Beliebt</Text>
        </View>
      )}
      
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{tier.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(price)}</Text>
          <Text style={styles.priceUnit}>/Monat</Text>
        </View>
      </View>
      
      {/* Limits */}
      {!isBasic && (
        <View style={styles.limitsContainer}>
          {Object.entries(tier.limits).map(([key, value]) => (
            <View key={key} style={styles.limitItem}>
              <Text style={styles.limitValue}>
                {isUnlimited(value) ? '∞' : value}
              </Text>
              <Text style={styles.limitLabel}>
                {key.replace(/_/g, ' ')}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Features */}
      <View style={styles.featuresContainer}>
        {tier.features.map((feature, idx) => (
          <Text key={idx} style={styles.featureItem}>
            {feature}
          </Text>
        ))}
      </View>
      
      {isBasic && (
        <View style={styles.includedBadge}>
          <Text style={styles.includedBadgeText}>✓ Immer enthalten</Text>
        </View>
      )}
    </Pressable>
  );
}

interface AddonSectionProps {
  addon: AddOn;
  isYearly: boolean;
  selectedTier?: string;
  onSelectTier: (tierId: string) => void;
}

function AddonSection({ addon, isYearly, selectedTier, onSelectTier }: AddonSectionProps) {
  return (
    <View style={styles.addonSection}>
      <View style={styles.addonHeader}>
        <Text style={styles.addonIcon}>{addon.icon}</Text>
        <View>
          <Text style={styles.addonName}>{addon.name}</Text>
          <Text style={styles.addonDescription}>{addon.description}</Text>
        </View>
      </View>
      
      <View style={styles.tiersContainer}>
        {addon.tiers.map((tier) => (
          <Pressable
            key={tier.id}
            style={[
              styles.tierCard,
              selectedTier === tier.id && styles.tierCardSelected,
              tier.popular && styles.tierCardPopular,
            ]}
            onPress={() => onSelectTier(tier.id)}
          >
            {tier.popular && (
              <View style={styles.tierPopularBadge}>
                <Text style={styles.tierPopularText}>⭐</Text>
              </View>
            )}
            
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierPrice}>
              {formatPrice(isYearly ? tier.yearlyPrice / 12 : tier.price)}
            </Text>
            <Text style={styles.tierPriceUnit}>/Monat</Text>
            
            {/* Quick Features */}
            <View style={styles.tierFeatures}>
              {tier.features.slice(0, 2).map((f, i) => (
                <Text key={i} style={styles.tierFeature} numberOfLines={1}>
                  {f}
                </Text>
              ))}
            </View>
            
            {selectedTier === tier.id && (
              <View style={styles.tierCheck}>
                <Text style={styles.tierCheckText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

interface BundleCardProps {
  bundle: Bundle;
  isYearly: boolean;
}

function BundleCard({ bundle, isYearly }: BundleCardProps) {
  const price = isYearly ? bundle.bundlePrice * 10 / 12 : bundle.bundlePrice;
  const originalPrice = isYearly ? bundle.originalPrice * 10 / 12 : bundle.originalPrice;
  
  return (
    <LinearGradient
      colors={['#1E293B', '#334155']}
      style={styles.bundleCard}
    >
      <View style={styles.bundleHeader}>
        <Text style={styles.bundleName}>{bundle.name}</Text>
        <View style={styles.bundleSavings}>
          <Text style={styles.bundleSavingsText}>
            Spare {bundle.savingsPercent}%
          </Text>
        </View>
      </View>
      
      <Text style={styles.bundleDescription}>{bundle.description}</Text>
      
      <View style={styles.bundlePricing}>
        <Text style={styles.bundleOriginalPrice}>
          {formatPrice(originalPrice)}
        </Text>
        <Text style={styles.bundlePrice}>
          {formatPrice(price)}/Monat
        </Text>
      </View>
      
      <Pressable style={styles.bundleButton}>
        <Text style={styles.bundleButtonText}>Bundle wählen</Text>
      </Pressable>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  
  // Header
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  yearlyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  toggleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  toggleTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Sections
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  
  // Plan Card
  planCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#3B82F6',
  },
  planCardPopular: {
    borderColor: '#F59E0B',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
  },
  priceUnit: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 4,
  },
  limitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  limitItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  limitLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  featuresContainer: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  includedBadge: {
    backgroundColor: '#10B981',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
  },
  includedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Addon Section
  addonSection: {
    marginBottom: 24,
  },
  addonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  addonIcon: {
    fontSize: 32,
  },
  addonName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  addonDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  tiersContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  tierCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B98115',
  },
  tierCardPopular: {
    borderColor: '#F59E0B',
  },
  tierPopularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F59E0B',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPopularText: {
    fontSize: 12,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  tierPriceUnit: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
  },
  tierFeatures: {
    width: '100%',
  },
  tierFeature: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  tierCheck: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCheckText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Bundle Card
  bundleCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bundleName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  bundleSavings: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bundleSavingsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bundleDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  bundlePricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bundleOriginalPrice: {
    fontSize: 16,
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  bundlePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  bundleButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bundleButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Total Section
  totalSection: {
    backgroundColor: '#1E293B',
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#94A3B8',
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
  },
  totalYearly: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
    marginBottom: 16,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});

