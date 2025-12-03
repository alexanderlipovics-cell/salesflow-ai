// screens/ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Switch, TouchableOpacity } from 'react-native';
import { UserSettings } from '../../api/mockApi';
import { useSalesFlow } from '../../context/SalesFlowContext';
import { AVAILABLE_COMPANIES } from '../../api/mockApi';
import { logger } from '../../utils/logger';

export default function ProfileScreen() {
  const { profileData, loading, refetchProfile, updateProfile } = useSalesFlow();
  const [settingsState, setSettingsState] = useState<UserSettings | null>(
    profileData?.settings || null
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Update local settings when profileData changes
  useEffect(() => {
    if (profileData?.settings) {
      setSettingsState(profileData.settings);
    }
  }, [profileData]);

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettingsState(prev => prev ? ({ ...prev, [key]: value }) : null);
    logger.debug(`Setting ${key} updated locally to:`, value);
  };

  const handleCompanyChange = async (companyName: string) => {
    setIsDropdownOpen(false);
    await updateProfile({ default_company_name: companyName });
  };

  if (loading.profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00BCD4" />
        <Text style={styles.loadingText}>Lade Profil...</Text>
      </View>
    );
  }

  if (!profileData || !settingsState) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>⚠️ Keine Profil-Daten verfügbar.</Text>
        <TouchableOpacity onPress={refetchProfile} style={styles.refetchButton}>
          <Text style={styles.refetchButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user } = profileData;
  const currentCompany = settingsState.default_company_name;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Profil Übersicht</Text>

      {/* User Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Persönliche Daten</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{user.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ID:</Text>
          <Text style={styles.infoValue}>{user.id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>E-Mail:</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>
      </View>

      {/* Settings Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Standard-Einstellungen</Text>

        <Text style={styles.settingLabel}>Standard-Unternehmen für Leads:</Text>
        
        {/* Custom Dropdown */}
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Text style={styles.dropdownText}>{currentCompany}</Text>
          <Text style={styles.dropdownIcon}>{isDropdownOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* Dropdown List */}
        {isDropdownOpen && (
          <View style={styles.dropdownList}>
            {AVAILABLE_COMPANIES.filter(c => c !== currentCompany).map(company => (
              <TouchableOpacity 
                key={company}
                style={styles.dropdownItem}
                onPress={() => handleCompanyChange(company)}
              >
                <Text style={styles.dropdownItemText}>{company}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tagesziel</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Tägliche Kontakte</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(settingsState.daily_goal_contacts)}
            onChangeText={(text) => handleSettingChange('daily_goal_contacts', parseInt(text) || 0)}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Benachrichtigungen</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Benachrichtigungen</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#00BCD4" }}
            thumbColor={settingsState.notifications_enabled ? "#fff" : "#f4f3f4"}
            onValueChange={(value) => handleSettingChange('notifications_enabled', value)}
            value={settingsState.notifications_enabled}
          />
        </View>
      </View>
      
      <View style={{ height: 50 }} /> {/* Platzhalter am Ende */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#607D8B',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 28,
    fontWeight: '900',
    color: '#333',
    marginBottom: 20,
  },
  
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 12,
  },
  
  // Info Row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#607D8B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Settings
  settingLabel: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 8,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  
  // Dropdown
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dropdownIcon: {
    fontSize: 16,
    color: '#607D8B',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: '#fff',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    padding: 5,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
  },
  refetchButton: {
    backgroundColor: '#00BCD4',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  refetchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
