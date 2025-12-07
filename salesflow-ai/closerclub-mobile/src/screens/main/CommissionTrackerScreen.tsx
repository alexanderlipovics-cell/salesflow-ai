import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  SafeAreaView,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { mobileApi } from '../../services/api';

// --- TYPES ---

type CommissionStatus = 'paid' | 'pending' | 'overdue';

interface Commission {
  id: string;
  dealName: string;
  dealValue: number;
  commissionRate: number; // in percent
  commissionAmount: number;
  status: CommissionStatus;
  date: string;
}

interface CommissionSummary {
  gross: number;
  net: number;
  tax: number;
  openAmount: number;
}

// --- MOCK DATA / UTILS ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const getStatusColor = (status: CommissionStatus) => {
  switch (status) {
    case 'paid': return '#4CAF50'; // Green
    case 'overdue': return '#F44336'; // Red
    default: return '#FFC107'; // Yellow/Amber
  }
};

const getStatusLabel = (status: CommissionStatus) => {
  switch (status) {
    case 'paid': return 'Bezahlt';
    case 'overdue': return 'Überfällig';
    default: return 'Offen';
  }
};

// --- COMPONENT ---

export const CommissionTrackerScreen = () => {
  const navigation = useNavigation();

  // State
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');

  // API Call - Echte Daten vom Backend
  const fetchCommissions = useCallback(async () => {
    try {
      setLoading(true);
      const monthStr = selectedDate.toISOString().slice(0, 7); // YYYY-MM
      
      // API Calls parallel ausführen
      const [commissionsData, summaryData] = await Promise.all([
        mobileApi.getCommissions({
          month: monthStr,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        mobileApi.getCommissionSummary(monthStr),
      ]);

      // Daten transformieren
      const transformedCommissions: Commission[] = commissionsData.map((c) => ({
        id: c.id,
        dealName: c.deal_name,
        dealValue: c.deal_value,
        commissionRate: c.commission_rate,
        commissionAmount: c.commission_amount,
        status: c.status,
        date: c.date,
      }));

      setCommissions(transformedCommissions);
      setSummary(summaryData);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      Alert.alert('Fehler', 'Daten konnten nicht geladen werden.');
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommissions();
  };

  // Actions
  const handleDownloadInvoice = async (id: string) => {
    try {
      const blob = await mobileApi.downloadCommissionInvoice(id);
      // TODO: Blob zu Datei speichern und Share API nutzen
      Alert.alert('Download', `Rechnung für #${id} wird heruntergeladen...`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Fehler', 'Rechnung konnte nicht heruntergeladen werden.');
    }
  };

  const handleSendToAccounting = async (id: string) => {
    Alert.alert(
      'Buchhaltung',
      'Möchten Sie diese Provision an die Buchhaltung senden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Senden', 
          onPress: async () => {
            try {
              const result = await mobileApi.sendCommissionToAccounting(id);
              Alert.alert('Erfolg', result.message || 'E-Mail wurde versendet.');
            } catch (error) {
              console.error('Error sending to accounting:', error);
              Alert.alert('Fehler', 'E-Mail konnte nicht versendet werden.');
            }
          } 
        }
      ]
    );
  };

  // --- RENDER HELPERS ---

  const renderSummaryCard = (title: string, amount: number, color: string = '#333') => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]}>{formatCurrency(amount)}</Text>
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Month Filter Header */}
      <View style={styles.filterHeader}>
        <Text style={styles.screenTitle}>Commission Tracker</Text>
        <TouchableOpacity 
          style={styles.dateSelector} 
          onPress={() => setShowDatePicker(true)}
        >
          <MaterialCommunityIcons name="calendar" size={20} color="#007AFF" />
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards Scroll */}
      {summary && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { title: 'Gesamt (Brutto)', val: summary.gross, col: '#333' },
            { title: 'Netto', val: summary.net, col: '#4CAF50' },
            { title: 'Steuer', val: summary.tax, col: '#757575' },
            { title: 'Offen', val: summary.openAmount, col: '#FFC107' },
          ]}
          keyExtractor={(item) => item.title}
          contentContainerStyle={styles.summaryContainer}
          renderItem={({ item }) => renderSummaryCard(item.title, item.val, item.col)}
        />
      )}

      <Text style={styles.sectionHeader}>Transaktionen</Text>
    </View>
  );

  const renderRightActions = (id: string) => {
    return (
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#E0E0E0' }]} 
          onPress={() => handleDownloadInvoice(id)}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={24} color="#333" />
          <Text style={styles.actionText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#E3F2FD' }]} 
          onPress={() => handleSendToAccounting(id)}
        >
          <MaterialCommunityIcons name="email-send-outline" size={24} color="#007AFF" />
          <Text style={styles.actionText}>Senden</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Commission }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dealName}>{item.dealName}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.label}>Dealwert</Text>
            <Text style={styles.value}>{formatCurrency(item.dealValue)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Prov. %</Text>
            <Text style={styles.value}>{item.commissionRate}%</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Provision</Text>
            <Text style={styles.highlightValue}>{formatCurrency(item.commissionAmount)}</Text>
          </View>
        </View>
      </View>
    </Swipeable>
  );

  // --- MAIN RENDER ---

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={commissions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Keine Provisionen für diesen Monat.</Text>
          </View>
        }
      />

      {/* FAB: Neue Provision */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => Alert.alert('TODO', 'Navigiere zu NewCommissionScreen')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Date Picker Modal (Platform Specific Handling usually required) */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}
    </SafeAreaView>
  );
};

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
  // Header Area
  filterHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 8,
  },
  dateText: {
    marginLeft: 6,
    color: '#007AFF',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  // Summary Cards
  summaryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // List Items
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#444',
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  // Swipe Actions
  actionContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    marginRight: 16,
  },
  actionButton: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  // Empty State & FAB
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});

export default CommissionTrackerScreen;

