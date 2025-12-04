/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SUBSCRIPTION SCREEN                                                        ║
 * ║  Abo-Verwaltung und Stripe Portal                                           ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
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

// Plan Labels
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
  founding_member: 'Founding Member',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv',
  canceled: 'Gekündigt',
  past_due: 'Überfällig',
  trialing: 'Testphase',
};

export default function SubscriptionScreen({ navigation }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/v2/payment/subscription`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      Alert.alert('Fehler', 'Bitte melde dich an');
      return;
    }

    setPortalLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/payment/create-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Portal Session');
      }

      const data = await response.json();
      
      if (data.portal_url) {
        const canOpen = await Linking.canOpenURL(data.portal_url);
        if (canOpen) {
          await Linking.openURL(data.portal_url);
        } else {
          Alert.alert('Fehler', 'Kann Portal-URL nicht öffnen');
        }
      }
    } catch (error) {
      console.error('Portal Error:', error);
      Alert.alert('Fehler', 'Fehler beim Öffnen des Abo-Portals');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigation.navigate('Payment');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dein Abo</Text>
      </View>

      {/* Current Subscription */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Aktueller Plan</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription?.status) }]}>
            <Text style={styles.statusText}>
              {STATUS_LABELS[subscription?.status] || subscription?.status || 'Unbekannt'}
            </Text>
          </View>
        </View>

        <Text style={styles.planName}>
          {PLAN_LABELS[subscription?.plan] || subscription?.plan || 'Free'}
        </Text>

        {subscription?.current_period_end && (
          <Text style={styles.periodText}>
            Läuft ab: {formatDate(subscription.current_period_end)}
          </Text>
        )}

        {subscription?.cancel_at && (
          <Text style={styles.cancelText}>
            Wird gekündigt am: {formatDate(subscription.cancel_at)}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {subscription?.status === 'active' && (
          <Pressable
            style={[styles.button, styles.manageButton]}
            onPress={handleManageSubscription}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Abo verwalten</Text>
            )}
          </Pressable>
        )}

        {(!subscription || subscription.plan === 'free') && (
          <Pressable
            style={[styles.button, styles.upgradeButton]}
            onPress={handleUpgrade}
          >
            <Text style={styles.buttonText}>Upgrade</Text>
          </Pressable>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Häufige Fragen</Text>
        <Text style={styles.infoText}>
          • Du kannst dein Abo jederzeit kündigen{'\n'}
          • Zahlungsmethoden können im Abo-Portal geändert werden{'\n'}
          • Rechnungen werden per E-Mail versendet
        </Text>
      </View>
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#10b981';
    case 'canceled':
      return '#ef4444';
    case 'past_due':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    marginTop: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  periodText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  cancelText: {
    fontSize: 14,
    color: '#f59e0b',
    marginTop: 8,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  manageButton: {
    backgroundColor: '#3b82f6',
  },
  upgradeButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginTop: 0,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
  },
});

