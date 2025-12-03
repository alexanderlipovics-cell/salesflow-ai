/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - ONBOARDING SCREEN                                               ║
 * ║  Premium Onboarding-Flow mit AURA Design System                            ║
 * ║                                                                            ║
 * ║  Schritte:                                                                 ║
 * ║  1. Willkommen + Vorname/Nachname                                          ║
 * ║  2. Branche/Vertical auswählen                                             ║
 * ║  3. Sales-Erfahrungslevel                                                  ║
 * ║  4. Firmenname (optional) + Network-Auswahl                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { BASIC_PLAN, BUNDLES, formatPrice, type Bundle } from '../../config/pricing';
import { AuraLogo, AURA_COLORS } from '../../components/aura';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & KONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

interface VerticalOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
  template: 'sales' | 'network' | 'real_estate' | 'coaching' | 'finance' | 'gastro';
}

interface SalesLevelOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  months: string;
}

interface NetworkOption {
  slug: string;
  name: string;
  emoji: string;
  color: string;
}

// Branchen / Verticals
const VERTICALS: VerticalOption[] = [
  {
    id: 'network_marketing',
    label: 'Network Marketing',
    emoji: '🌐',
    description: 'MLM, Direktvertrieb, Partner-Aufbau',
    color: '#8B5CF6',
    template: 'network',
  },
  {
    id: 'real_estate',
    label: 'Immobilien',
    emoji: '🏠',
    description: 'Makler, Bauträger, Investments',
    color: '#10B981',
    template: 'real_estate',
  },
  {
    id: 'coaching',
    label: 'Coaching & Beratung',
    emoji: '🎯',
    description: 'Life Coach, Business Coach, Berater',
    color: '#F59E0B',
    template: 'coaching',
  },
  {
    id: 'finance',
    label: 'Finanzvertrieb',
    emoji: '💰',
    description: 'Versicherungen, Vermögensberatung',
    color: '#3B82F6',
    template: 'finance',
  },
  {
    id: 'gastro_hotel',
    label: 'Gastro & Hotel',
    emoji: '🍽️',
    description: 'Restaurant, Hotel, Events',
    color: '#EC4899',
    template: 'gastro',
  },
  {
    id: 'b2b_sales',
    label: 'B2B Sales',
    emoji: '🤝',
    description: 'Software, Dienstleistungen, Handel',
    color: '#06B6D4',
    template: 'sales',
  },
];

