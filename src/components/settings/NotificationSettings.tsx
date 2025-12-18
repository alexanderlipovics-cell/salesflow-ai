import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import {
  isPushSupported,
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  PushStatus
} from '../../services/pushNotifications';
import { api } from '../../services/api';

interface NotificationPreferences {
  daily_briefing: boolean;
  overdue_followups: boolean;
  hot_lead_alerts: boolean;
  churn_alerts: boolean;
  goal_updates: boolean;
  power_hour_enabled: boolean;
  power_hour_times: number[];
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export function NotificationSettings() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStatus();
    loadPreferences();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const pushStatus = await getPushStatus();
    setStatus(pushStatus);
    setLoading(false);
  };

  const loadPreferences = async () => {
    try {
      const response = await api.get('/api/notifications/preferences');
      setPreferences(response.data);
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    const success = await subscribeToPush();
    if (success) {
      await loadStatus();
    }
    setSubscribing(false);
  };

  const handleUnsubscribe = async () => {
    setSubscribing(true);
    await unsubscribeFromPush();
    await loadStatus();
    setSubscribing(false);
  };

  const handleTest = async () => {
    setTesting(true);
    await sendTestNotification();
    setTesting(false);
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;

    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    setSaving(true);
    try {
      await api.put('/api/notifications/preferences', updated);
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Status */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>

        {!status?.supported ? (
          <div className="flex items-center gap-2 text-amber-600">
            <BellOff className="w-5 h-5" />
            <span>Push Notifications werden von diesem Browser nicht unterstützt</span>
          </div>
        ) : status.permission === 'denied' ? (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            <span>Push Notifications wurden blockiert. Bitte aktiviere sie in den Browser-Einstellungen.</span>
          </div>
        ) : status.subscribed ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Push Notifications sind aktiviert</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {testing ? 'Sende...' : 'Test senden'}
              </button>

              <button
                onClick={handleUnsubscribe}
                disabled={subscribing}
                className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {subscribing ? 'Wird deaktiviert...' : 'Deaktivieren'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Aktiviere Push Notifications um keine wichtigen Updates zu verpassen.
            </p>

            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {subscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {subscribing ? 'Wird aktiviert...' : 'Aktivieren'}
            </button>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      {preferences && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">
            Benachrichtigungs-Einstellungen
            {saving && <span className="text-sm text-gray-400 ml-2">Speichern...</span>}
          </h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span>Tägliche Zusammenfassung (7:30)</span>
              <input
                type="checkbox"
                checked={preferences.daily_briefing}
                onChange={(e) => handlePreferenceChange('daily_briefing', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>Überfällige Follow-ups</span>
              <input
                type="checkbox"
                checked={preferences.overdue_followups}
                onChange={(e) => handlePreferenceChange('overdue_followups', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>Hot Lead Alerts</span>
              <input
                type="checkbox"
                checked={preferences.hot_lead_alerts}
                onChange={(e) => handlePreferenceChange('hot_lead_alerts', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>Churn Risk Warnungen</span>
              <input
                type="checkbox"
                checked={preferences.churn_alerts}
                onChange={(e) => handlePreferenceChange('churn_alerts', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>Ziel-Updates</span>
              <input
                type="checkbox"
                checked={preferences.goal_updates}
                onChange={(e) => handlePreferenceChange('goal_updates', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between">
              <span>Power Hour Erinnerungen</span>
              <input
                type="checkbox"
                checked={preferences.power_hour_enabled}
                onChange={(e) => handlePreferenceChange('power_hour_enabled', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-2">Ruhezeiten</h4>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm text-gray-500">Von</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_start}
                    onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                    className="block border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Bis</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_end}
                    onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                    className="block border rounded px-2 py-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
