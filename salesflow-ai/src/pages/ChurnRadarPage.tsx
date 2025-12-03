import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabaseClient';
import { ChurnPrediction } from '../../types/v2';
import { AlertTriangle, Shield, Copy, CheckCircle, TrendingDown, Users, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChurnRadarPage: React.FC = () => {
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<ChurnPrediction | null>(null);
  const [, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        await loadPredictions(user.id);
      }
    };
    loadUser();
  }, []);

  const loadPredictions = async (userId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('churn_predictions')
        .select('*, user:users!churn_predictions_user_id_fkey(name, email)')
        .eq('upline_user_id', userId)
        .order('churn_risk_score', { ascending: false });

      if (error) throw error;
      setPredictions(data || []);
    } catch (err) {
      console.error('Error loading predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const markContacted = async (predictionId: string) => {
    try {
      const { error } = await supabaseClient
        .from('churn_predictions')
        .update({
          intervention_taken: true,
          intervention_date: new Date().toISOString(),
        })
        .eq('id', predictionId);

      if (error) throw error;

      setPredictions(prev =>
        prev.map(p =>
          p.id === predictionId
            ? { ...p, intervention_taken: true, intervention_date: new Date().toISOString() }
            : p
        )
      );

      if (selectedPrediction?.id === predictionId) {
        setSelectedPrediction({
          ...selectedPrediction,
          intervention_taken: true,
          intervention_date: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error marking as contacted:', err);
      alert('Fehler beim Markieren');
    }
  };

  const copyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    alert('Motivations-Script kopiert!');
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const stats = {
    critical: predictions.filter(p => p.risk_level === 'critical').length,
    high: predictions.filter(p => p.risk_level === 'high').length,
    medium: predictions.filter(p => p.risk_level === 'medium').length,
    low: predictions.filter(p => p.risk_level === 'low').length,
    average: predictions.length > 0
      ? Math.round(predictions.reduce((sum, p) => sum + p.churn_risk_score, 0) / predictions.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Lade Churn Radar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Shield className="h-10 w-10 text-orange-400" />
            Churn Radar
          </h1>
          <p className="text-slate-400">Überwache das Churn-Risiko deines Teams</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span className="text-sm text-slate-400">Critical</span>
            </div>
            <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-orange-400" />
              <span className="text-sm text-slate-400">High Risk</span>
            </div>
            <div className="text-3xl font-bold text-orange-400">{stats.high}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <span className="text-sm text-slate-400">Medium Risk</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{stats.medium}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-400">Durchschnitt</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.average}%</div>
          </motion.div>
        </div>

        {/* Predictions List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {predictions.map((prediction) => (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedPrediction(prediction)}
                className={`bg-slate-900 border rounded-xl p-6 cursor-pointer transition-all hover:border-${getRiskColor(prediction.risk_level).split('-')[1]}-500 ${
                  selectedPrediction?.id === prediction.id ? 'border-2' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {(prediction as any).user?.name || 'Unbekannt'}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {(prediction as any).user?.email || ''}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-bold ${getRiskColor(prediction.risk_level)}`}>
                    {prediction.risk_level.toUpperCase()}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Churn-Risiko</span>
                    <span className={`font-bold ${getRiskTextColor(prediction.risk_level)}`}>
                      {prediction.churn_risk_score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getRiskColor(prediction.risk_level)}`}
                      style={{ width: `${prediction.churn_risk_score}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>{prediction.inactivity_days} Tage inaktiv</span>
                  {prediction.intervention_taken && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      Kontaktiert
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            {predictions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                Keine Churn-Vorhersagen gefunden
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            <AnimatePresence>
              {selectedPrediction && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-4"
                >
                  <h3 className="text-xl font-bold mb-4">Details</h3>

                  {/* Red Flags */}
                  {selectedPrediction.signals.red_flags.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-red-400 mb-2">Red Flags</h4>
                      <ul className="space-y-1">
                        {selectedPrediction.signals.red_flags.map((flag, idx) => (
                          <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-red-400">•</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Protective Factors */}
                  {selectedPrediction.signals.protective_factors.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-green-400 mb-2">Schutzfaktoren</h4>
                      <ul className="space-y-1">
                        {selectedPrediction.signals.protective_factors.map((factor, idx) => (
                          <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {selectedPrediction.recommended_actions.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold mb-2">Empfohlene Aktionen</h4>
                      <ul className="space-y-1">
                        {selectedPrediction.recommended_actions.map((action, idx) => (
                          <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-blue-400">→</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Motivation Script */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">Motivations-Script</h4>
                      <button
                        onClick={() => copyScript(selectedPrediction.motivation_script)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Kopieren
                      </button>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300">
                      {selectedPrediction.motivation_script}
                    </div>
                  </div>

                  {/* Mark as Contacted */}
                  {!selectedPrediction.intervention_taken && (
                    <button
                      onClick={() => markContacted(selectedPrediction.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Als kontaktiert markieren
                    </button>
                  )}

                  {selectedPrediction.intervention_taken && (
                    <div className="text-center text-green-400 text-sm flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Bereits kontaktiert
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!selectedPrediction && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
                Wähle einen Team-Mitglied aus, um Details zu sehen
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

