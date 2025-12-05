import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/colors';
import { saveCompany } from '../../services/onboarding';

const COMPANIES = [
  { id: 'LR', label: 'LR Health', icon: 'leaf-outline', color: '#22c55e' },
  { id: 'ZINZINO', label: 'Zinzino', icon: 'water-outline', color: '#3b82f6' },
  { id: 'HERBALIFE', label: 'Herbalife', icon: 'restaurant-outline', color: '#22c55e' },
  { id: 'AMWAY', label: 'Amway', icon: 'home-outline', color: '#3b82f6' },
  { id: 'DOTERRA', label: 'doTERRA', icon: 'flower-outline', color: '#a855f7' },
  { id: 'GENERAL', label: 'Andere', icon: 'grid-outline', color: '#71717a' },
];

export default function CompanySelectScreen({ navigation }: any) {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const handleContinue = async () => {
    if (selectedCompany) {
      await saveCompany(selectedCompany);
      navigation.navigate('GoalSelect');
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
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleSection}>
          <Text style={styles.stepText}>Schritt 1 von 2</Text>
          <Text style={styles.title}>Mit welcher Firma arbeitest du?</Text>
          <Text style={styles.subtitle}>
            Wir optimieren deine Scripts und Tipps für dein Unternehmen
          </Text>
        </View>

        <View style={styles.companiesGrid}>
          {COMPANIES.map((company) => {
            const isSelected = selectedCompany === company.id;
            return (
              <TouchableOpacity
                key={company.id}
                style={[
                  styles.companyCard,
                  isSelected && { borderColor: company.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedCompany(company.id)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: company.color }]}>
                    <Ionicons name="checkmark" size={14} color={COLORS.text} />
                  </View>
                )}
                <View 
                  style={[
                    styles.companyIcon, 
                    { backgroundColor: company.color + '20' }
                  ]}
                >
                  <Ionicons 
                    name={company.icon as any} 
                    size={32} 
                    color={company.color} 
                  />
                </View>
                <Text style={styles.companyLabel}>{company.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedCompany && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedCompany}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              selectedCompany 
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
                !selectedCompany && styles.buttonTextDisabled,
              ]}
            >
              Weiter
            </Text>
            <Ionicons 
              name="arrow-forward" 
              size={20} 
              color={selectedCompany ? COLORS.text : COLORS.textMuted} 
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
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
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
  companiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  companyCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    ...SHADOWS.small,
  },
  checkBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyIcon: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  companyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
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

