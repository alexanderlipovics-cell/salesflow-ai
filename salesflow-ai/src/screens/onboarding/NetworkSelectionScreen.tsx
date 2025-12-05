/**
 * NetworkSelectionScreen - Auswahl des Network-Marketing-Unternehmens
 * 
 * Wird nach der Registrierung oder beim ersten Login angezeigt,
 * wenn noch kein Network ausgewählt wurde.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK-DEFINITIONEN
// ═══════════════════════════════════════════════════════════════════════════

interface NetworkOption {
  slug: string;
  name: string;
  tagline: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
  };
  description: string;
  features: string[];
}

const NETWORKS: NetworkOption[] = [
  {
    slug: 'zinzino',
    name: 'Zinzino',
    tagline: 'Von Raten zu Wissen',
    emoji: '🧬',
    colors: {
      primary: '#1E3A5F',
      secondary: '#E8B923',
    },
    description: 'Testbasierte, personalisierte Ernährung aus Skandinavien',
    features: ['BalanceTest-Beratung', 'Omega-3 Expertise', 'Compliance-sicher'],
  },
  {
    slug: 'pm-international',
    name: 'PM-International',
    tagline: 'FitLine Nährstoffoptimierung',
    emoji: '💪',
    colors: {
      primary: '#1E40AF',
      secondary: '#10B981',
    },
    description: 'Nährstoffoptimierung für Sport und Alltag',
    features: ['Sport-Performance', 'NTC-Konzept', 'Team-Events'],
  },
  {
    slug: 'lr-health',
    name: 'LR Health & Beauty',
    tagline: 'Aloe Vera & Lifestyle',
    emoji: '🌿',
    colors: {
      primary: '#059669',
      secondary: '#F59E0B',
    },
    description: 'Aloe Vera Produkte und Lifestyle-Pflege',
    features: ['Aloe Vera Expertise', 'Parfum-Beratung', 'Körperpflege'],
  },
  {
    slug: 'doterra',
    name: 'dōTERRA',
    tagline: 'Essential Oils for Life',
    emoji: '🌸',
    colors: {
      primary: '#7C3AED',
      secondary: '#059669',
    },
    description: 'Ätherische Öle und Wellness-Produkte',
    features: ['Öle-Empfehlungen', 'Wellness-Beratung', 'CPTG-Qualität'],
  },
  {
    slug: 'other',
    name: 'Anderes Network',
    tagline: 'Generischer Sales Coach',
    emoji: '🎯',
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
    },
    description: 'Für alle anderen Network-Marketing-Unternehmen',
    features: ['Allgemeine Verkaufstipps', 'Einwandbehandlung', 'Follow-ups'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  navigation?: any;
  onComplete?: () => void;
}

export default function NetworkSelectionScreen({ navigation, onComplete }: Props) {
  const { user, refreshProfile } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSelect = async () => {
    if (!selectedNetwork) {
      setError('Bitte wähle ein Network aus');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Company-ID holen oder erstellen
      let companyId = null;
      
      if (selectedNetwork !== 'other') {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', selectedNetwork)
          .single();
        
        companyId = company?.id;
      }

      // 2. User-Profil aktualisieren
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          company_id: companyId,
          company_slug: selectedNetwork,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      // 3. Profil neu laden
      if (refreshProfile) {
        await refreshProfile();
      }

      // 4. Weiterleiten
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }

    } catch (err: any) {
      console.error('Network selection error:', err);
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // Als "other" speichern und fortfahren
    setSelectedNetwork('other');
    
    try {
      await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          company_slug: 'other',
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        });

      if (refreshProfile) await refreshProfile();
      
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (err) {
      console.error('Skip error:', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🎯</Text>
          <Text style={styles.headerTitle}>Wähle dein Network</Text>
          <Text style={styles.headerSubtitle}>
            Dein Coach wird speziell auf dein Unternehmen optimiert
          </Text>
        </View>

        {/* Network Cards */}
        <View style={styles.cardsContainer}>
          {NETWORKS.map((network) => (
            <Pressable
              key={network.slug}
              style={[
                styles.card,
                selectedNetwork === network.slug && styles.cardSelected,
                selectedNetwork === network.slug && {
                  borderColor: network.colors.primary,
                },
              ]}
              onPress={() => setSelectedNetwork(network.slug)}
            >
              <LinearGradient
                colors={
                  selectedNetwork === network.slug
                    ? [network.colors.primary, network.colors.secondary]
                    : ['transparent', 'transparent']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>{network.emoji}</Text>
                  <View style={styles.cardTitleContainer}>
                    <Text
                      style={[
                        styles.cardTitle,
                        selectedNetwork === network.slug && styles.cardTitleSelected,
                      ]}
                    >
                      {network.name}
                    </Text>
                    <Text
                      style={[
                        styles.cardTagline,
                        selectedNetwork === network.slug && styles.cardTaglineSelected,
                      ]}
                    >
                      {network.tagline}
                    </Text>
                  </View>
                  {selectedNetwork === network.slug && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.cardDescription,
                    selectedNetwork === network.slug && styles.cardDescriptionSelected,
                  ]}
                >
                  {network.description}
                </Text>

                <View style={styles.featuresRow}>
                  {network.features.map((feature, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.featureChip,
                        selectedNetwork === network.slug && styles.featureChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.featureText,
                          selectedNetwork === network.slug && styles.featureTextSelected,
                        ]}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            style={[
              styles.continueButton,
              !selectedNetwork && styles.continueButtonDisabled,
            ]}
            onPress={handleSelect}
            disabled={!selectedNetwork || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.continueButtonText}>
                Weiter mit {selectedNetwork ? NETWORKS.find(n => n.slug === selectedNetwork)?.name : '...'}
              </Text>
            )}
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Überspringen</Text>
          </Pressable>
        </View>

        {/* Info */}
        <Text style={styles.infoText}>
          💡 Du kannst dein Network später in den Einstellungen ändern
        </Text>

      </Animated.View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },

  // Cards
  cardsContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  cardSelected: {
    borderWidth: 2,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  cardTitleSelected: {
    color: 'white',
  },
  cardTagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  cardTaglineSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  checkmark: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  cardDescriptionSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  featureText: {
    fontSize: 12,
    color: '#475569',
  },
  featureTextSelected: {
    color: 'white',
  },

  // Error
  error: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },

  // Buttons
  buttonsContainer: {
    marginTop: 24,
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#64748B',
    fontSize: 16,
  },

  // Info
  infoText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 20,
  },
});

