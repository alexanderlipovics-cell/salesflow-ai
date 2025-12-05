/**
 * TestCheckoutScreen - Simuliert Stripe Checkout für Tests
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

const PLANS = {
  basic_monthly: { name: 'Basic', price: 30, period: 'Monat' },
  basic_yearly: { name: 'Basic Jahres', price: 300, period: 'Jahr' },
  autopilot_starter_monthly: { name: 'Autopilot Starter', price: 10, period: 'Monat' },
  autopilot_pro_monthly: { name: 'Autopilot Pro', price: 20, period: 'Monat' },
  bundle_pro_monthly: { name: 'Pro Bundle', price: 69, period: 'Monat' },
};

export default function TestCheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { plan = 'basic_monthly', session_id } = route.params || {};
  
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/25');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('Test User');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const planInfo = PLANS[plan] || PLANS.basic_monthly;
  
  const handlePayment = async () => {
    setProcessing(true);
    
    // Simuliere Zahlungsverarbeitung
    await new Promise(r => setTimeout(r, 2000));
    
    setProcessing(false);
    setSuccess(true);
    
    // Nach 2 Sekunden zur App zurück
    setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }, 2000);
  };
  
  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Zahlung erfolgreich!</Text>
        <Text style={styles.successText}>
          Dein {planInfo.name} Plan ist jetzt aktiv.
        </Text>
        <Text style={styles.successNote}>
          (Dies ist eine Test-Zahlung)
        </Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#635BFF', '#8B5CF6']}
        style={styles.header}
      >
        <Text style={styles.stripeText}>⚡ Stripe Test-Checkout</Text>
        <Text style={styles.testBadge}>🧪 TEST MODUS</Text>
      </LinearGradient>
      
      {/* Order Summary */}
      <View style={styles.orderSummary}>
        <Text style={styles.summaryTitle}>Bestellung</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{planInfo.name}</Text>
          <Text style={styles.summaryValue}>€{planInfo.price}/{planInfo.period}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotal}>Gesamt</Text>
          <Text style={styles.summaryTotalValue}>€{planInfo.price}</Text>
        </View>
      </View>
      
      {/* Payment Form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>💳 Zahlungsdaten</Text>
        
        <Text style={styles.label}>Kartennummer</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={setCardNumber}
          placeholder="4242 4242 4242 4242"
          placeholderTextColor="#64748B"
        />
        
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Gültig bis</Text>
            <TextInput
              style={styles.input}
              value={expiry}
              onChangeText={setExpiry}
              placeholder="MM/YY"
              placeholderTextColor="#64748B"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>CVC</Text>
            <TextInput
              style={styles.input}
              value={cvc}
              onChangeText={setCvc}
              placeholder="123"
              placeholderTextColor="#64748B"
              secureTextEntry
            />
          </View>
        </View>
        
        <Text style={styles.label}>Name auf der Karte</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Max Mustermann"
          placeholderTextColor="#64748B"
        />
        
        {/* Test Cards Info */}
        <View style={styles.testInfo}>
          <Text style={styles.testInfoTitle}>🧪 Test-Kartennummern:</Text>
          <Text style={styles.testInfoText}>✅ 4242 4242 4242 4242 - Erfolg</Text>
          <Text style={styles.testInfoText}>❌ 4000 0000 0000 0002 - Abgelehnt</Text>
          <Text style={styles.testInfoText}>🔐 4000 0025 0000 3155 - 3D Secure</Text>
        </View>
        
        {/* Pay Button */}
        <Pressable 
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={processing}
        >
          <LinearGradient
            colors={processing ? ['#64748B', '#475569'] : ['#635BFF', '#8B5CF6']}
            style={styles.payButtonGradient}
          >
            {processing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.payButtonText}>
                💳 €{planInfo.price} bezahlen
              </Text>
            )}
          </LinearGradient>
        </Pressable>
        
        {/* Cancel */}
        <Pressable 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Abbrechen</Text>
        </Pressable>
      </View>
      
      {/* Security Note */}
      <View style={styles.securityNote}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityText}>
          Dies ist eine Test-Umgebung. Keine echten Zahlungen werden verarbeitet.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stripeText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  testBadge: {
    backgroundColor: '#FEF08A',
    color: '#854D0E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Order Summary
  orderSummary: {
    backgroundColor: '#1E293B',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: 14,
    color: 'white',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  
  // Form
  form: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  
  // Test Info
  testInfo: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  testInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60A5FA',
    marginBottom: 8,
  },
  testInfoText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  
  // Buttons
  payButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
  },
  
  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
    marginBottom: 40,
  },
  securityIcon: {
    fontSize: 16,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  
  // Success
  successContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  successNote: {
    fontSize: 13,
    color: '#64748B',
  },
});

