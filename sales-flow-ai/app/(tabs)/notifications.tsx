/**
 * Notification Settings Screen
 * User preferences UI for notification management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Platform, TextInput, Alert } from 'react-native';
import { notificationPreferences } from '../../utils/notificationPreferences';
import { notificationAnalytics } from '../../utils/notificationAnalytics';
import { NotificationCategory } from '../../types/notifications';

export default function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState(notificationPreferences.getPreferences());
  const [analytics, setAnalytics] = useState(notificationAnalytics.getAnalytics());
  const [editingTime, setEditingTime] = useState<string | null>(null);
  const [editingQuietStart, setEditingQuietStart] = useState<string | null>(null);
  const [editingQuietEnd, setEditingQuietEnd] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPreferences(notificationPreferences.getPreferences());
    setAnalytics(notificationAnalytics.getAnalytics());
  };

  const handleToggle = async (key: keyof typeof preferences) => {
    const newValue = !preferences[key];
    await notificationPreferences.updatePreferences({ [key]: newValue });
    loadData();
  };

  const handleTimeChange = async (time: string) => {
    await notificationPreferences.setDailyReminderTime(time);
    loadData();
  };

  const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return 'Nicht gesetzt';
    return `${timeStr} Uhr`;
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-6">
        {/* Main Toggle */}
        <View className="bg-white rounded-lg p-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                Benachrichtigungen
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                Alle Benachrichtigungen aktivieren
              </Text>
            </View>
            <Switch
              value={preferences.enabled}
              onValueChange={() => handleToggle('enabled')}
            />
          </View>
        </View>

        {/* Daily Reminder */}
        {preferences.enabled && (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Tägliche Erinnerung
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Erinnere mich an meine Tagesziele
                </Text>
              </View>
              <Switch
                value={preferences.dailyReminder}
                onValueChange={() => handleToggle('dailyReminder')}
              />
            </View>

            {preferences.dailyReminder && (
              <View className="mt-2 pt-3 border-t border-gray-200">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Uhrzeit (HH:MM)
                </Text>
                {editingTime === 'daily' ? (
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 bg-gray-100 rounded-lg p-3 text-base text-gray-900"
                      value={preferences.dailyReminderTime}
                      onChangeText={(text) => {
                        // Validate HH:MM format
                        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text) || text === '') {
                          notificationPreferences.setDailyReminderTime(text || '17:00');
                          loadData();
                        }
                      }}
                      placeholder="17:00"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <TouchableOpacity
                      className="bg-blue-500 rounded-lg px-4 justify-center"
                      onPress={() => setEditingTime(null)}
                    >
                      <Text className="text-white font-medium">OK</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="bg-gray-100 rounded-lg p-3"
                    onPress={() => setEditingTime('daily')}
                  >
                    <Text className="text-base text-gray-900">
                      {preferences.dailyReminderTime} Uhr
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Lead Reminders */}
        {preferences.enabled && (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Lead-Erinnerungen
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Benachrichtigung vor Follow-ups
                </Text>
              </View>
              <Switch
                value={preferences.leadReminders}
                onValueChange={() => handleToggle('leadReminders')}
              />
            </View>
          </View>
        )}

        {/* Squad Updates */}
        {preferences.enabled && (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  Squad-Updates
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Neue Challenge-Aktivitäten
                </Text>
              </View>
              <Switch
                value={preferences.squadUpdates}
                onValueChange={() => handleToggle('squadUpdates')}
              />
            </View>
          </View>
        )}

        {/* Quiet Hours */}
        {preferences.enabled && (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              Ruhige Stunden
            </Text>
            <Text className="text-sm text-gray-600 mb-3">
              Keine Benachrichtigungen in diesem Zeitraum
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-600 mb-1">Von (HH:MM)</Text>
                {editingQuietStart ? (
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 bg-gray-100 rounded-lg p-3 text-base text-gray-900"
                      value={preferences.quietHoursStart || ''}
                      onChangeText={(text) => {
                        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text) || text === '') {
                          notificationPreferences.setQuietHours(
                            text || null,
                            preferences.quietHoursEnd
                          );
                          loadData();
                        }
                      }}
                      placeholder="22:00"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <TouchableOpacity
                      className="bg-blue-500 rounded-lg px-4 justify-center"
                      onPress={() => setEditingQuietStart(false)}
                    >
                      <Text className="text-white font-medium">OK</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="bg-gray-100 rounded-lg p-3"
                    onPress={() => setEditingQuietStart(true)}
                  >
                    <Text className="text-base text-gray-900">
                      {formatTime(preferences.quietHoursStart)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-600 mb-1">Bis (HH:MM)</Text>
                {editingQuietEnd ? (
                  <View className="flex-row gap-2">
                    <TextInput
                      className="flex-1 bg-gray-100 rounded-lg p-3 text-base text-gray-900"
                      value={preferences.quietHoursEnd || ''}
                      onChangeText={(text) => {
                        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text) || text === '') {
                          notificationPreferences.setQuietHours(
                            preferences.quietHoursStart,
                            text || null
                          );
                          loadData();
                        }
                      }}
                      placeholder="08:00"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                    <TouchableOpacity
                      className="bg-blue-500 rounded-lg px-4 justify-center"
                      onPress={() => setEditingQuietEnd(false)}
                    >
                      <Text className="text-white font-medium">OK</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="bg-gray-100 rounded-lg p-3"
                    onPress={() => setEditingQuietEnd(true)}
                  >
                    <Text className="text-base text-gray-900">
                      {formatTime(preferences.quietHoursEnd)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Analytics */}
        <View className="bg-white rounded-lg p-4 shadow-sm">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Statistiken
          </Text>
          {Object.entries(analytics).map(([category, data]) => (
            <View key={category} className="mb-3 last:mb-0">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <View className="flex-row gap-4">
                <Text className="text-xs text-gray-600">
                  Gesendet: {data.sent}
                </Text>
                <Text className="text-xs text-gray-600">
                  Geöffnet: {data.opened}
                </Text>
                <Text className="text-xs text-gray-600">
                  Rate: {notificationAnalytics.getOpenRate(category as NotificationCategory).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

