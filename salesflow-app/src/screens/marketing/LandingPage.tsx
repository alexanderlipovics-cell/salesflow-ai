/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - LANDING PAGE                                                    ║
 * ║  Modern, conversion-optimized landing page                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// =============================================================================
// THEME & COLORS
// =============================================================================

const COLORS = {
  // Primary gradient
  primary: '#22C55E',
  primaryDark: '#15803D',
  primaryLight: '#4ADE80',
  
  // Accent
  accent: '#3B82F6',
  accentLight: '#60A5FA',
  
  // Background
  bgDark: '#0A0F1A',
  bgCard: '#111827',
  bgCardHover: '#1F2937',
  
  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  
  // Danger/Warning
  danger: '#EF4444',
  warning: '#F59E0B',
  
  // DISC Colors
  discRed: '#DC2626',
  discYellow: '#FBBF24',
  discGreen: '#22C55E',
  discBlue: '#3B82F6',
};

// =============================================================================
// DATA
// =============================================================================

const PROBLEMS = [
  {
    icon: 'warning-outline',
    title: 'Ungeschützte KI',
    description: 'Mitarbeiter nutzen ChatGPT privat → Datenlecks, falsche Preise, Halluzinationen.',
    color: COLORS.danger,
  },
  {
    icon: 'time-outline',
    title: 'Zeitverschwendung',
    description: 'Vertriebler tippen E-Mails selbst, statt zu verkaufen.',
    color: COLORS.warning,
  },
  {
    icon: 'sad-outline',
    title: 'Angst vor Einwänden',
    description: 'Neue Mitarbeiter trauen sich nicht, Einwände zu behandeln.',
    color: COLORS.discYellow,
  },
  {
    icon: 'shield-outline',
    title: 'Rechtliche Risiken',
    description: 'Abmahnungsgefahr durch falsche Heilversprechen oder Garantien.',
    color: COLORS.discRed,
  },
];

const USPS = [
  {
    icon: 'lock-closed',
    title: 'Locked Block™',
    subtitle: 'Manipulation-Schutz',
    description: 'Schützt den Bot vor Prompt-Injection. Er plaudert niemals Interna aus.',
    color: COLORS.discRed,
    badge: 'SECURITY',
  },
  {
    icon: 'library',
    title: 'Knowledge Base Zwang',
    subtitle: 'Nur verifizierte Infos',
    description: 'Der Bot nutzt NUR firmeneigene PDFs und Preise. Er rät niemals.',
    color: COLORS.accent,
    badge: 'ACCURACY',
  },
  {
    icon: 'shield-checkmark',
    title: 'Liability Shield',
    subtitle: 'Rechtssicherheit',
    description: 'Ein Filter, der rechtlich gefährliche Aussagen automatisch umschreibt.',
    color: COLORS.primary,
    badge: 'COMPLIANCE',
  },
  {
    icon: 'people',
    title: 'Neuro-Profiler',
    subtitle: 'DISC-Analyse',
    description: 'Analysiert den Kunden-Typ und passt die Tonalität automatisch an.',
    color: COLORS.discYellow,
    badge: 'PERSONALIZATION',
  },
  {
    icon: 'eye-off',
    title: 'Silent Guard',
    subtitle: 'Kopierschutz',
    description: 'Integrierter Schutz, damit das System exklusiv bei dir bleibt.',
    color: COLORS.textMuted,
    badge: 'EXCLUSIVE',
  },
];

