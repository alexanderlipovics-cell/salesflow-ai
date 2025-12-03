/**
 * STEP 1: COMPANY SELECT
 * 
 * Erste Seite des Goal Wizards.
 * User wählt seine MLM-Firma aus.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface CompanyOption {
  id: string;
  name: string;
  logo: string;
}

interface StepCompanySelectProps {
  companies: CompanyOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const StepCompanySelect: React.FC<StepCompanySelectProps> = ({
  companies,
  selectedId,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mit welcher Firma arbeitest du?</Text>
      <Text style={styles.subtitle}>
        Das hilft uns, deinen Compensation Plan korrekt zu berechnen.
      </Text>

      <View style={styles.grid}>
        {companies.map((company) => (
          <TouchableOpacity
            key={company.id}
            style={[
              styles.card,
              selectedId === company.id && styles.cardSelected,
            ]}
            onPress={() => onSelect(company.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.logo}>{company.logo}</Text>
            <Text style={[
              styles.name,
              selectedId === company.id && styles.nameSelected,
            ]}>
              {company.name}
            </Text>
            {selectedId === company.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Hinweis */}
      <View style={styles.hint}>
        <Text style={styles.hintIcon}>💡</Text>
        <Text style={styles.hintText}>
          Deine Firma ist nicht dabei? Wir arbeiten daran, weitere Firmen hinzuzufügen.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: '47%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
    position: 'relative',
  },
  cardSelected: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  logo: {
    fontSize: 40,
    marginBottom: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  nameSelected: {
    color: '#06b6d4',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  hintIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#fbbf24',
    lineHeight: 18,
  },
});

export default StepCompanySelect;

