import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/Card';
import { Zap, Mail, MessageCircle, Instagram, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface AutopilotSettings {
  mode: 'off' | 'assist' | 'one_click' | 'auto';
  min_confidence: number;
  channels: string[];
  max_auto_replies_per_day: number;
  is_active: boolean;
}

interface AutopilotSettingsResponse {
  success: boolean;
  settings: AutopilotSettings & {
    id: string;
    user_id: string;
    contact_id?: string | null;
    created_at: string;
    updated_at: string;
  };
}

interface AutopilotStats {
  auto_sent_today: number;
  pending_review: number;
}

export function AutopilotSettings() {
  const [settings, setSettings] = useState<AutopilotSettings>({
    mode: 'off',
    min_confidence: 90,
    channels: ['email'],
    max_auto_replies_per_day: 50,
    is_active: true
  });
  const [stats, setStats] = useState<AutopilotStats>({ auto_sent_today: 0, pending_review: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<AutopilotSettingsResponse>('/autopilot/settings');
      if (response.settings) {
        setSettings({
          mode: response.settings.mode,
          min_confidence: response.settings.min_confidence,
          channels: response.settings.channels,
          max_auto_replies_per_day: response.settings.max_auto_replies_per_day,
          is_active: response.settings.is_active
        });
      }
    } catch (e) {
      console.error('Failed to load autopilot settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Stats endpoint might not exist yet, so we'll make it optional
      const data = await api.get<AutopilotStats>('/autopilot/stats').catch(() => null);
      if (data) {
        setStats(data);
      }
    } catch (e) {
      // Stats endpoint not available yet - silently fail
      console.debug('Autopilot stats endpoint not available:', e);
    }
  };

  const saveSettings = async (newSettings: AutopilotSettings) => {
    setSaving(true);
    try {
      await api.post('/autopilot/settings', newSettings);
      setSettings(newSettings);
      toast.success('Autopilot-Einstellungen gespeichert');
    } catch (e) {
      toast.error('Fehler beim Speichern');
      console.error('Failed to save autopilot settings:', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: string) => {
    const newChannels = settings.channels.includes(channel)
      ? settings.channels.filter(c => c !== channel)
      : [...settings.channels, channel];
    const newSettings = { ...settings, channels: newChannels };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-500" />
        <span className="ml-2 text-slate-400">Laden...</span>
      </div>
    );
  }

  return (
    <Card title="Autopilot" subtitle="Automatische Follow-up Ausführung">
      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-50">Autopilot aktivieren</p>
            <p className="text-sm text-slate-400">
              Follow-ups automatisch senden (Mode: {settings.mode === 'off' ? 'Aus' : settings.mode === 'auto' ? 'Vollautomatisch' : settings.mode === 'one_click' ? 'Ein-Klick' : 'Assist'})
            </p>
          </div>
          <Switch
            checked={settings.mode !== 'off' && settings.is_active}
            onCheckedChange={(enabled) => {
              const newSettings = { 
                ...settings, 
                mode: enabled ? 'auto' : 'off',
                is_active: enabled
              };
              setSettings(newSettings);
              saveSettings(newSettings);
            }}
            disabled={saving}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-2xl font-bold text-emerald-400">{stats.auto_sent_today}</p>
            <p className="text-sm text-emerald-300">Heute automatisch gesendet</p>
          </div>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-2xl font-bold text-yellow-400">{stats.pending_review}</p>
            <p className="text-sm text-yellow-300">Zur Prüfung</p>
          </div>
        </div>

        {/* Min Confidence */}
        <div>
          <div className="mb-2 flex justify-between">
            <p className="font-medium text-slate-50">Mindest-Confidence</p>
            <Badge variant="outline">{settings.min_confidence}%</Badge>
          </div>
          <Slider
            value={[settings.min_confidence]}
            min={50}
            max={100}
            step={5}
            onValueChange={([value]) => {
              setSettings({ ...settings, min_confidence: value });
            }}
            onValueCommit={([value]) => {
              saveSettings({ ...settings, min_confidence: value });
            }}
            disabled={saving}
          />
          <p className="mt-1 text-xs text-slate-400">
            Nur Follow-ups mit mindestens {settings.min_confidence}% Confidence werden automatisch gesendet
          </p>
        </div>

        {/* Channels */}
        <div>
          <p className="mb-3 font-medium text-slate-50">Auto-Send Kanäle</p>
          <div className="flex gap-2">
            <button
              onClick={() => toggleChannel('email')}
              disabled={saving}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition ${
                settings.channels.includes('email')
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
              } disabled:opacity-50`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              onClick={() => toggleChannel('whatsapp')}
              disabled
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-500 opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
              <Badge variant="outline" className="text-xs">Bald</Badge>
            </button>
            <button
              onClick={() => toggleChannel('instagram')}
              disabled
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-500 opacity-50"
            >
              <Instagram className="h-4 w-4" />
              Instagram
              <Badge variant="outline" className="text-xs">Bald</Badge>
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <AlertTriangle className="h-3 w-3" />
            WhatsApp/Instagram Auto-Send kommt bald (API-Limits)
          </p>
        </div>

        {/* Daily Limit */}
        <div>
          <div className="mb-2 flex justify-between">
            <p className="font-medium text-slate-50">Tägliches Limit</p>
            <Badge variant="outline">{settings.max_auto_replies_per_day}/Tag</Badge>
          </div>
          <Slider
            value={[settings.max_auto_replies_per_day]}
            min={10}
            max={100}
            step={10}
            onValueChange={([value]) => {
              setSettings({ ...settings, max_auto_replies_per_day: value });
            }}
            onValueCommit={([value]) => {
              saveSettings({ ...settings, max_auto_replies_per_day: value });
            }}
            disabled={saving}
          />
        </div>
      </div>
    </Card>
  );
}