const VERTICALS = [
  {
    id: 'network',
    label: 'Network Marketing',
    icon: 'git-network-outline',
    headline: 'Duplizierung auf Knopfdruck',
    subheadline: 'Dein neuer Partner antwortet ab Tag 1 so sicher wie ein Diamond-Leader.',
    benefits: [
      'Keine Angst mehr vor "Zu teuer"',
      'Keine falschen Heilversprechen',
      'Perfekte Einwandbehandlung',
      'Skalierbare Team-Schulung',
    ],
    cta: 'Demo für Network Teams',
    color: COLORS.primary,
  },
  {
    id: 'realestate',
    label: 'Immobilien',
    icon: 'home-outline',
    headline: 'Schreibst du noch Exposés oder verkaufst du schon?',
    subheadline: 'Mein System erstellt emotionale Texte in 3 Sekunden und filtert Touristen von echten Käufern.',
    benefits: [
      'Emotionale Exposés in Sekunden',
      'Automatische Käufer-Qualifizierung',
      'Follow-up Sequenzen',
      'Termine ohne Telefon-Marathon',
    ],
    cta: 'Demo für Makler',
    color: COLORS.accent,
  },
  {
    id: 'hospitality',
    label: 'Gastro & Hotels',
    icon: 'bed-outline',
    headline: 'Der digitale Empfangschef',
    subheadline: 'Beantwortet Beschwerden diplomatisch und verkauft Upgrades, während dein Team schläft.',
    benefits: [
      'Beschwerden → Chancen',
      '24/7 Upselling',
      'Automatische Reservierungen',
      'Review-Management',
    ],
    cta: 'Demo für Hotels',
    color: COLORS.discYellow,
  },
  {
    id: 'b2b',
    label: 'B2B / Industrie',
    icon: 'briefcase-outline',
    headline: 'Der ROI-Rechner',
    subheadline: 'Zeige dem Kunden mathematisch, warum dein teureres Produkt ihn billiger kommt.',
    benefits: [
      'Value-Selling automatisiert',
      'Technische Anfragen in Sekunden',
      'Angebots-Erstellung',
      'Wettbewerbsvergleiche',
    ],
    cta: 'Demo für B2B',
    color: COLORS.discBlue,
  },
];

const PRICING = [
  {
    name: 'Solo',
    price: '149',
    period: '/Monat',
    description: '1-3 Nutzer',
    features: [
      'Live Assist Modul',
      'Einwand-Brain',
      'Knowledge Base (1 Company)',
      'E-Mail Support',
    ],
    cta: 'Solo starten',
    popular: false,
  },
  {
    name: 'Team',
    price: '990',
    period: '/Monat',
    description: '5-25 Nutzer',
    features: [
      'Alles aus Solo',
      'Team Dashboard',
      'Objection Analytics',
      'Playbook Builder',
      'Onboarding-Paket',
      'Priority Support',
    ],
    cta: 'Team Demo buchen',
    popular: true,
    badge: 'BELIEBT',
  },
  {
    name: 'Enterprise',
    price: '2.400',
    period: '+/Monat',
    description: '50+ Nutzer',
    features: [
      'Alles aus Team',
      'Custom Integration',
      'White-Label Option',
      'SLA Garantie',
      'Dedicated Success Manager',
      'On-Premise Option',
    ],
    cta: 'Enterprise anfragen',
    popular: false,
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

// Animated Counter
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 2000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <Text style={styles.statNumber}>{displayValue.toLocaleString()}{suffix}</Text>;
};

// Glowing Button
const GlowButton = ({ 
  title, 
  onPress, 
  variant = 'primary',
  icon,
  size = 'large'
}: { 
  title: string; 
  onPress: () => void; 
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: string;
  size?: 'small' | 'medium' | 'large';
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };
  
  const sizeStyles = {
    small: { paddingVertical: 10, paddingHorizontal: 20 },
    medium: { paddingVertical: 14, paddingHorizontal: 28 },
    large: { paddingVertical: 18, paddingHorizontal: 36 },
  };
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={variant === 'primary' 
            ? [COLORS.primary, COLORS.primaryDark] 
            : variant === 'secondary'
            ? [COLORS.accent, '#2563EB']
            : ['transparent', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.glowButton,
            sizeStyles[size],
            variant === 'outline' && styles.glowButtonOutline,
          ]}
        >
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={size === 'large' ? 22 : 18} 
              color={COLORS.textPrimary} 
              style={{ marginRight: 10 }}
            />
          )}
          <Text style={[
            styles.glowButtonText,
            size === 'small' && { fontSize: 14 },
          ]}>
            {title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Feature Card
const FeatureCard = ({ item, index }: { item: typeof USPS[0]; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.featureCard,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderColor: item.color + '40',
        }
      ]}
    >
      <View style={[styles.featureIconWrap, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={28} color={item.color} />
      </View>
      <View style={[styles.featureBadge, { backgroundColor: item.color + '30' }]}>
        <Text style={[styles.featureBadgeText, { color: item.color }]}>{item.badge}</Text>
      </View>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
      <Text style={styles.featureDescription}>{item.description}</Text>
    </Animated.View>
  );
};

