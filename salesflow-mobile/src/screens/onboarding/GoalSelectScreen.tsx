import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { saveGoal } from '../../services/onboarding';

const GOALS = [
  {
    id: 'TEAM',
    label: 'Teamaufbau',
    description: 'Neue Partner gewinnen und ein starkes Team aufbauen',
    icon: 'people',
    color: COLORS.primary,
  },
  {
    id: 'CUSTOMER',
    label: 'Kundengewinnung',
    description: 'Mehr Kunden für deine Produkte gewinnen',
    icon: 'cart',
    color: COLORS.secondary,
  },
  {
    id: 'BOTH',
    label: 'Beides',
    description: 'Sowohl Team aufbauen als auch Kunden gewinnen',
    icon: 'rocket',
    color: COLORS.accent,
  },
];

export default function GoalSelectScreen({ navigation }: any) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const handleContinue = async () => {
    if (selectedGoal) {
      await saveGoal(selectedGoal);
      navigation.navigate('MagicMoment');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.stepText}>Schritt 2 von 2</Text>
          <Text style={styles.title}>Was ist dein Hauptziel?</Text>
          <Text style={styles.subtitle}>
            Wir personalisieren deine Erfahrung basierend auf deinem Fokus
          </Text>
        </View>

        <View style={styles.goalsContainer}>
          {GOALS.map((goal) => {
            const isSelected = selectedGoal === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  isSelected && { borderColor: goal.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedGoal(goal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.goalContent}>
                  <View 
                    style={[
                      styles.goalIcon, 
                      { backgroundColor: goal.color + '20' }
                    ]}
                  >
                    <Ionicons 
                      name={goal.icon as any} 
                      size={28} 
                      color={goal.color} 
                    />
                  </View>
                  <View style={styles.goalTextContainer}>
                    <Text style={styles.goalLabel}>{goal.label}</Text>
                    <Text style={styles.goalDescription}>{goal.description}</Text>
                  </View>
                </View>
                <View style={styles.radioContainer}>
                  <View 
                    style={[
                      styles.radioOuter,
                      isSelected && { borderColor: goal.color },
                    ]}
                  >
                    {isSelected && (
                      <View 
                        style={[styles.radioInner, { backgroundColor: goal.color }]} 
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedGoal && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedGoal}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              selectedGoal 
                ? [COLORS.primary, COLORS.primaryDark] 
                : [COLORS.card, COLORS.card]
            }
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text 
              style={[
                styles.buttonText,
                !selectedGoal && styles.buttonTextDisabled,
              ]}
            >
              Fertigstellen
            </Text>
            <Ionicons 
              name="checkmark" 
              size={20} 
              color={selectedGoal ? COLORS.text : COLORS.textMuted} 
            />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.card,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  titleSection: {
    marginBottom: SPACING.xl,
  },
  stepText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  goalsContainer: {
    gap: SPACING.md,
  },
  goalCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  goalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  radioContainer: {
    marginLeft: SPACING.md,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  continueButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.6,
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
  buttonTextDisabled: {
    color: COLORS.textMuted,
  },
});

