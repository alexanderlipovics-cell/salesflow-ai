import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

const PLANS = [
  {
    id: 'monthly',
    name: 'Monatlich',
    price: '29,99€',
    period: '/Monat',
    popular: false,
  },
  {
    id: 'yearly',
    name: 'Jährlich',
    price: '19,99€',
    period: '/Monat',
    savings: 'Spare 33%',
    popular: true,
  },
];

const FEATURES = [
  { icon: 'sparkles', text: 'Unbegrenzte AI Scripts', included: true },
  { icon: 'people', text: 'Unbegrenzte Leads', included: true },
  { icon: 'analytics', text: 'Erweiterte Analytics', included: true },
  { icon: 'notifications', text: 'Smart Follow-up Reminders', included: true },
  { icon: 'sync', text: 'Multi-Plattform Sync', included: true },
  { icon: 'shield-checkmark', text: 'Priority Support', included: true },
];

export default function PaywallScreen({ navigation }: any) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const handleSubscribe = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Implement subscription logic
    navigation.goBack();
  };

  const handleRestore = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement restore purchases
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restoreText}>Wiederherstellen</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>SalesFlow Pro</Text>
          <Text style={styles.subtitle}>Entfessle dein volles Potenzial</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.selectedPlanCard,
                plan.popular && styles.popularPlanCard,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedPlan(plan.id);
              }}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>BELIEBT</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.radioOuter, selectedPlan === plan.id && styles.radioOuterSelected]}>
                  {selectedPlan === plan.id && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.planName}>{plan.name}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>{plan.price}</Text>
                <Text style={styles.period}>{plan.period}</Text>
              </View>
              {plan.savings && <Text style={styles.savings}>{plan.savings}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaBtn} onPress={handleSubscribe}>
          <Text style={styles.ctaText}>Jetzt starten</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          Nach der kostenlosen Testphase wird das Abo automatisch verlängert.{'\n'}
          Du kannst jederzeit kündigen.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  closeBtn: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 20 },
  restoreText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: COLORS.primary },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary },
  featuresContainer: { marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  featureText: { flex: 1, color: COLORS.text, fontSize: 15 },
  plansContainer: { gap: 12, marginBottom: 24 },
  planCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: COLORS.border },
  selectedPlanCard: { borderColor: COLORS.primary },
  popularPlanCard: { position: 'relative' },
  popularBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularText: { color: COLORS.background, fontSize: 10, fontWeight: '800' },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.textMuted, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  planName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 32, fontWeight: '800', color: COLORS.text },
  period: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 4 },
  savings: { marginTop: 8, color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  ctaBtn: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  ctaText: { color: COLORS.background, fontSize: 18, fontWeight: '800' },
  terms: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