// Vertical Tab
const VerticalTab = ({ 
  item, 
  isActive, 
  onPress 
}: { 
  item: typeof VERTICALS[0]; 
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity 
    onPress={onPress}
    style={[
      styles.verticalTab,
      isActive && { backgroundColor: item.color + '20', borderColor: item.color },
    ]}
  >
    <Ionicons 
      name={item.icon as any} 
      size={20} 
      color={isActive ? item.color : COLORS.textSecondary} 
    />
    <Text style={[
      styles.verticalTabText,
      isActive && { color: item.color },
    ]}>
      {item.label}
    </Text>
  </TouchableOpacity>
);

// Pricing Card
const PricingCard = ({ item }: { item: typeof PRICING[0] }) => (
  <View style={[
    styles.pricingCard,
    item.popular && styles.pricingCardPopular,
  ]}>
    {item.popular && item.badge && (
      <View style={styles.pricingBadge}>
        <Text style={styles.pricingBadgeText}>{item.badge}</Text>
      </View>
    )}
    <Text style={styles.pricingName}>{item.name}</Text>
    <Text style={styles.pricingDescription}>{item.description}</Text>
    <View style={styles.pricingPriceRow}>
      <Text style={styles.pricingCurrency}>€</Text>
      <Text style={styles.pricingPrice}>{item.price}</Text>
      <Text style={styles.pricingPeriod}>{item.period}</Text>
    </View>
    <View style={styles.pricingFeatures}>
      {item.features.map((feature, i) => (
        <View key={i} style={styles.pricingFeatureRow}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
          <Text style={styles.pricingFeatureText}>{feature}</Text>
        </View>
      ))}
    </View>
    <GlowButton 
      title={item.cta}
      onPress={() => {}}
      variant={item.popular ? 'primary' : 'outline'}
      size="medium"
    />
  </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function LandingPage() {
  const [activeVertical, setActiveVertical] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const currentVertical = VERTICALS[activeVertical];
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  const handleCTA = () => {
    Linking.openURL('https://calendly.com/aura-os-demo');
  };
  
  const handleLogin = () => {
    navigation.navigate('Login');
  };
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={[COLORS.bgDark, '#0D1321', COLORS.bgDark]}
        style={styles.heroSection}
      >
        {/* Floating particles effect */}
        <View style={styles.heroParticles}>
          {[...Array(20)].map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.particle,
                { 
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.1,
                  width: Math.random() * 4 + 2,
                  height: Math.random() * 4 + 2,
                }
              ]} 
            />
          ))}
        </View>
        
        <View style={styles.heroContent}>
          {/* Badge */}
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={COLORS.primary} />
            <Text style={styles.heroBadgeText}>Autonomous Enterprise System</Text>
          </View>
          
          {/* Headline */}
          <Text style={styles.heroHeadline}>
            Verwandle ChatGPT in einen{'\n'}
            <Text style={styles.heroHeadlineAccent}>compliance-sicheren</Text>
            {'\n'}Top-Verkäufer
          </Text>
          
          {/* Subheadline */}
          <Text style={styles.heroSubheadline}>
            AURA OS ist der "Smart Layer" zwischen der KI und deiner Firma.
            {'\n'}Keine Datenlecks. Keine Halluzinationen. Nur Resultate.
          </Text>
          
          {/* CTA Buttons */}
          <View style={styles.heroCTARow}>
            <GlowButton 
              title="🚀 App öffnen / Login"
              onPress={handleLogin}
              variant="primary"
              icon="log-in-outline"
            />
            <GlowButton 
              title="Demo buchen"
              onPress={handleCTA}
              variant="secondary"
              icon="calendar-outline"
            />
          </View>
          <View style={[styles.heroCTARow, { marginTop: 12 }]}>
            <GlowButton 
              title="Features entdecken"
              onPress={() => {}}
              variant="outline"
              icon="arrow-down-outline"
            />
          </View>
          
          {/* Trust Badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
              <Text style={styles.trustText}>DSGVO-konform</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="server" size={16} color={COLORS.primary} />
              <Text style={styles.trustText}>EU-Server</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
              <Text style={styles.trustText}>Enterprise Security</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROBLEM SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DAS PROBLEM</Text>
        <Text style={styles.sectionHeadline}>
          Warum "einfach ChatGPT nutzen" {'\n'}
          <Text style={{ color: COLORS.danger }}>gefährlich</Text> ist
        </Text>
        
        <View style={styles.problemGrid}>
          {PROBLEMS.map((problem, i) => (
            <View key={i} style={[styles.problemCard, { borderLeftColor: problem.color }]}>
              <View style={[styles.problemIcon, { backgroundColor: problem.color + '20' }]}>
                <Ionicons name={problem.icon as any} size={24} color={problem.color} />
              </View>
              <Text style={styles.problemTitle}>{problem.title}</Text>
              <Text style={styles.problemDescription}>{problem.description}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* USP SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: COLORS.bgCard }]}>
        <Text style={styles.sectionLabel}>DIE LÖSUNG</Text>
        <Text style={styles.sectionHeadline}>
          5 Features, die dich{'\n'}
          <Text style={{ color: COLORS.primary }}>schützen & skalieren</Text>
        </Text>
        
        <View style={styles.featureGrid}>
          {USPS.map((usp, i) => (
            <FeatureCard key={i} item={usp} index={i} />
          ))}
        </View>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VERTICALS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FÜR DEINE BRANCHE</Text>
        <Text style={styles.sectionHeadline}>
          Maßgeschneidert für{'\n'}
          <Text style={{ color: currentVertical.color }}>{currentVertical.label}</Text>
        </Text>
        
        {/* Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.verticalTabsScroll}
          contentContainerStyle={styles.verticalTabsContainer}
        >
          {VERTICALS.map((v, i) => (
            <VerticalTab 
              key={v.id}
              item={v}
              isActive={i === activeVertical}
              onPress={() => setActiveVertical(i)}
            />
          ))}
        </ScrollView>
        
        {/* Content */}
        <View style={[styles.verticalContent, { borderColor: currentVertical.color + '40' }]}>
          <Text style={[styles.verticalHeadline, { color: currentVertical.color }]}>
            "{currentVertical.headline}"
          </Text>
          <Text style={styles.verticalSubheadline}>
            {currentVertical.subheadline}
          </Text>
          
          <View style={styles.verticalBenefits}>
            {currentVertical.benefits.map((benefit, i) => (
              <View key={i} style={styles.verticalBenefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={currentVertical.color} />
                <Text style={styles.verticalBenefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
          
          <GlowButton 
            title={currentVertical.cta}
            onPress={handleCTA}
            variant="primary"
          />
        </View>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRICING SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: COLORS.bgCard }]}>
        <Text style={styles.sectionLabel}>PREISE</Text>
        <Text style={styles.sectionHeadline}>
          Investiere in{'\n'}
          <Text style={{ color: COLORS.primary }}>Wachstum</Text>
        </Text>
        
        <View style={styles.pricingGrid}>
          {PRICING.map((p, i) => (
            <PricingCard key={i} item={p} />
          ))}
        </View>
        
        <Text style={styles.pricingNote}>
          Alle Preise zzgl. MwSt. • Monatlich kündbar • Setup-Gebühr bei Team & Enterprise
        </Text>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CTA SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={[COLORS.primary + '20', COLORS.bgDark]}
        style={styles.ctaSection}
      >
        <Text style={styles.ctaHeadline}>
          Bereit, dein Vertriebsteam{'\n'}zu transformieren?
        </Text>
        <Text style={styles.ctaSubheadline}>
          30 Minuten Demo. Keine Verpflichtung. Echte Insights.
        </Text>
        <GlowButton 
          title="Jetzt Demo buchen"
          onPress={handleCTA}
          variant="primary"
          icon="rocket-outline"
          size="large"
        />
      </LinearGradient>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerLogo}>AURA OS</Text>
        <Text style={styles.footerText}>
          © 2024 AURA OS • Made with 💚 in Germany
        </Text>
      </View>
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  content: {
    minHeight: '100%',
  },
  
  // Hero
  heroSection: {
    minHeight: 700,
    paddingTop: 80,
    paddingBottom: 60,
    position: 'relative',
    overflow: 'hidden',
  },
  heroParticles: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
    borderRadius: 100,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  heroBadgeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  heroHeadline: {
    fontSize: isWeb ? 56 : 36,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: isWeb ? 68 : 44,
    marginBottom: 24,
  },
  heroHeadlineAccent: {
    color: COLORS.primary,
  },
  heroSubheadline: {
    fontSize: isWeb ? 20 : 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: isWeb ? 32 : 26,
    maxWidth: 600,
    marginBottom: 40,
  },
  heroCTARow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
    marginBottom: 40,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  
  // Sections
  section: {
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionHeadline: {
    fontSize: isWeb ? 42 : 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: isWeb ? 52 : 36,
    marginBottom: 48,
  },
  
  // Problems
  problemGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  problemCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 24,
    width: isWeb ? 280 : '100%',
    borderLeftWidth: 4,
  },
  problemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  problemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  problemDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  
  // Features
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  featureCard: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 20,
    padding: 28,
    width: isWeb ? 340 : '100%',
    borderWidth: 1,
    position: 'relative',
  },
  featureIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  featureBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  
  // Verticals
  verticalTabsScroll: {
    marginBottom: 32,
  },
  verticalTabsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  verticalTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  verticalTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  verticalContent: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 40,
    maxWidth: 700,
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  verticalHeadline: {
    fontSize: isWeb ? 28 : 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  verticalSubheadline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  verticalBenefits: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  verticalBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  verticalBenefitText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  
  // Pricing
  pricingGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1000,
    alignSelf: 'center',
  },
  pricingCard: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 20,
    padding: 32,
    width: isWeb ? 300 : '100%',
    borderWidth: 1,
    borderColor: COLORS.textMuted + '30',
    alignItems: 'center',
  },
  pricingCardPopular: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    transform: isWeb ? [{ scale: 1.05 }] : [],
  },
  pricingBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  pricingBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  pricingName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  pricingDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  pricingPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  pricingCurrency: {
    fontSize: 20,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pricingPeriod: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  pricingFeatures: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  pricingFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  pricingNote: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 32,
  },
  
  // CTA
  ctaSection: {
    paddingVertical: 100,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaHeadline: {
    fontSize: isWeb ? 42 : 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaSubheadline: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  
  // Footer
  footer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.textMuted + '20',
  },
  footerLogo: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  
  // Buttons
  glowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glowButtonOutline: {
    borderWidth: 2,
    borderColor: COLORS.textMuted + '50',
    backgroundColor: 'transparent',
  },
  glowButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Stats
  statNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
  },
});

