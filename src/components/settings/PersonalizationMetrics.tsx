import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Brain, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PersonalizationMetrics {
  user_id: string;
  personalization_enabled: boolean;
  profile_completeness: number;
  total_conversions: number;
  conversion_rate: number;
  avg_response_quality: number | null;
  adaptation_speed_days: number | null;
  top_patterns: Array<{ pattern: string; success_rate: number }>;
}

export default function PersonalizationMetrics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PersonalizationMetrics | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Hole Access Token für API-Call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/user-learning/metrics`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'X-User-Id': session.user.id,
        },
      });
      
      if (!response.ok) throw new Error('Failed to load metrics');
      
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
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

  if (!metrics) {
    return null;
  }

  return (
    <div className="glass-panel p-6 space-y-6">
      <header className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-salesflow-accent" />
        <div>
          <h3 className="text-xl font-semibold">Personalisierungs-Metriken</h3>
          <p className="text-sm text-gray-400">
            Wie gut passt sich der AI Chat an dich an?
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile Completeness */}
        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Profil-Vollständigkeit</span>
            <span className="text-2xl font-semibold">
              {Math.round(metrics.profile_completeness * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong"
              style={{ width: `${metrics.profile_completeness * 100}%` }}
            />
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Conversion Rate</span>
            <span className="text-2xl font-semibold">
              {Math.round(metrics.conversion_rate * 100)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {metrics.total_conversions} Conversions
          </p>
        </div>
      </div>

      {/* Top Patterns */}
      {metrics.top_patterns.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Erfolgreiche Patterns
          </h4>
          <div className="space-y-2">
            {metrics.top_patterns.map((pattern, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-2"
              >
                <span className="text-sm text-gray-300">{pattern.pattern}</span>
                <span className="text-xs font-semibold text-salesflow-accent">
                  {Math.round(pattern.success_rate * 100)}% Erfolg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trigger Learning Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;
              
              const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/user-learning/analyze-conversions?days_back=30`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-User-Id': session.user.id,
                  },
                }
              );
              
              if (!response.ok) throw new Error('Failed to trigger learning');
              
              await loadMetrics();
              alert('Learning-Analyse gestartet!');
            } catch (error) {
              console.error('Error triggering learning:', error);
              alert('Fehler beim Starten der Analyse');
            }
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white hover:border-salesflow-accent/40"
        >
          <Brain className="h-4 w-4" />
          Jetzt analysieren
        </button>
      </div>
    </div>
  );
}

