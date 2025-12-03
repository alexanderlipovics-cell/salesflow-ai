import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabaseClient';
import { CUREAssessment } from '../../types/v2';
import { TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface CUREAssessmentCardProps {
  leadId: string;
}

export const CUREAssessmentCard: React.FC<CUREAssessmentCardProps> = ({ leadId }) => {
  const [assessment, setAssessment] = useState<CUREAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadAssessment();
  }, [leadId]);

  const loadAssessment = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('cure_assessments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setAssessment(data);
    } catch (err) {
      console.error('Error loading assessment:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzePartnerPotential = async () => {
    setAnalyzing(true);
    try {
      const { error } = await supabaseClient.functions.invoke('assess-cure', {
        body: { lead_id: leadId, chat_messages: [] },
      });

      if (error) throw error;

      // Reload assessment
      await loadAssessment();
    } catch (err) {
      console.error('Error analyzing:', err);
      alert('Assessment-Funktion erfordert Edge Functions. Kommt bald!');
    } finally {
      setAnalyzing(false);
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'superstar': return 'bg-yellow-500';
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const getPotentialTextColor = (potential: string) => {
    switch (potential) {
      case 'superstar': return 'text-yellow-400';
      case 'high': return 'text-green-400';
      case 'medium': return 'text-blue-400';
      case 'low': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <div className="text-slate-400">Lade Assessment...</div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-400" />
          C.U.R.E. Assessment
        </h3>
        <p className="text-slate-400 mb-4">Noch kein Assessment vorhanden</p>
        <button
          onClick={analyzePartnerPotential}
          disabled={analyzing}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
          Assessment starten
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 dark:bg-slate-900 dark:border-slate-800"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-400" />
          C.U.R.E. Assessment
        </h3>
        <div className={`px-4 py-2 rounded-lg font-bold ${getPotentialColor(assessment.partner_potential)}`}>
          {assessment.partner_potential.toUpperCase()}
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Gesamt-Score</span>
          <span className={`text-2xl font-bold ${getPotentialTextColor(assessment.partner_potential)}`}>
            {assessment.overall_score}/100
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${assessment.overall_score}%` }}
            className={`h-full ${getPotentialColor(assessment.partner_potential)}`}
          />
        </div>
      </div>

      {/* C.U.R.E. Scores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Coachability</span>
            <span className="text-sm text-slate-400">{assessment.coachability_score}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              style={{ width: `${assessment.coachability_score}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Urgency</span>
            <span className="text-sm text-slate-400">{assessment.urgency_score}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
              style={{ width: `${assessment.urgency_score}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Resources</span>
            <span className="text-sm text-slate-400">{assessment.resources_score}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
              style={{ width: `${assessment.resources_score}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Energy</span>
            <span className="text-sm text-slate-400">{assessment.energy_score}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
              style={{ width: `${assessment.energy_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Signals */}
      {assessment.signals.red_flags.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Red Flags
          </h4>
          <ul className="space-y-1">
            {assessment.signals.red_flags.map((flag, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {assessment.signals.protective_factors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Schutzfaktoren
          </h4>
          <ul className="space-y-1">
            {assessment.signals.protective_factors.map((factor, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {assessment.next_steps.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">Nächste Schritte</h4>
          <ul className="space-y-1">
            {assessment.next_steps.map((step, idx) => (
              <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-blue-400">→</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {assessment.assessment_reasoning && (
        <div className="mb-4 p-4 bg-slate-800 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Begründung</h4>
          <p className="text-sm text-slate-300">{assessment.assessment_reasoning}</p>
        </div>
      )}

      {/* Re-analyze Button */}
      <button
        onClick={analyzePartnerPotential}
        disabled={analyzing}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
        Neu analysieren
      </button>
    </motion.div>
  );
};

