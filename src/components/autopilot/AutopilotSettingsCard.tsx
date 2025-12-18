/**
 * AutopilotSettingsCard - Anzeige und Bearbeitung der globalen Autopilot Settings
 * 
 * Features:
 * - Mode-Auswahl (off/assist/one_click/auto)
 * - Channel-Auswahl (Multi-Select)
 * - Max Auto Replies Slider
 * - is_active Toggle
 */

import { useState, useEffect } from 'react';
import { Zap, Settings as SettingsIcon, Save, X } from 'lucide-react';
import { AutopilotSettings, AutopilotMode } from '@/services/autopilotService';
import { cn } from '@/lib/utils';

interface Props {
  settings: AutopilotSettings | null;
  loading: boolean;
  onSave: (settings: {
    mode: AutopilotMode;
    channels: string[];
    max_auto_replies_per_day: number;
    is_active: boolean;
  }) => Promise<boolean>;
}

const MODE_OPTIONS: { value: AutopilotMode; label: string; emoji: string; desc: string }[] = [
  { value: 'off', label: 'Aus', emoji: '⏸️', desc: 'Autopilot ist deaktiviert' },
  { value: 'assist', label: 'Assist', emoji: '💡', desc: 'KI macht Vorschläge, du entscheidest' },
  { value: 'one_click', label: 'One-Click', emoji: '👆', desc: 'Vorschläge mit einem Klick senden' },
  { value: 'auto', label: 'Auto', emoji: '🤖', desc: 'Vollautomatische Antworten (V1: noch in Entwicklung)' },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'E-Mail', emoji: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { value: 'facebook', label: 'Facebook', emoji: '👥' },
  { value: 'internal', label: 'Intern (Chat)', emoji: '🔒' },
];

export default function AutopilotSettingsCard({ settings, loading, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [mode, setMode] = useState<AutopilotMode>('off');
  const [channels, setChannels] = useState<string[]>(['internal']);
  const [maxReplies, setMaxReplies] = useState(10);
  const [isActive, setIsActive] = useState(true);

  // Sync with settings
  useEffect(() => {
    if (settings && !isEditing) {
      setMode(settings.mode);
      setChannels(settings.channels);
      setMaxReplies(settings.max_auto_replies_per_day);
      setIsActive(settings.is_active);
    }
  }, [settings, isEditing]);

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave({
      mode,
      channels,
      max_auto_replies_per_day: maxReplies,
      is_active: isActive,
    });
    setSaving(false);

    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setMode(settings.mode);
      setChannels(settings.channels);
      setMaxReplies(settings.max_auto_replies_per_day);
      setIsActive(settings.is_active);
    }
    setIsEditing(false);
  };

  const toggleChannel = (channel: string) => {
    if (channels.includes(channel)) {
      setChannels(channels.filter((c) => c !== channel));
    } else {
      setChannels([...channels, channel]);
    }
  };

  const currentModeConfig = MODE_OPTIONS.find((opt) => opt.value === mode);

  if (loading && !settings) {
    return (
      <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
        <div className="text-center text-gray-400">Settings werden geladen...</div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-black/30 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-salesflow-accent/10 p-3">
            <SettingsIcon className="h-6 w-6 text-salesflow-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Globale Autopilot Einstellungen</h2>
            <p className="text-sm text-gray-400">Steuere das Verhalten des Autopiloten</p>
          </div>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-white/40"
          >
            ✏️ Bearbeiten
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white hover:border-white/40 disabled:opacity-50"
            >
              <X className="inline h-4 w-4 mr-1" />
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-salesflow-accent px-4 py-2 text-sm font-medium text-white hover:bg-salesflow-accent/90 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        )}
      </div>

      {/* Display Mode */}
      {!isEditing && settings && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Mode */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Modus</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl">{currentModeConfig?.emoji}</span>
                <div>
                  <div className="text-lg font-semibold text-white">{currentModeConfig?.label}</div>
                  <div className="text-xs text-gray-400">{currentModeConfig?.desc}</div>
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Status</div>
              <div className="mt-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
                    settings.is_active
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-gray-500/10 text-gray-400'
                  )}
                >
                  {settings.is_active ? (
                    <>
                      <Zap className="h-4 w-4" />
                      Aktiv
                    </>
                  ) : (
                    '⏸️ Inaktiv'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Channels */}
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">Aktive Kanäle</div>
            <div className="flex flex-wrap gap-2">
              {settings.channels.map((ch) => {
                const channelConfig = CHANNEL_OPTIONS.find((opt) => opt.value === ch);
                return (
                  <span
                    key={ch}
                    className="rounded-full bg-salesflow-accent/10 px-3 py-1 text-sm font-medium text-salesflow-accent"
                  >
                    {channelConfig?.emoji} {channelConfig?.label || ch}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Max Replies */}
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-wider text-gray-500">Max. Auto-Antworten pro Tag</div>
            <div className="mt-2 text-2xl font-bold text-white">{settings.max_auto_replies_per_day}</div>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-300">Autopilot Modus</label>
            <div className="grid gap-3 md:grid-cols-2">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all',
                    mode === option.value
                      ? 'border-salesflow-accent bg-salesflow-accent/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{option.emoji}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{option.label}</div>
                      <div className="text-xs text-gray-400">{option.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-300">Aktive Kanäle</label>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {CHANNEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleChannel(option.value)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all',
                    channels.includes(option.value)
                      ? 'border-salesflow-accent bg-salesflow-accent/10'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{option.emoji}</span>
                    <span className="text-sm font-medium text-white">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Replies Slider */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-300">
              Max. Auto-Antworten pro Tag: <span className="text-salesflow-accent">{maxReplies}</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={maxReplies}
              onChange={(e) => setMaxReplies(Number(e.target.value))}
              className="w-full accent-salesflow-accent"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>100</span>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <div className="font-medium text-white">Autopilot aktivieren</div>
              <div className="text-xs text-gray-400">
                Wenn deaktiviert, werden keine Events verarbeitet
              </div>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                isActive ? 'bg-salesflow-accent' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                  isActive ? 'translate-x-7' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

