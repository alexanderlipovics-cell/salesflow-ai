import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { api } from '../services/api';

interface ProfileScreenProps {
  onLogout: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoFollowup, setAutoFollowup] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      console.log('Error loading user:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Abmelden', 
          style: 'destructive',
          onPress: async () => {
            await api.logout();
            onLogout();
          }
        },
      ]
    );
  };

  const MenuItem = ({ icon, label, onPress, danger = false }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && styles.dangerText]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  const ToggleItem = ({ icon, label, value, onValueChange }: any) => (
    <View style={styles.menuItem}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#374151', true: '#06B6D4' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.first_name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'USER'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>21</Text>
          <Text style={styles.statLabel}>Leads</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>5%</Text>
          <Text style={styles.statLabel}>Conversion</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>1</Text>
          <Text style={styles.statLabel}>Deals</Text>
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Einstellungen</Text>
        <View style={styles.menuCard}>
          <ToggleItem
            icon="🔔"
            label="Push-Benachrichtigungen"
            value={notifications}
            onValueChange={setNotifications}
          />
          <ToggleItem
            icon="🌙"
            label="Dark Mode"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <ToggleItem
            icon="🤖"
            label="Auto Follow-up"
            value={autoFollowup}
            onValueChange={setAutoFollowup}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="👤" label="Profil bearbeiten" onPress={() => {}} />
          <MenuItem icon="🔒" label="Passwort ändern" onPress={() => {}} />
          <MenuItem icon="💳" label="Abo verwalten" onPress={() => {}} />
          <MenuItem icon="📊" label="Statistiken" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="❓" label="Hilfe & FAQ" onPress={() => {}} />
          <MenuItem icon="💬" label="Feedback senden" onPress={() => {}} />
          <MenuItem icon="📄" label="Datenschutz" onPress={() => {}} />
          <MenuItem icon="📋" label="AGB" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.menuCard}>
          <MenuItem 
            icon="🚪" 
            label="Abmelden" 
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      <Text style={styles.version}>AlSales Mobile v1.0.0</Text>
      
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A202C',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#06B6D4',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#374151',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuCard: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  menuArrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  dangerText: {
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 32,
  },
  bottomPadding: {
    height: 120,
  },
});

