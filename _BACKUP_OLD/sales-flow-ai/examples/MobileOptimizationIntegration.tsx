/**
 * Mobile Optimization Integration Example
 * 
 * Zeigt wie man alle Mobile Features in eine App integriert
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

// Services
import OfflineService from '../services/OfflineService';
import NotificationService from '../services/NotificationService';
import HapticService from '../services/HapticService';

// Components
import VoiceInput from '../components/VoiceInput';
import BusinessCardScanner from '../components/BusinessCardScanner';

// Utils
import { debounce } from '../utils/performance';
import { parseDeepLink } from '../config/deepLinking';

/**
 * Example: Lead Form mit allen Mobile Features
 */
export default function EnhancedLeadForm() {
  const router = useRouter();
  const [leadData, setLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });
  const [isOnline, setIsOnline] = useState(true);

  // ==========================================
  // 1. INITIALIZATION - Setup on App Start
  // ==========================================
  useEffect(() => {
    initializeMobileFeatures();
  }, []);

  const initializeMobileFeatures = async () => {
    // Register Push Notifications
    await NotificationService.registerForPushNotifications();

    // Setup Notification Click Handler
    NotificationService.setupNotificationListener((notification) => {
      console.log('Notification tapped:', notification);
      HapticService.light();
      
      // Navigate based on notification data
      if (notification.request.content.data.leadId) {
        router.push(`/lead-detail?leadId=${notification.request.content.data.leadId}`);
      }
    });

    // Setup Deep Linking
    const handleDeepLink = ({ url }: { url: string }) => {
      const parsed = parseDeepLink(url);
      if (parsed) {
        HapticService.medium();
        router.push(parsed.screen);
      }
    };

    Linking.addEventListener('url', handleDeepLink);

    // Check initial URL (if app opened via deep link)
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      handleDeepLink({ url: initialUrl });
    }

    // Check online status
    setIsOnline(OfflineService.isOnlineNow());
  };

  // ==========================================
  // 2. OFFLINE MODE - Queue Actions
  // ==========================================
  const saveLead = async () => {
    HapticService.medium();

    try {
      if (OfflineService.isOnlineNow()) {
        // Online: Direct API call
        const response = await fetch('http://localhost:8000/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        });

        if (response.ok) {
          HapticService.success();
          alert('Lead gespeichert!');
        }
      } else {
        // Offline: Queue for later sync
        await OfflineService.queueAction({
          type: 'create_lead',
          endpoint: 'http://localhost:8000/api/leads',
          method: 'POST',
          data: leadData,
          timestamp: Date.now(),
        });

        // Cache locally
        await OfflineService.cacheData('pending_lead', leadData);

        HapticService.success();
        alert('Lead offline gespeichert - wird synchronisiert sobald Internet verfügbar');
      }
    } catch (error) {
      HapticService.error();
      console.error('Failed to save lead:', error);
    }
  };

  // ==========================================
  // 3. VOICE INPUT - Speech to Text
  // ==========================================
  const handleVoiceNotes = (text: string) => {
    HapticService.light();
    setLeadData({ ...leadData, notes: leadData.notes + ' ' + text });
  };

  // ==========================================
  // 4. CAMERA - Business Card Scanner
  // ==========================================
  const handleBusinessCardScan = (scannedData: any) => {
    HapticService.success();
    
    setLeadData({
      ...leadData,
      name: scannedData.name || leadData.name,
      email: scannedData.email || leadData.email,
      phone: scannedData.phone || leadData.phone,
      company: scannedData.company || leadData.company,
    });

    alert('Visitenkarte gescannt!');
  };

  // ==========================================
  // 5. PERFORMANCE - Debounced Search
  // ==========================================
  const handleSearchCompany = debounce(async (query: string) => {
    if (query.length < 3) return;

    // Search company database
    const cachedResults = await OfflineService.getCachedData(`company_${query}`);
    
    if (cachedResults) {
      console.log('Using cached results');
      return cachedResults;
    }

    // Fetch from API
    const response = await fetch(`http://localhost:8000/api/companies/search?q=${query}`);
    const results = await response.json();

    // Cache results
    await OfflineService.cacheData(`company_${query}`, results);
    
    return results;
  }, 300);

  // ==========================================
  // 6. PUSH NOTIFICATIONS - Schedule Reminder
  // ==========================================
  const scheduleFollowUp = async () => {
    HapticService.medium();

    await NotificationService.scheduleReminder(leadData.name, 60); // 60 Minuten

    alert(`Follow-up Reminder für ${leadData.name} in 60 Minuten gesetzt`);
  };

  // ==========================================
  // UI RENDERING
  // ==========================================
  return (
    <View style={styles.container}>
      {/* Online/Offline Status */}
      <View style={[styles.statusBar, isOnline ? styles.online : styles.offline]}>
        <Text style={styles.statusText}>
          {isOnline ? '🟢 Online' : '🔴 Offline - Änderungen werden synchronisiert'}
        </Text>
      </View>

      {/* Business Card Scanner */}
      <BusinessCardScanner onScan={handleBusinessCardScan} />

      {/* Lead Form */}
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={leadData.name}
        onChangeText={(text) => {
          HapticService.selection();
          setLeadData({ ...leadData, name: text });
        }}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={leadData.email}
        onChangeText={(text) => setLeadData({ ...leadData, email: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefon"
        value={leadData.phone}
        onChangeText={(text) => setLeadData({ ...leadData, phone: text })}
      />

      <TextInput
        style={styles.input}
        placeholder="Firma"
        value={leadData.company}
        onChangeText={(text) => {
          setLeadData({ ...leadData, company: text });
          handleSearchCompany(text);
        }}
      />

      {/* Notes with Voice Input */}
      <View style={styles.notesContainer}>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Notizen"
          value={leadData.notes}
          onChangeText={(text) => setLeadData({ ...leadData, notes: text })}
          multiline
        />
        <VoiceInput onResult={handleVoiceNotes} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button title="Lead Speichern" onPress={saveLead} />
        <Button title="Follow-up in 60 Min" onPress={scheduleFollowUp} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  statusBar: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  online: {
    backgroundColor: '#d4edda',
  },
  offline: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notesInput: {
    flex: 1,
    height: 100,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 20,
    gap: 10,
  },
});

