import React, { useEffect, useState } from 'react';
import { ChevronRight, Lightbulb, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const IncomePredictorCard = ({ expanded = false }) => {
  const [prediction, setPrediction] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScenarios, setShowScenarios] = useState(expanded);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [predRes, scenRes] = await Promise.all([
          fetch(`${API_URL}/api/income-predictor/predict`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/income-predictor/scenarios`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const predData = await predRes.json();
        const scenData = await scenRes.json();

        setPrediction(predData);
        setScenarios(scenData.scenarios || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const formatCurrency = (val) => {
    if (val >= 10000) {
      return `€${(val / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'positive':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!prediction) return null;

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-green-900/20 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Einkommens-Prognose
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              {Math.round(prediction.confidence * 100)}% Confidence
            </span>
          </div>
        </div>
      </div>

      {/* Predictions */}
      <div className="p-4">
        {/* Main prediction cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">30 Tage</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(prediction.predicted_30_days)}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center border border-green-500/30">
            <p className="text-xs text-green-400 mb-1">60 Tage</p>
            <p className="text-xl font-bold text-green-400">
              {formatCurrency(prediction.predicted_60_days)}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center border border-green-500/30">
            <p className="text-xs text-green-400 mb-1">90 Tage</p>
            <p className="text-xl font-bold text-green-400">
              {formatCurrency(prediction.predicted_90_days)}
            </p>
          </div>
        </div>

        {/* Current stats */}
        <div className="flex justify-between items-center text-sm text-gray-400 mb-4 bg-gray-800/30 rounded-lg p-3">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{prediction.contacts_per_day}</p>
            <p className="text-xs">Kontakte/Tag</p>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{prediction.conversion_rate}%</p>
            <p className="text-xs">Conversion</p>
          </div>
          <div className="h-8 w-px bg-gray-700" />
          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              {formatCurrency(prediction.avg_deal_value)}
            </p>
            <p className="text-xs">Ø Deal</p>
          </div>
        </div>

        {/* Top recommendation */}
        {prediction.recommendations?.[0] && (
          <div className={`rounded-lg p-3 border ${getImpactColor(prediction.recommendations[0].impact)}`}>
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{prediction.recommendations[0].message}</p>
                {prediction.recommendations[0].potential_increase && (
                  <p className="text-xs mt-1 opacity-80">
                    +{formatCurrency(prediction.recommendations[0].potential_increase)}/Monat möglich
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scenarios toggle */}
      <button
        onClick={() => setShowScenarios(!showScenarios)}
        className="w-full p-3 border-t border-gray-800 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 flex items-center justify-center gap-1 transition-colors"
      >
        Was wäre wenn...
        <ChevronRight className={`w-4 h-4 transition-transform ${showScenarios ? 'rotate-90' : ''}`} />
      </button>

      {/* Scenarios */}
      {showScenarios && scenarios.length > 0 && (
        <div className="p-4 border-t border-gray-800 bg-gray-800/20">
          <div className="space-y-2">
            {scenarios.map((s, i) => (
              <div
                key={i}
                className={`flex justify-between items-center p-2 rounded-lg ${
                  i === 0
                    ? 'bg-gray-800/50'
                    : i === scenarios.length - 1
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-gray-800/30'
                }`}
              >
                <div>
                  <span
                    className={`text-sm ${
                      i === scenarios.length - 1 ? 'text-green-400 font-medium' : 'text-gray-300'
                    }`}
                  >
                    {s.name}
                  </span>
                  <p className="text-xs text-gray-500">
                    {s.contacts_day} Kontakte • {s.conversion}% Conv.
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${i === scenarios.length - 1 ? 'text-green-400' : 'text-white'}`}>
                    {formatCurrency(s.monthly)}/Mo
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(s.yearly)}/Jahr
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomePredictorCard;

