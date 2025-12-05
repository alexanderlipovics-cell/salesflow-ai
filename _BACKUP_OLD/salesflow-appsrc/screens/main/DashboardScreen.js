import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const API_URL = 'http://localhost:8000';

export default function DashboardScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.log('API not available:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const quickActions = [
    { icon: '📚', title: 'Playbooks', screen: 'Playbooks', color: '#3b82f6' },
    { icon: '👥', title: 'Leads', screen: 'Leads', color: '#10b981' },
    { icon: '💬', title: 'AI Chat', screen: 'Chat', color: '#8b5cf6' },
    { icon: '📊', title: 'Analytics', screen: 'Analytics', color: '#f59e0b' },
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Guten Tag! 👋</Text>
          <Text style={styles.userName}>{user?.email || 'Sales Pro'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>🚀 System Status</Text>
        {stats ? (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Backend:</Text>
            <Text style={styles.statusValue}>✅ {stats.status}</Text>
          </View>
        ) : (
          <Text style={styles.statusOffline}>⚠️ Backend nicht erreichbar</Text>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionCard, { borderLeftColor: action.color }]}
            onPress={() => navigation.navigate(action.screen)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Preview */}
      <Text style={styles.sectionTitle}>Heute</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Neue Leads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Follow-ups</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Abschlüsse</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#3b82f6',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    color: '#64748b',
  },
  statusValue: {
    color: '#10b981',
    fontWeight: '600',
  },
  statusOffline: {
    color: '#f59e0b',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    color: '#1e293b',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  actionCard: {
    backgroundColor: 'white',
    width: '45%',
    margin: '2.5%',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    margin: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});