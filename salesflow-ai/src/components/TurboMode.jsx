import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Send,
  Check,
  ChevronRight,
  Phone,
  Mail,
  Instagram,
  MessageCircle,
  Loader2,
  CheckCircle2,
  Play,
  SkipForward,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TurboMode = ({ onClose }) => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [isFlowActive, setIsFlowActive] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchActions();
    return () => {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    };
  }, []);

  const fetchActions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sequences/turbo-today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setActions(data.actions || []);
    } catch (err) {
      console.error(err);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (enrollmentId) => {
    try {
      const res = await fetch(`${API_URL}/api/sequences/turbo-complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enrollment_id: enrollmentId }),
      });
      const data = await res.json();

      if (data.success) {
        setCompletedIds((prev) => new Set([...prev, enrollmentId]));
        toast.success(data.message || 'Erledigt!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Fehler');
    }
  };

  const openDeepLink = (action) => {
    if (action.deep_link) {
      window.open(action.deep_link, '_blank');
    }
  };

  const startTurboFlow = () => {
    setIsFlowActive(true);
    setCurrentIndex(0);

    const firstAction = actions[0];
    if (firstAction?.deep_link) {
      openDeepLink(firstAction);
      startAutoAdvanceTimer(firstAction.enrollment_id);
    }
  };

  const startAutoAdvanceTimer = (enrollmentId) => {
    const timer = setTimeout(() => {
      markComplete(enrollmentId);
      advanceToNext();
    }, 20000);
    setAutoAdvanceTimer(timer);
  };

  const advanceToNext = () => {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= actions.length) {
      setIsFlowActive(false);
      toast.success('🎉 Alle Follow-ups erledigt!');
      return;
    }

    setCurrentIndex(nextIndex);
    const nextAction = actions[nextIndex];

    if (nextAction?.deep_link && !completedIds.has(nextAction.enrollment_id)) {
      openDeepLink(nextAction);
      startAutoAdvanceTimer(nextAction.enrollment_id);
    } else {
      advanceToNext();
    }
  };

  const skipCurrent = () => {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    advanceToNext();
  };

  const manualComplete = (action) => {
    markComplete(action.enrollment_id);
    if (isFlowActive && action.enrollment_id === actions[currentIndex]?.enrollment_id) {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      advanceToNext();
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-green-400" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-400" />;
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-400" />;
      default:
        return <Phone className="w-4 h-4 text-gray-400" />;
    }
  };

  const pendingActions = actions.filter((a) => !completedIds.has(a.enrollment_id));
  const completedCount = completedIds.size;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Alles erledigt!</h3>
        <p className="text-gray-400">Keine Follow-ups für heute.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Turbo Mode</h2>
              <p className="text-sm text-gray-400">
                {completedCount}/{actions.length} erledigt
              </p>
            </div>
          </div>

          {!isFlowActive && pendingActions.length > 0 && (
            <button
              onClick={startTurboFlow}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
            >
              <Play className="w-5 h-5" />
              Turbo starten
            </button>
          )}

          {isFlowActive && (
            <button
              onClick={skipCurrent}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              <SkipForward className="w-5 h-5" />
              Überspringen
            </button>
          )}
        </div>

        <div className="mt-4 w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(completedCount / actions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
        {actions.map((action, index) => {
          const isCompleted = completedIds.has(action.enrollment_id);
          const isCurrent = isFlowActive && index === currentIndex;

          return (
            <div
              key={action.enrollment_id}
              className={`p-4 rounded-xl border transition-all ${
                isCompleted
                  ? 'bg-green-500/10 border-green-500/30 opacity-60'
                  : isCurrent
                  ? 'bg-purple-500/20 border-purple-500/50 ring-2 ring-purple-500/30'
                  : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-500/20' : 'bg-gray-700'}`}>
                  {isCompleted ? <Check className="w-5 h-5 text-green-400" /> : getChannelIcon(action.channel)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{action.lead_name}</span>
                    {action.lead_company && <span className="text-gray-500 text-sm">@ {action.lead_company}</span>}
                  </div>

                  <p className="text-sm text-gray-400 mb-2">
                    {action.sequence_name} • Step {action.step_number}/{action.total_steps}
                  </p>

                  <div className="bg-gray-900/50 rounded-lg p-3 text-sm text-gray-300">
                    {action.message?.substring(0, 150)}
                    {action.message?.length > 150 && '...'}
                  </div>
                </div>

                {!isCompleted && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openDeepLink(action)}
                      disabled={!action.can_send}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Senden
                    </button>
                    <button
                      onClick={() => manualComplete(action)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm font-medium text-green-400 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Erledigt
                    </button>
                  </div>
                )}
              </div>

              {isCurrent && (
                <div className="mt-3 pt-3 border-t border-purple-500/30">
                  <div className="flex items-center gap-2 text-sm text-purple-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auto-weiter in 20 Sek...
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pendingActions.length === 0 && (
        <div className="p-4 border-t border-gray-800 text-center">
          <p className="text-green-400 font-medium">🎉 Alle {actions.length} Follow-ups erledigt!</p>
        </div>
      )}
    </div>
  );
};

export default TurboMode;

