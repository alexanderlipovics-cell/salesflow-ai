import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { getMagicScript, completeOnboarding, getSelectedCompany, getSelectedGoal } from '../../services/onboarding';

export default function MagicMomentScreen({ navigation }: any) {
  const [script, setScript] = useState('');
  const [companyLabel, setCompanyLabel] = useState('');
  const [goalLabel, setGoalLabel] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti] = useState(new Animated.Value(0));

  useEffect(() => {
    loadScript();
    // Confetti animation
    Animated.timing(showConfetti, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadScript = async () => {
    const company = await getSelectedCompany();
    const goal = await getSelectedGoal();
    const magicScript = getMagicScript(company || 'GENERAL', goal || 'BOTH');
    setScript(magicScript);
    
    // Set labels
    const companyLabels: Record<string, string> = {
      LR: 'LR Health',
      ZINZINO: 'Zinzino',
      HERBALIFE: 'Herbalife',
      AMWAY: 'Amway',
      DOTERRA: 'doTERRA',
      GENERAL: 'Network Marketing',
    };
    const goalLabels: Record<string, string> = {
      TEAM: 'Teamaufbau',
      CUSTOMER: 'Kundengewinnung',
      BOTH: 'Team & Kunden',
    };
    setCompanyLabel(companyLabels[company || 'GENERAL']);
    setGoalLabel(goalLabels[goal || 'BOTH']);
  };

  const handleCopyScript = async () => {
    await Clipboard.setStringAsync(script);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = async () => {
    await completeOnboarding();
    // Reset navigation to MainTabs
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <Animated.View 
          style={[
            styles.successSection,
            {
              opacity: showConfetti,
              transform: [
                {
                  scale: showConfetti.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.successIcon}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={48} color={COLORS.text} />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>Perfekt eingerichtet! 🎉</Text>
          <Text style={styles.successSubtitle}>
            SalesFlow ist jetzt für {companyLabel} und {goalLabel} optimiert
          </Text>
        </Animated.View>

        {/* Magic Script Card */}
        <View style={styles.scriptSection}>
          <View style={styles.scriptHeader}>
            <View style={styles.scriptTitleRow}>
              <Ionicons name="flash" size={20} color={COLORS.warning} />
              <Text style={styles.scriptTitle}>Dein erstes Script</Text>
            </View>
            <Text style={styles.scriptHint}>
              Hier ist ein perfekter Einstieg für dein erstes Gespräch
            </Text>
          </View>

          <View style={styles.scriptCard}>
            <Text style={styles.scriptText}>{script}</Text>
          </View>

          <TouchableOpacity
            style={[styles.copyButton, copied && styles.copyButtonSuccess]}
            onPress={handleCopyScript}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={copied ? 'checkmark' : 'copy-outline'} 
              size={20} 
              color={copied ? COLORS.success : COLORS.text} 
            />
            <Text 
              style={[
                styles.copyButtonText,
                copied && styles.copyButtonTextSuccess,
              ]}
            >
              {copied ? 'Kopiert!' : 'Script kopieren'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* What's Next */}
        <View style={styles.nextSection}>
          <Text style={styles.nextTitle}>Das erwartet dich</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureLabel}>KI Sales Coach</Text>
                <Text style={styles.featureDescription}>
                  Frag alles zu Verkauf & Einwänden
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                <Ionicons name="document-text" size={20} color={COLORS.secondary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureLabel}>100+ Scripts</Text>
                <Text style={styles.featureDescription}>
                  Bewährte Vorlagen für jede Situation
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: COLORS.accent + '20' }]}>
                <Ionicons name="trending-up" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureLabel}>Lead Tracking</Text>
                <Text style={styles.featureDescription}>
                  Organisiere deine Kontakte effizient
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>SalesFlow starten</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  scriptSection: {
    marginBottom: SPACING.xl,
  },
  scriptHeader: {
    marginBottom: SPACING.md,
  },
  scriptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  scriptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scriptHint: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  scriptCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.small,
  },
  scriptText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  copyButtonSuccess: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  copyButtonTextSuccess: {
    color: COLORS.success,
  },
  nextSection: {
    marginBottom: SPACING.lg,
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  featuresList: {
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  startButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
});

