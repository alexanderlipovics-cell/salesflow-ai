import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const DealHealthCard = ({ onLeadClick }) => {
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/deal-health/check`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Error fetching health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!health) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 70) return 'bg-green-500/20';
    if (score >= 40) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const problemLeads = health.leads.filter((l) => l.health_status !== 'healthy');
  const displayLeads = showAll ? problemLeads : problemLeads.slice(0, 3);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Deal Health
          </h3>
          <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-4 h-4" /> {health.healthy}
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle className="w-4 h-4" /> {health.warning}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-4 h-4" /> {health.critical}
            </span>
          </div>
        </div>
      </div>

      {problemLeads.length === 0 ? (
        <div className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-medium">Alle Deals sind gesund!</p>
          <p className="text-gray-400 text-sm">Weiter so! 🎉</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700">
          {displayLeads.map((lead) => (
            <div
              key={lead.lead_id}
              onClick={() => onLeadClick?.(lead.lead_id)}
              className="p-4 hover:bg-gray-700/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(lead.health_status)}
                  <span className="font-medium">{lead.lead_name}</span>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-sm font-bold ${getScoreBg(
                    lead.health_score,
                  )} ${getScoreColor(lead.health_score)}`}
                >
                  {lead.health_score}%
                </span>
              </div>

              {lead.warnings.length > 0 && (
                <p className="text-sm text-gray-400 mb-2">{lead.warnings[0]}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lead.days_since_contact}d seit Kontakt
                </span>
                {lead.follow_up_overdue && <span className="text-red-400">Follow-up überfällig!</span>}
              </div>
            </div>
          ))}

          {problemLeads.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full p-3 text-center text-sm text-blue-400 hover:bg-gray-700/50"
            >
              {showAll ? 'Weniger anzeigen' : `+${problemLeads.length - 3} weitere anzeigen`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DealHealthCard;

