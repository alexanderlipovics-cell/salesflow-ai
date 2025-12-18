import { useState, useEffect } from 'react';
import { Brain, Save, Loader2, Sparkles } from 'lucide-react';
import { CollectiveIntelligenceService } from '../../services/collectiveIntelligenceService';
import { supabase } from '../../lib/supabase';

interface UserLearningProfile {
  preferredTone: 'professional' | 'friendly' | 'casual' | 'formal';
  avgMessageLength: number;
  emojiUsageLevel: number; // 0-5
  formalityScore: number; // 0.0-1.0
  salesStyle: 'aggressive' | 'balanced' | 'consultative';
  objectionHandlingStrength: number; // 0.0-1.0
  closingAggressiveness: number; // 0.0-1.0
  contributeToGlobalLearning: boolean;
}

export default function AIPreferencesPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState<UserLearningProfile>({
    preferredTone: 'professional',
    avgMessageLength: 150,
    emojiUsageLevel: 2,
    formalityScore: 0.5,
    salesStyle: 'balanced',
    objectionHandlingStrength: 0.5,
    closingAggressiveness: 0.5,
    contributeToGlobalLearning: true,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await CollectiveIntelligenceService.getUserProfile();
      if (data) {
        setProfile({
          preferredTone: (data.preferredTone as any) || 'professional',
          avgMessageLength: data.avgMessageLength || 150,
          emojiUsageLevel: data.emojiUsageLevel || 2,
          formalityScore: data.formalityScore || 0.5,
          salesStyle: (data.salesStyle as any) || 'balanced',
          objectionHandlingStrength: data.objectionHandlingStrength || 0.5,
          closingAggressiveness: data.closingAggressiveness || 0.5,
          contributeToGlobalLearning: data.contributeToGlobalLearning !== false,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const success = await CollectiveIntelligenceService.updateUserProfile(profile);
      if (success) {
        setMessage({ type: 'success', text: 'Präferenzen gespeichert!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Speichern' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-salesflow-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-salesflow-accent" />
        <div>
          <h3 className="text-xl font-semibold">AI-Präferenzen</h3>
          <p className="text-sm text-gray-400">
            Passe an, wie der AI Chat mit dir kommuniziert
          </p>
        </div>
      </header>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Kommunikationsstil */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Kommunikationsstil
        </h4>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-300">Ton</span>
            <select
              value={profile.preferredTone}
              onChange={(e) =>
                setProfile({ ...profile, preferredTone: e.target.value as any })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white focus:border-salesflow-accent focus:outline-none"
            >
              <option value="professional">Professionell</option>
              <option value="friendly">Freundlich</option>
              <option value="casual">Locker</option>
              <option value="formal">Formell</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-gray-300">
              Formality: {Math.round(profile.formalityScore * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={profile.formalityScore}
              onChange={(e) =>
                setProfile({ ...profile, formalityScore: parseFloat(e.target.value) })
              }
              className="mt-1 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Informell</span>
              <span>Formell</span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-gray-300">
              Emoji-Nutzung: {profile.emojiUsageLevel}/5
            </span>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={profile.emojiUsageLevel}
              onChange={(e) =>
                setProfile({ ...profile, emojiUsageLevel: parseInt(e.target.value) })
              }
              className="mt-1 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Keine</span>
              <span>Viele</span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-gray-300">
              Nachrichtenlänge: {profile.avgMessageLength} Zeichen
            </span>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={profile.avgMessageLength}
              onChange={(e) =>
                setProfile({ ...profile, avgMessageLength: parseInt(e.target.value) })
              }
              className="mt-1 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Kurz</span>
              <span>Ausführlich</span>
            </div>
          </label>
        </div>
      </section>

      {/* Sales-Style */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Sales-Style
        </h4>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-gray-300">Verkaufsstil</span>
            <select
              value={profile.salesStyle}
              onChange={(e) =>
                setProfile({ ...profile, salesStyle: e.target.value as any })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white focus:border-salesflow-accent focus:outline-none"
            >
              <option value="aggressive">Aggressiv</option>
              <option value="balanced">Ausgewogen</option>
              <option value="consultative">Beratend</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-gray-300">
              Abschluss-Aggressivität: {Math.round(profile.closingAggressiveness * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={profile.closingAggressiveness}
              onChange={(e) =>
                setProfile({ ...profile, closingAggressiveness: parseFloat(e.target.value) })
              }
              className="mt-1 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Sanft</span>
              <span>Proaktiv</span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-gray-300">
              Einwandbehandlung: {Math.round(profile.objectionHandlingStrength * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={profile.objectionHandlingStrength}
              onChange={(e) =>
                setProfile({ ...profile, objectionHandlingStrength: parseFloat(e.target.value) })
              }
              className="mt-1 w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Schwach</span>
              <span>Stark</span>
            </div>
          </label>
        </div>
      </section>

      {/* Privacy */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Privacy & Learning
        </h4>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={profile.contributeToGlobalLearning}
            onChange={(e) =>
              setProfile({ ...profile, contributeToGlobalLearning: e.target.checked })
            }
            className="h-4 w-4 rounded border-white/20 bg-black/20 text-salesflow-accent focus:ring-salesflow-accent"
          />
          <div>
            <span className="text-sm text-gray-300">
              Zu kollektivem Lernen beitragen
            </span>
            <p className="text-xs text-gray-500">
              Erlaube anonymisierten Datenaustausch für bessere AI-Performance
            </p>
          </div>
        </label>
      </section>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-6 py-3 text-sm font-semibold text-black shadow-glow hover:scale-[1.01] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Präferenzen speichern
            </>
          )}
        </button>
      </div>
    </div>
  );
}

