import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiClient } from '../api/client';

interface ScheduleMeetingScreenProps {
  route: {
    params?: {
      leadId?: string;
      leadName?: string;
    };
  };
  navigation: any;
}

type PlatformType = 'zoom' | 'teams' | 'google_meet';

export default function ScheduleMeetingScreen({ 
  route, 
  navigation 
}: ScheduleMeetingScreenProps) {
  const { leadId, leadName } = route.params || {};
  
  const [platform, setPlatform] = useState<PlatformType>('zoom');
  const [title, setTitle] = useState(`Meeting mit ${leadName || 'Lead'}`);
  const [startTime, setStartTime] = useState(new Date());
  const [duration, setDuration] = useState('60');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel ein');
      return;
    }

    if (parseInt(duration) < 15 || parseInt(duration) > 480) {
      Alert.alert('Fehler', 'Dauer muss zwischen 15 und 480 Minuten liegen');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/api/video-meetings/create', {
        platform,
        lead_id: leadId || null,
        title,
        start_time: startTime.toISOString(),
        duration_minutes: parseInt(duration)
      });

      const data = response.data;

      Alert.alert(
        'Meeting geplant! 🎉',
        `Dein ${getPlatformName(platform)}-Meeting wurde erstellt.\n\nJoin URL: ${data.join_url}`,
        [
          {
            text: 'Link kopieren',
            onPress: () => {
              // In production, use Clipboard API
              Alert.alert('Link', data.join_url);
            }
          },
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Fehler',
        error.response?.data?.detail || 'Meeting konnte nicht erstellt werden. Stelle sicher, dass du die Platform verbunden hast.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getPlatformName = (p: PlatformType): string => {
    switch (p) {
      case 'zoom': return 'Zoom';
      case 'teams': return 'Microsoft Teams';
      case 'google_meet': return 'Google Meet';
    }
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDate = new Date(startTime);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setStartTime(newDate);
    }
  };

  const onTimeChange = (_event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(startTime);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setStartTime(newDate);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meeting planen</Text>
        {leadName && (
          <Text style={styles.subtitle}>Mit: {leadName}</Text>
        )}
      </View>

      {/* Platform Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Platform:</Text>
        <View style={styles.platformButtons}>
          {(['zoom', 'teams', 'google_meet'] as PlatformType[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[
                styles.platformButton,
                platform === p && styles.platformButtonActive
              ]}
              onPress={() => setPlatform(p)}
              disabled={loading}
            >
              <Text style={[
                styles.platformButtonText,
                platform === p && styles.platformButtonTextActive
              ]}>
                {getPlatformName(p)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Title */}
      <View style={styles.section}>
        <Text style={styles.label}>Titel:</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Meeting Titel"
          placeholderTextColor="#999"
          editable={!loading}
        />
      </View>

      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.label}>Datum & Uhrzeit:</Text>
        
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
          disabled={loading}
        >
          <Text style={styles.dateTimeText}>
            📅 {startTime.toLocaleDateString('de-DE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowTimePicker(true)}
          disabled={loading}
        >
          <Text style={styles.dateTimeText}>
            🕐 {startTime.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={startTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>Dauer (Minuten):</Text>
        <View style={styles.durationButtons}>
          {['30', '60', '90'].map(d => (
            <TouchableOpacity
              key={d}
              style={[
                styles.durationButton,
                duration === d && styles.durationButtonActive
              ]}
              onPress={() => setDuration(d)}
              disabled={loading}
            >
              <Text style={[
                styles.durationButtonText,
                duration === d && styles.durationButtonTextActive
              ]}>
                {d} Min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          placeholder="Benutzerdefiniert"
          keyboardType="number-pad"
          placeholderTextColor="#999"
          editable={!loading}
        />
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ Das Meeting wird automatisch aufgezeichnet und transkribiert. 
          Nach dem Meeting wird eine KI-Analyse mit Key Topics, Action Items und Sentiment erstellt.
        </Text>
      </View>

      {/* Schedule Button */}
      <TouchableOpacity
        style={[styles.scheduleButton, loading && styles.scheduleButtonDisabled]}
        onPress={handleSchedule}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scheduleButtonText}>Meeting planen 🎥</Text>
        )}
      </TouchableOpacity>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
  },
  platformButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  platformButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  platformButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  platformButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  platformButtonTextActive: {
    color: '#fff',
  },
  dateTimeButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  durationButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#DBEAFE',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  scheduleButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
});

