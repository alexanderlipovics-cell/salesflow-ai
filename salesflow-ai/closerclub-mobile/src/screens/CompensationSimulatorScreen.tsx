import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../config/theme';

interface TeamMember {
  id: string;
  name: string;
  rank: string;
  personal_volume: number;
  group_volume?: number;
}

export default function CompensationSimulatorScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [companyId, setCompanyId] = useState('');
  const [userName, setUserName] = useState('');
  const [userRank, setUserRank] = useState('');
  const [userPersonalVolume, setUserPersonalVolume] = useState('');
  const [userGroupVolume, setUserGroupVolume] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const handleCalculate = async () => {
    if (!companyId || !userName) {
      Alert.alert('Fehler', 'Bitte fülle alle Pflichtfelder aus');
      return;
    }

    setCalculating(true);
    setResult(null);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/compensation/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          user: {
            id: session?.user?.id || 'user-1',
            name: userName,
            rank: userRank || 'Distributor',
            personal_volume: parseFloat(userPersonalVolume) || 0,
            group_volume: parseFloat(userGroupVolume) || 0,
          },
          team: teamMembers.filter(m => m.name && m.personal_volume > 0),
        }),
      });

      if (!response.ok) {
        throw new Error('Berechnung fehlgeschlagen');
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      Alert.alert('Fehler', error.message || 'Fehler bei der Berechnung');
    } finally {
      setCalculating(false);
    }
  };

  const handleAddTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      {
        id: `team-${Date.now()}`,
        name: '',
        rank: '',
        personal_volume: 0,
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Compensation Simulator</Text>
        <Text style={styles.subtitle}>Berechne deine Provisionen</Text>

        {/* Company Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Firma *</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. herbalife, doterra"
            value={companyId}
            onChangeText={setCompanyId}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* User Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deine Daten</Text>
          
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Max Mustermann"
            value={userName}
            onChangeText={setUserName}
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.label}>Rang</Text>
          <TextInput
            style={styles.input}
            placeholder="Supervisor"
            value={userRank}
            onChangeText={setUserRank}
            placeholderTextColor={COLORS.textSecondary}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Personal Volume</Text>
              <TextInput
                style={styles.input}
                placeholder="500"
                value={userPersonalVolume}
                onChangeText={setUserPersonalVolume}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Group Volume</Text>
              <TextInput
                style={styles.input}
                placeholder="3500"
                value={userGroupVolume}
                onChangeText={setUserGroupVolume}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Team Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team-Mitglieder</Text>
            <TouchableOpacity onPress={handleAddTeamMember} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Hinzufügen</Text>
            </TouchableOpacity>
          </View>

          {teamMembers.map((member, index) => (
            <View key={member.id} style={styles.teamMemberCard}>
              <Text style={styles.teamMemberTitle}>Mitglied #{index + 1}</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={member.name}
                onChangeText={(text) => {
                  const updated = [...teamMembers];
                  updated[index].name = text;
                  setTeamMembers(updated);
                }}
                placeholderTextColor={COLORS.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Rang"
                value={member.rank}
                onChangeText={(text) => {
                  const updated = [...teamMembers];
                  updated[index].rank = text;
                  setTeamMembers(updated);
                }}
                placeholderTextColor={COLORS.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Personal Volume"
                value={member.personal_volume.toString()}
                onChangeText={(text) => {
                  const updated = [...teamMembers];
                  updated[index].personal_volume = parseFloat(text) || 0;
                  setTeamMembers(updated);
                }}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
              <TouchableOpacity
                onPress={() => {
                  setTeamMembers(teamMembers.filter((_, i) => i !== index));
                }}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>Entfernen</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          onPress={handleCalculate}
          disabled={calculating || !companyId || !userName}
          style={[styles.calculateButton, (calculating || !companyId || !userName) && styles.calculateButtonDisabled]}
        >
          {calculating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.calculateButtonText}>Provisionen berechnen</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Ergebnisse</Text>
            
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Total Earnings</Text>
              <Text style={styles.resultValue}>{result.total_earnings?.toFixed(2)} €</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Total Volume</Text>
              <Text style={styles.resultValue}>{result.total_volume?.toFixed(0)} PV</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Qualifizierter Rang</Text>
              <Text style={styles.resultValue}>{result.rank}</Text>
            </View>

            {result.commissions && result.commissions.length > 0 && (
              <View style={styles.commissionsSection}>
                <Text style={styles.commissionsTitle}>Commission Breakdown</Text>
                {result.commissions.map((comm: any, idx: number) => (
                  <View key={idx} style={styles.commissionItem}>
                    <Text style={styles.commissionType}>{comm.type}</Text>
                    <Text style={styles.commissionAmount}>{comm.amount?.toFixed(2)} €</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  teamMemberCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  teamMemberTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  removeButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 14,
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  calculateButtonDisabled: {
    opacity: 0.5,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    marginTop: 24,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  commissionsSection: {
    marginTop: 16,
  },
  commissionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  commissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commissionType: {
    fontSize: 14,
    color: COLORS.text,
  },
  commissionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