// Sales-Erfahrungslevel
const SALES_LEVELS: SalesLevelOption[] = [
  {
    id: 'starter',
    label: 'Starter',
    emoji: '🌱',
    description: 'Ich fange gerade erst an',
    months: '0-3 Monate',
  },
  {
    id: 'rookie',
    label: 'Rookie',
    emoji: '📈',
    description: 'Erste Erfahrungen gesammelt',
    months: '3-12 Monate',
  },
  {
    id: 'advanced',
    label: 'Fortgeschritten',
    emoji: '💪',
    description: 'Regelmäßige Abschlüsse',
    months: '1-3 Jahre',
  },
  {
    id: 'pro',
    label: 'Profi',
    emoji: '🏆',
    description: 'Sehr erfahren, Top-Performer',
    months: '3+ Jahre',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRICING EMPFEHLUNGS-LOGIK
// ═══════════════════════════════════════════════════════════════════════════

interface PricingRecommendation {
  bundle: Bundle | null;
  basicOnly: boolean;
  reason: string;
  monthlyPrice: number;
  yearlyPrice: number;
  savings: string;
  features: string[];
  cta: string;
}

function getRecommendation(vertical: string | null, salesLevel: string | null): PricingRecommendation {
  // Pro Bundle für erfahrene Verkäufer
  if (salesLevel === 'pro' || salesLevel === 'advanced') {
    const bundle = BUNDLES.find(b => b.id === 'pro_bundle')!;
    return {
      bundle,
      basicOnly: false,
      reason: vertical === 'network_marketing' 
        ? 'Als erfahrener Network Marketer brauchst du Autopilot für automatisches Team-Management'
        : 'Mit deiner Erfahrung maximierst du mit dem Pro Bundle deine Effizienz',
      monthlyPrice: bundle.bundlePrice,
      yearlyPrice: bundle.bundlePrice * 10, // 2 Monate gratis
      savings: `${bundle.savingsPercent}% günstiger als Einzelkauf`,
      features: [
        '🤖 500 Auto-Aktionen/Monat',
        '💰 Provisions- & Steuer-Tracking',
        '🎯 200 Lead-Vorschläge/Monat',
        '👻 Ghost-Buster für Re-Engagement',
        '📊 Volle Analytics Suite',
      ],
      cta: 'Pro Bundle starten',
    };
  }
  
  // Starter Bundle für Rookies in Network Marketing
  if (salesLevel === 'rookie' && vertical === 'network_marketing') {
    const bundle = BUNDLES.find(b => b.id === 'starter_bundle')!;
    return {
      bundle,
      basicOnly: false,
      reason: 'Perfekt für den Aufbau deines ersten Teams - alle Tools zum Lernen und Wachsen',
      monthlyPrice: bundle.bundlePrice,
      yearlyPrice: bundle.bundlePrice * 10,
      savings: `${bundle.savingsPercent}% günstiger als Einzelkauf`,
      features: [
        '🤖 100 Auto-Aktionen/Monat',
        '💰 Basis Provisions-Tracking',
        '🎯 50 Lead-Vorschläge/Monat',
        '📥 Chat-Import für Social Media',
        '💬 CHIEF KI-Coach für Einwände',
      ],
      cta: 'Starter Bundle wählen',
    };
  }
  
  // Basic Plan für absolute Starter
  if (salesLevel === 'starter') {
    return {
      bundle: null,
      basicOnly: true,
      reason: 'Starte mit den Grundlagen und upgrade später nach Bedarf',
      monthlyPrice: BASIC_PLAN.price,
      yearlyPrice: BASIC_PLAN.yearlyPrice,
      savings: '2 Monate gratis bei Jahreszahlung',
      features: BASIC_PLAN.features.slice(0, 5),
      cta: 'Mit Basic starten',
    };
  }
  
  // Default: Starter Bundle
  const bundle = BUNDLES.find(b => b.id === 'starter_bundle')!;
  return {
    bundle,
    basicOnly: false,
    reason: 'Das optimale Paket für deinen Start mit allen wichtigen Features',
    monthlyPrice: bundle.bundlePrice,
    yearlyPrice: bundle.bundlePrice * 10,
    savings: `${bundle.savingsPercent}% günstiger als Einzelkauf`,
    features: [
      '🤖 100 Auto-Aktionen/Monat',
      '💰 Provisions-Tracking',
      '🎯 50 Lead-Vorschläge/Monat',
      '📥 Chat-Import',
      '💬 CHIEF KI-Coach',
    ],
    cta: 'Starter Bundle wählen',
  };
}

// Networks (für Network Marketing)
const NETWORKS: NetworkOption[] = [
  { slug: 'zinzino', name: 'Zinzino', emoji: '🧬', color: '#1E3A5F' },
  { slug: 'pm-international', name: 'PM-International', emoji: '💪', color: '#1E40AF' },
  { slug: 'lr-health', name: 'LR Health & Beauty', emoji: '🌿', color: '#059669' },
  { slug: 'doterra', name: 'dōTERRA', emoji: '🌸', color: '#7C3AED' },
  { slug: 'amway', name: 'Amway', emoji: '🌍', color: '#2563EB' },
  { slug: 'herbalife', name: 'Herbalife', emoji: '🥤', color: '#16A34A' },
  { slug: 'other', name: 'Anderes', emoji: '🎯', color: '#64748B' },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  navigation?: any;
  onComplete?: () => void;
}

export default function OnboardingScreen({ navigation, onComplete }: Props) {
  const { user, refreshProfile } = useAuth();
  
  // Aktueller Schritt (0-3)
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Formulardaten
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [vertical, setVertical] = useState<string | null>(null);
  const [salesLevel, setSalesLevel] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [networkSlug, setNetworkSlug] = useState<string | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Prüfe ob Name aus Email extrahiert werden kann
  useEffect(() => {
    if (user?.email && !firstName) {
      const emailName = user.email.split('@')[0];
      // Versuche Namen aus Email zu extrahieren (z.B. max.mustermann@...)
      const parts = emailName.split(/[._-]/);
      if (parts.length >= 2) {
        setFirstName(parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase());
        setLastName(parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase());
      }
    }
  }, [user]);
  
  // Animation bei Schrittwechsel
  const animateStep = (direction: 'next' | 'back') => {
    const startX = direction === 'next' ? width : -width;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction === 'next' ? -50 : 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(startX / 10);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };
  
  const nextStep = () => {
    if (!validateStep()) return;
    
    if (step < 4) {
      animateStep('next');
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };
  
  const prevStep = () => {
    if (step > 0) {
      animateStep('back');
      setStep(step - 1);
    }
  };
  
  const validateStep = (): boolean => {
    setError('');
    
    switch (step) {
      case 0:
        if (!firstName.trim()) {
          setError('Bitte gib deinen Vornamen ein');
          return false;
        }
        if (!lastName.trim()) {
          setError('Bitte gib deinen Nachnamen ein');
          return false;
        }
        break;
      case 1:
        if (!vertical) {
          setError('Bitte wähle deine Branche');
          return false;
        }
        break;
      case 2:
        if (!salesLevel) {
          setError('Bitte wähle dein Erfahrungslevel');
          return false;
        }
        break;
    }
    
    return true;
  };
  
  const handleComplete = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Company-ID und Name holen wenn Network gewählt
      let companyId = null;
      let selectedCompanyName = companyName.trim() || null;
      
      if (networkSlug && networkSlug !== 'other') {
        const { data: company } = await supabase
          .from('companies')
          .select('id, name')
          .eq('slug', networkSlug)
          .single();
        companyId = company?.id || null;
        // Nutze Company-Name wenn kein eigener eingegeben
        if (!selectedCompanyName && company?.name) {
          selectedCompanyName = company.name;
        }
      }
      
      // Vollständigen Namen zusammensetzen
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      // Auth User Metadata ZUERST aktualisieren (das funktioniert immer)
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          vertical: vertical,
          skill_level: salesLevel,
          company_slug: networkSlug || 'other',
          company_name: selectedCompanyName,
          company_id: companyId,
          onboarding_completed: true,
        }
      });
      
      if (metaError) {
        console.warn('Metadata update warning:', metaError);
      }
      
      // Profil mit UPDATE aktualisieren (nicht upsert - umgeht Schema-Cache-Problem)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          vertical_id: vertical,
          skill_level: salesLevel,
          company_name: selectedCompanyName,
          company_id: companyId,
          company_slug: networkSlug || 'other',
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);
      
      // Ignoriere Schema-Cache-Fehler - Metadata ist gespeichert
      if (updateError) {
        console.warn('Profile update warning:', updateError);
        // Wenn es ein Schema-Cache-Problem ist, trotzdem weitermachen
        // Die Daten sind im Auth Metadata gespeichert
        if (!updateError.message?.includes('schema cache')) {
          throw updateError;
        }
      }
      
      // Kurze Pause für DB-Sync
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Profil neu laden
      if (refreshProfile) {
        await refreshProfile();
      }
      
      // Weiterleiten zur Hauptapp
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
      
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };
  
  // Zeige Network-Auswahl nur bei Network Marketing
  const showNetworkSelection = vertical === 'network_marketing';
  
  // Pricing-Empfehlung berechnen
  const recommendation = getRecommendation(vertical, salesLevel);
  
  // State für Pricing
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'bundle'>('bundle');
  const [isYearly, setIsYearly] = useState(true);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER STEPS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderStep0_Welcome = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>✦</Text>
      <Text style={styles.stepTitle}>Willkommen bei AURA OS!</Text>
      <Text style={styles.stepSubtitle}>
        Wie heißt du? Dein Name wird für personalisierte Nachrichten verwendet.
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Vorname *</Text>
        <TextInput
          style={styles.input}
          placeholder="Max"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoComplete="given-name"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nachname *</Text>
        <TextInput
          style={styles.input}
          placeholder="Mustermann"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          autoComplete="family-name"
        />
      </View>
      
      <Text style={styles.hint}>
        💡 So unterschreiben wir deine Nachrichten: "Beste Grüße, {firstName || 'Max'}"
      </Text>
    </View>
  );
  
  const renderStep1_Vertical = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>🎯</Text>
      <Text style={styles.stepTitle}>In welcher Branche bist du?</Text>
      <Text style={styles.stepSubtitle}>
        Wir passen Templates und KI-Antworten auf deine Branche an.
      </Text>
      
      <View style={styles.optionsGrid}>
        {VERTICALS.map((v) => (
          <Pressable
            key={v.id}
            style={[
              styles.optionCard,
              vertical === v.id && styles.optionCardSelected,
              vertical === v.id && { borderColor: v.color },
            ]}
            onPress={() => setVertical(v.id)}
          >
            <View style={[styles.optionEmoji, { backgroundColor: v.color + '20' }]}>
              <Text style={styles.optionEmojiText}>{v.emoji}</Text>
            </View>
            <Text style={[
              styles.optionLabel,
              vertical === v.id && { color: v.color },
            ]}>
              {v.label}
            </Text>
            <Text style={styles.optionDescription}>{v.description}</Text>
            {vertical === v.id && (
              <View style={[styles.checkBadge, { backgroundColor: v.color }]}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
  
  const renderStep2_Level = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>📊</Text>
      <Text style={styles.stepTitle}>Wie viel Verkaufserfahrung hast du?</Text>
      <Text style={styles.stepSubtitle}>
        Das hilft uns, dir passende Tipps und Templates zu geben.
      </Text>
      
      <View style={styles.levelOptions}>
        {SALES_LEVELS.map((level) => (
          <Pressable
            key={level.id}
            style={[
              styles.levelCard,
              salesLevel === level.id && styles.levelCardSelected,
            ]}
            onPress={() => setSalesLevel(level.id)}
          >
            <Text style={styles.levelEmoji}>{level.emoji}</Text>
            <View style={styles.levelInfo}>
              <Text style={[
                styles.levelLabel,
                salesLevel === level.id && styles.levelLabelSelected,
              ]}>
                {level.label}
              </Text>
              <Text style={styles.levelDescription}>{level.description}</Text>
              <Text style={styles.levelMonths}>{level.months}</Text>
            </View>
            {salesLevel === level.id && (
              <Text style={styles.levelCheck}>✓</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
  
  const renderStep3_Company = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>🏢</Text>
      <Text style={styles.stepTitle}>Fast fertig!</Text>
      <Text style={styles.stepSubtitle}>
        {showNetworkSelection 
          ? 'Für welches Network bist du tätig?'
          : 'Wie heißt deine Firma? (optional)'}
      </Text>
      
      {showNetworkSelection ? (
        <View style={styles.networkGrid}>
          {NETWORKS.map((network) => (
            <Pressable
              key={network.slug}
              style={[
                styles.networkCard,
                networkSlug === network.slug && styles.networkCardSelected,
                networkSlug === network.slug && { borderColor: network.color },
              ]}
              onPress={() => setNetworkSlug(network.slug)}
            >
              <Text style={styles.networkEmoji}>{network.emoji}</Text>
              <Text style={[
                styles.networkName,
                networkSlug === network.slug && { color: network.color },
              ]}>
                {network.name}
              </Text>
              {networkSlug === network.slug && (
                <Text style={[styles.networkCheck, { color: network.color }]}>✓</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Firmenname (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Meine Firma GmbH"
            value={companyName}
            onChangeText={setCompanyName}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>
            💡 Wird für professionelle Signaturen verwendet
          </Text>
        </View>
      )}
    </View>
  );
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: PERSONALISIERTE PRICING-EMPFEHLUNG
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderStep4_Pricing = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>🎁</Text>
      <Text style={styles.stepTitle}>Dein persönliches Angebot</Text>
      <Text style={styles.stepSubtitle}>{recommendation.reason}</Text>
      
      {/* Empfohlenes Paket */}
      <Pressable
        style={[
          styles.pricingCard,
          styles.pricingCardRecommended,
        ]}
        onPress={() => setSelectedPlan('bundle')}
      >
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedBadgeText}>✨ EMPFOHLEN</Text>
        </View>
        
        <Text style={styles.pricingName}>
          {recommendation.bundle ? recommendation.bundle.name : 'Basic Plan'}
        </Text>
        
        <View style={styles.pricingPriceRow}>
          <Text style={styles.pricingPrice}>
            {formatPrice(isYearly ? Math.round(recommendation.yearlyPrice / 12) : recommendation.monthlyPrice)}
          </Text>
          <Text style={styles.pricingPeriod}>/Monat</Text>
        </View>
        
        {isYearly && (
          <Text style={styles.pricingSavings}>{recommendation.savings}</Text>
        )}
        
        <View style={styles.pricingFeatures}>
          {recommendation.features.map((feature, idx) => (
            <Text key={idx} style={styles.pricingFeature}>{feature}</Text>
          ))}
        </View>
        
        {selectedPlan === 'bundle' && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓ Ausgewählt</Text>
          </View>
        )}
      </Pressable>
      
      {/* Basic Alternative (wenn Bundle empfohlen) */}
      {!recommendation.basicOnly && (
        <Pressable
          style={[
            styles.pricingCard,
            selectedPlan === 'basic' && styles.pricingCardSelected,
          ]}
          onPress={() => setSelectedPlan('basic')}
        >
          <Text style={styles.pricingNameSmall}>Basic Plan</Text>
          <View style={styles.pricingPriceRow}>
            <Text style={styles.pricingPriceSmall}>
              {formatPrice(isYearly ? 25 : BASIC_PLAN.price)}
            </Text>
            <Text style={styles.pricingPeriodSmall}>/Monat</Text>
          </View>
          <Text style={styles.pricingDescSmall}>
            Nur die Grundfunktionen - jederzeit upgraden
          </Text>
        </Pressable>
      )}
      
      {/* Yearly Toggle */}
      <View style={styles.yearlyToggleRow}>
        <Text style={styles.yearlyLabel}>Jährlich zahlen</Text>
        <Pressable
          style={[styles.yearlySwitch, isYearly && styles.yearlySwitchActive]}
          onPress={() => setIsYearly(!isYearly)}
        >
          <View style={[styles.yearlySwitchThumb, isYearly && styles.yearlySwitchThumbActive]} />
        </Pressable>
        {isYearly && <Text style={styles.yearlyBadge}>2 Monate gratis!</Text>}
      </View>
      
      <Text style={styles.hint}>
        💳 14 Tage kostenlos testen • Jederzeit kündbar
      </Text>
    </View>
  );
  
  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderStep0_Welcome();
      case 1: return renderStep1_Vertical();
      case 2: return renderStep2_Level();
      case 3: return renderStep3_Company();
      case 4: return renderStep4_Pricing();
      default: return null;
    }
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <LinearGradient
      colors={['#EEF2FF', '#F8FAFC', '#FFFFFF']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${((step + 1) / 5) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>Schritt {step + 1} von 5</Text>
          </View>
          
          {/* Step Content */}
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {renderCurrentStep()}
          </Animated.View>
          
          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          {/* Navigation Buttons */}
          <View style={styles.buttonsContainer}>
            {step > 0 && (
              <Pressable
                style={styles.backButton}
                onPress={prevStep}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>← Zurück</Text>
              </Pressable>
            )}
            
            <Pressable
              style={[
                styles.nextButton,
                step === 0 && styles.nextButtonFull,
              ]}
              onPress={nextStep}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {step === 3 ? 'Fertig! 🚀' : 'Weiter →'}
                </Text>
              )}
            </Pressable>
          </View>
          
          {/* Skip Option */}
          {step === 3 && (
            <Pressable
              style={styles.skipButton}
              onPress={() => {
                if (!networkSlug && showNetworkSelection) {
                  setNetworkSlug('other');
                }
                handleComplete();
              }}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>Später ergänzen</Text>
            </Pressable>
          )}
          
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    minHeight: '100%',
  },
  
  // Progress
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Step Container
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 320,
  },
  
  // Input
  inputGroup: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#1E293B',
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Options Grid (Verticals)
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    maxWidth: 600,
  },
  optionCard: {
    width: '47%',
    minWidth: 150,
    maxWidth: 180,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    position: 'relative',
  },
  optionCardSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionEmojiText: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Level Options
  levelOptions: {
    width: '100%',
    maxWidth: 500,
    gap: 12,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  levelCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  levelEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  levelLabelSelected: {
    color: '#3B82F6',
  },
  levelDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  levelMonths: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  levelCheck: {
    fontSize: 24,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  
  // Network Grid
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    maxWidth: 500,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minWidth: 140,
  },
  networkCardSelected: {
    backgroundColor: '#F0F9FF',
  },
  networkEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  networkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  networkCheck: {
    fontSize: 18,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 17,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 15,
  },
});

