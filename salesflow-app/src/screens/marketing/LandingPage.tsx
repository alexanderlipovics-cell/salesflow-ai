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

const FELLO_FEATURES = [
  {
    id: 'mentor',
    icon: '🤖',
    title: 'MENTOR - KI-Vertriebscoach',
    description: 'Formuliert Antworten, Follow-ups, Einwand-Behandlung',
    details: 'Im Tonfall von dir/deinem Team',
    highlight: 'Deine Leute müssen nicht mehr fragen...',
    color: COLORS.accent,
  },
  {
    id: 'compliance',
    icon: '🛡️',
    title: 'Compliance-Schutz (HWG/DSGVO)',
    description: 'Problematische Aussagen markiert',
    details: 'Saubere Alternativen vorgeschlagen',
    highlight: 'Massive Risikominimierung',
    color: COLORS.primary,
  },
  {
    id: 'mlm',
    icon: '🔗',
    title: 'MLM- & Network-Funktionen',
    description: 'Zinzino, doTERRA, Herbalife Parser',
    details: 'Campaign Templates & Duplizierung der besten Formulierungen',
    highlight: 'Skalierbare Team-Performance',
    color: COLORS.discYellow,
  },
  {
    id: 'ghostbuster',
    icon: '👻',
    title: 'Ghostbuster Re-Engagement',
    description: 'Schlafende Kontakte reaktivieren',
    details: 'Automatische Vorschläge',
    highlight: 'Aus "die melden sich eh nicht mehr" wird...',
    color: COLORS.discBlue,
  },
  {
    id: 'automation',
    icon: '📊',
    title: 'Automatisierung & Finance',
    description: 'Auto-Sequenzen & Alerts',
    details: 'CFO-Dashboard',
    highlight: 'Vollständige Transparenz & Kontrolle',
    color: COLORS.discGreen,
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

const TARGET_AUDIENCE = [
  { emoji: '🔹', text: 'Networker & MLM-Leader' },
  { emoji: '🔹', text: 'Makler & Makler-Büros' },
  { emoji: '🔹', text: 'Coaches, Trainer & Dienstleister' },
  { emoji: '🔹', text: 'Alle mit ungenutzter Kontaktliste' },
];

const FAQ_ITEMS = [
  {
    question: 'Warum nicht einfach ChatGPT?',
    answer: 'ChatGPT ist wie ein Rohbau – FELLO ist das fertige Haus. Wir haben Compliance, Knowledge Base, Einwandbehandlung und Branding bereits integriert. Du musst nicht mehr programmieren, prompten oder Risiken eingehen.',
  },
  {
    question: 'Lohnt sich das für mich als Einzelperson?',
    answer: 'Wenn du 1-2 Stunden sparst oder 1 Deal mehr machst, hat sich FELLO bereits bezahlt gemacht. Die meisten Nutzer sehen ROI in der ersten Woche.',
  },
  {
    question: 'Ist FELLO kompliziert?',
    answer: 'Nein. Wenn du WhatsApp bedienen kannst, kannst du FELLO nutzen. Unser Setup dauert 10 Minuten, danach läuft alles automatisch.',
  },
  {
    question: 'Was nach 14 Tagen?',
    answer: 'FREE bleiben oder kündigen. Kein Risiko. Keine Kreditkarte nötig. Du entscheidest, ob FELLO für dich funktioniert.',
  },
  {
    question: 'Wie sicher sind meine Daten?',
    answer: 'Moderne, sichere Infrastruktur mit DSGVO-Konformität, EU-Servern und Enterprise-Security. Deine Kontakte und Gespräche bleiben privat und geschützt.',
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

// FELLO Feature Block (Alternating Layout)
const FelloFeatureBlock = ({ item, index }: { item: typeof FELLO_FEATURES[0]; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(index % 2 === 0 ? -50 : 50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const isEven = index % 2 === 0;
  
  return (
    <Animated.View 
      style={[
        styles.felloFeatureContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
        }
      ]}
    >
      <View style={[
        styles.felloFeatureBlock,
        isEven ? styles.felloFeatureLeft : styles.felloFeatureRight,
        { borderColor: item.color + '40' },
      ]}>
        {/* Icon Section */}
        <View style={[
          styles.felloIconSection,
          { backgroundColor: item.color + '15' },
        ]}>
          <Text style={styles.felloIcon}>{item.icon}</Text>
          <View style={[styles.felloIconGlow, { backgroundColor: item.color + '30' }]} />
        </View>
        
        {/* Content Section */}
        <View style={styles.felloContentSection}>
          <Text style={[styles.felloFeatureTitle, { color: item.color }]}>
            {item.title}
          </Text>
          <Text style={styles.felloFeatureDescription}>
            {item.description}
          </Text>
          <Text style={styles.felloFeatureDetails}>
            {item.details}
          </Text>
          <View style={[styles.felloHighlightBox, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
            <Text style={[styles.felloHighlightText, { color: item.color }]}>
              "{item.highlight}"
            </Text>
          </View>
        </View>
        
        {/* Decorative Accent */}
        <View style={[styles.felloAccentLine, { backgroundColor: item.color }]} />
      </View>
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

// FAQ Accordion Item
const FAQItem = ({ 
  item, 
  index 
}: { 
  item: typeof FAQ_ITEMS[0]; 
  index: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(heightAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);
  
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  const maxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });
  
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={styles.faqQuestionRow}
        activeOpacity={0.7}
      >
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={COLORS.primary} 
          />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View 
        style={[
          styles.faqAnswerContainer,
          {
            opacity: opacityAnim,
            maxHeight: maxHeight,
            overflow: 'hidden',
          }
        ]}
      >
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      </Animated.View>
    </View>
  );
};

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
  
  const handleSignUp = () => {
    navigation.navigate('Register');
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
              title="🚀 Login"
              onPress={handleLogin}
              variant="primary"
              icon="log-in-outline"
            />
            <GlowButton 
              title="Kostenlos starten"
              onPress={handleSignUp}
              variant="secondary"
              icon="person-add-outline"
            />
          </View>
          <View style={[styles.heroCTARow, { marginTop: 12 }]}>
            <GlowButton 
              title="Demo buchen"
              onPress={handleCTA}
              variant="outline"
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
      {/* FELLO FEATURES SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FELLO FEATURES</Text>
        <Text style={styles.sectionHeadline}>
          Was deine Sales-KI FELLO{'\n'}
          <Text style={{ color: COLORS.primary }}>für dich übernimmt</Text>
        </Text>
        
        <View style={styles.felloFeaturesContainer}>
          {FELLO_FEATURES.map((feature, i) => (
            <FelloFeatureBlock key={feature.id} item={feature} index={i} />
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
      {/* FÜR WEN SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <Text style={styles.sectionHeadline}>
          Wer profitiert am meisten von FELLO?
        </Text>
        
        <View style={styles.targetAudienceList}>
          {TARGET_AUDIENCE.map((item, i) => (
            <View key={i} style={styles.targetAudienceItem}>
              <Text style={styles.targetAudienceEmoji}>{item.emoji}</Text>
              <Text style={styles.targetAudienceText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FAQ SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: COLORS.bgCard }]}>
        <Text style={styles.sectionLabel}>FAQ</Text>
        <Text style={styles.sectionHeadline}>
          Häufige Fragen
        </Text>
        
        <View style={styles.faqContainer}>
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} index={i} />
          ))}
        </View>
      </View>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FINAL CTA SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={[COLORS.primary + '30', COLORS.primaryDark + '20', COLORS.bgDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.finalCtaSection}
      >
        <Text style={styles.finalCtaHeadline}>
          Deine Kontaktliste ist schon Gold – FELLO holt es nur raus.
        </Text>
        <Text style={styles.finalCtaText}>
          Du brauchst keine neuen Wunder-Strategien. Du brauchst nur ein System, das deine bestehenden Kontakte automatisch aktiviert und pflegt.
        </Text>
        <GlowButton 
          title="Jetzt FREE-Account erstellen"
          onPress={handleSignUp}
          variant="primary"
          icon="rocket-outline"
          size="large"
        />
        <Text style={styles.finalCtaTrust}>
          14 Tage testen. Keine Kreditkarte.
        </Text>
      </LinearGradient>
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.footer}>
        <Text style={styles.footerLogo}>FELLO</Text>
        
        <View style={styles.footerLinks}>
          <View style={styles.footerLinkColumn}>
            <Text style={styles.footerLinkTitle}>Features</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.footerLink}>Live Assist</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.footerLink}>Einwand-Brain</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.footerLink}>Knowledge Base</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footerLinkColumn}>
            <Text style={styles.footerLinkTitle}>Unternehmen</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.footerLink}>Pricing</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.footerLink}>FAQ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.footerLink}>Blog</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.footerLink}>Kontakt</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footerLinkColumn}>
            <Text style={styles.footerLinkTitle}>Legal</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Impressum')}>
              <Text style={styles.footerLink}>Impressum</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Datenschutz')}>
              <Text style={styles.footerLink}>Datenschutz</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('AGB')}>
              <Text style={styles.footerLink}>AGB</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.footerSocial}>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://linkedin.com/company/fello')}
            style={styles.footerSocialIcon}
          >
            <Ionicons name="logo-linkedin" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://instagram.com/fello')}
            style={styles.footerSocialIcon}
          >
            <Ionicons name="logo-instagram" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.footerCopyright}>
          © 2024 FELLO
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
  
  // Target Audience
  targetAudienceList: {
    maxWidth: 600,
    alignSelf: 'center',
    gap: 16,
  },
  targetAudienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  targetAudienceEmoji: {
    fontSize: 20,
  },
  targetAudienceText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  
  // FAQ
  faqContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  faqItem: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.textMuted + '20',
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  faqQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  faqAnswerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  faqAnswer: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  
  // Final CTA
  finalCtaSection: {
    paddingVertical: 100,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  finalCtaHeadline: {
    fontSize: isWeb ? 42 : 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: isWeb ? 52 : 36,
  },
  finalCtaText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 700,
    marginBottom: 40,
  },
  finalCtaTrust: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  
  // Footer
  footer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.textMuted + '20',
    backgroundColor: COLORS.bgCard,
  },
  footerLogo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  footerLinks: {
    flexDirection: isWeb ? 'row' : 'column',
    justifyContent: 'center',
    gap: isWeb ? 60 : 32,
    marginBottom: 40,
    flexWrap: 'wrap',
  },
  footerLinkColumn: {
    alignItems: isWeb ? 'flex-start' : 'center',
    minWidth: 150,
  },
  footerLinkTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  footerSocial: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
  },
  footerSocialIcon: {
    padding: 8,
  },
  footerCopyright: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
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
  
  // FELLO Features
  felloFeaturesContainer: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  felloFeatureContainer: {
    marginBottom: 48,
  },
  felloFeatureBlock: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: isWeb ? 32 : 24,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: isWeb ? 'row' : 'column',
    alignItems: isWeb ? 'center' : 'flex-start',
    gap: 32,
    minHeight: isWeb ? 200 : 'auto',
  },
  felloFeatureLeft: {
    flexDirection: isWeb ? 'row' : 'column',
  },
  felloFeatureRight: {
    flexDirection: isWeb ? 'row-reverse' : 'column',
  },
  felloIconSection: {
    width: isWeb ? 120 : 100,
    height: isWeb ? 120 : 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    alignSelf: isWeb ? 'auto' : 'center',
  },
  felloIcon: {
    fontSize: 56,
    zIndex: 2,
  },
  felloIconGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    opacity: 0.5,
  },
  felloContentSection: {
    flex: 1,
    gap: 12,
    width: isWeb ? 'auto' : '100%',
  },
  felloFeatureTitle: {
    fontSize: isWeb ? 28 : 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  felloFeatureDescription: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
    lineHeight: 24,
  },
  felloFeatureDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  felloHighlightBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  felloHighlightText: {
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  felloAccentLine: {
    position: 'absolute',
    width: 4,
    height: '100%',
    left: 0,
    top: 0,
  },
});

