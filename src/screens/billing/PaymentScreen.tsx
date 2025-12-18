/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  PAYMENT SCREEN                                                              ║
 * ║  Plan-Auswahl und Stripe Checkout                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../services/apiConfig';

// API URL
const getApiUrl = () => API_CONFIG.baseUrl.replace('/api/v1', '');

// ═══════════════════════════════════════════════════════════════════════════
// PLANS
// ═══════════════════════════════════════════════════════════════════════════

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Basis-Features',
      '10 Kontakte',
      'E-Mail Support',
    ],
    color: '#3b82f6',
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 59,
    yearlyPrice: 590,
    features: [
      'Alle Starter Features',
      'Unbegrenzte Kontakte',
      'Priority Support',
      'Advanced Analytics',
    ],
    color: '#10b981',
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    monthlyPrice: 119,
    yearlyPrice: 1190,
    features: [
      'Alle Growth Features',
      'Team-Features',
      'API Access',
      'Dedicated Support',
    ],
    color: '#8b5cf6',
  },
  {
    id: 'founding_member',
    name: 'Founding Member',
    oneTimePrice: 499,
    features: [
      'Lifetime Access',
      'Alle Features',
      'Priority Support',
      'Exklusive Updates',
    ],
    color: '#f59e0b',
    special: true,
  },
];

export default function PaymentScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (planId: string) => {
    if (!user) {
      Alert.alert('Fehler', 'Bitte melde dich an');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/payment/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          plan: planId,
          billing: planId === 'founding_member' ? 'one_time' : billingCycle,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Checkout Session');
      }

      const data = await response.json();
      
      // Öffne Stripe Checkout
      if (data.checkout_url) {
        const canOpen = await Linking.canOpenURL(data.checkout_url);
        if (canOpen) {
          await Linking.openURL(data.checkout_url);
        } else {
          Alert.alert('Fehler', 'Kann Checkout-URL nicht öffnen');
        }
      }
    } catch (error) {
      console.error('Checkout Error:', error);
      Alert.alert('Fehler', 'Fehler beim Erstellen der Checkout Session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wähle deinen Plan</Text>
        <Text style={styles.subtitle}>Wähle den Plan, der am besten zu dir passt</Text>
      </View>

      {/* Billing Cycle Toggle (nur für Subscription-Pläne) */}
      <View style={styles.billingToggle}>
        <Pressable
          style={[styles.toggleButton, billingCycle === 'monthly' && styles.toggleButtonActive]}
          onPress={() => setBillingCycle('monthly')}
        >
          <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
            Monatlich
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, billingCycle === 'yearly' && styles.toggleButtonActive]}
          onPress={() => setBillingCycle('yearly')}
        >
          <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>
            Jährlich
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-17%</Text>
          </View>
        </Pressable>
      </View>

      {/* Plans */}
      <View style={styles.plansContainer}>
        {PLANS.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              plan.popular && styles.planCardPopular,
              selectedPlan === plan.id && styles.planCardSelected,
            ]}
          >
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Beliebt</Text>
              </View>
            )}

            <Text style={styles.planName}>{plan.name}</Text>

            <View style={styles.priceContainer}>
              {plan.oneTimePrice ? (
                <>
                  <Text style={styles.price}>€{plan.oneTimePrice}</Text>
                  <Text style={styles.priceUnit}>einmalig</Text>
                </>
              ) : (
                <>
                  <Text style={styles.price}>
                    €{billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </Text>
                  <Text style={styles.priceUnit}>
                    /{billingCycle === 'monthly' ? 'Monat' : 'Jahr'}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.featuresContainer}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.feature}>
                  <Text style={styles.featureIcon}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[
                styles.checkoutButton,
                { backgroundColor: plan.color },
                loading && styles.checkoutButtonDisabled,
              ]}
              onPress={() => handleCheckout(plan.id)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkoutButtonText}>
                  {plan.oneTimePrice ? 'Jetzt kaufen' : 'Jetzt starten'}
                </Text>
              )}
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  billingToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  plansContainer: {
    padding: 20,
    gap: 20,
  },
  planCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardPopular: {
    borderColor: '#10b981',
  },
  planCardSelected: {
    borderColor: '#3b82f6',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 24,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  priceUnit: {
    fontSize: 16,
    color: '#9ca3af',
    marginLeft: 8,
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    color: '#10b981',
    fontSize: 16,
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  checkoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

