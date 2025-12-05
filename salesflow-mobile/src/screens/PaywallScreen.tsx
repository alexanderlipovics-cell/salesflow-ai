import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '../context/SubscriptionContext';

interface PaywallScreenProps {
  navigation: any;
  route?: {
    params?: {
      trigger?: 'lead_limit' | 'ai_blocked' | 'manual';
    };
  };
}

const FEATURES = {
  free: [
    { text: '5 Leads verwalten', included: true },
    { text: 'Script-Bibliothek', included: true },
    { text: 'Einwand-Suche', included: true },
    { text: 'KI-Copilot', included: false },
    { text: 'Unbegrenzte Leads', included: false },
    { text: 'Personalisierte Antworten', included: false },
    { text: 'Autopilot', included: false },
  ],
  pro: [
    { text: 'Unbegrenzte Leads', included: true },
    { text: 'Script-Bibliothek', included: true },
    { text: 'Einwand-Suche', included: true },
    { text: 'KI-Copilot (unbegrenzt)', included: true },
    { text: 'Personalisierte Antworten', included: true },
    { text: 'Autopilot & Reminder', included: true },
    { text: 'Priority Support', included: true },
  ],
};

const PaywallScreen: React.FC<PaywallScreenProps> = ({ navigation, route }) => {
  const { upgradeToPro } = useSubscription();
  const trigger = route?.params?.trigger;

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'lead_limit':
        return 'Du hast das Limit von 5 Leads erreicht.';
      case 'ai_blocked':
        return 'Der KI-Copilot ist nur für Pro-User verfügbar.';
      default:
        return 'Hol das Maximum aus Sales Flow AI.';
    }
  };

  const handleUpgrade = async () => {
    // TODO: Integrate Stripe/RevenueCat
    // For now, simulate upgrade
    Alert.alert(
      'Upgrade auf Pro',
      'In der finalen Version wirst du hier zu Stripe weitergeleitet.\n\nFür Demo-Zwecke aktivieren wir Pro jetzt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Demo: Pro aktivieren', 
          onPress: async () => {
            await upgradeToPro();
            Alert.alert('Erfolg!', 'Du bist jetzt Pro-User! 🎉');
            navigation.goBack();
          }
        },
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert('Käufe wiederherstellen', 'Wird in der finalen Version implementiert.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Ionicons name="rocket" size={48} color="#10b981" />
          </View>
          <Text style={styles.title}>Upgrade auf Pro</Text>
          <Text style={styles.subtitle}>{getTriggerMessage()}</Text>
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.price}>€9,99</Text>
          <Text style={styles.period}>/ Monat</Text>
          <Text style={styles.savings}>Spare 50% mit Jahresabo: €59,99/Jahr</Text>
        </View>

        {/* Feature Comparison */}
        <View style={styles.comparison}>
          {/* Free Column */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Free</Text>
            {FEATURES.free.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons 
                  name={feature.included ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={feature.included ? '#10b981' : '#ef4444'} 
                />
                <Text style={[
                  styles.featureText,
                  !feature.included && styles.featureDisabled
                ]}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Pro Column */}
          <View style={[styles.column, styles.proColumn]}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.columnTitle}>Pro</Text>
            {FEATURES.pro.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color="#10b981" 
                />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
          <Text style={styles.upgradeButtonText}>Jetzt upgraden</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreText}>Käufe wiederherstellen</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          Jederzeit kündbar. Es gelten unsere AGB und Datenschutzrichtlinien.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  pricingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10b981',
  },
  period: {
    fontSize: 18,
    color: '#a1a1aa',
    marginBottom: 8,
  },
  savings: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  comparison: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  column: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
  },
  proColumn: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  proBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 13,
    color: '#e4e4e7',
    flex: 1,
  },
  featureDisabled: {
    color: '#71717a',
    textDecorationLine: 'line-through',
  },
  upgradeButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  restoreText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    color: '#71717a',
    fontSize: 12,
    marginTop: 16,
  },
});

export default PaywallScreen;

