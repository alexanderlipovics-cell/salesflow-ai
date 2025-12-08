import React, { useState, useEffect, useRef } from 'react';
import { Play, StopCircle, Target, MessageCircle, Users, Flame, Trophy, Clock, Zap, Award } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PowerHourPage = () => {
  const [session, setSession] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [motivation, setMotivation] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);

  const [goalContacts, setGoalContacts] = useState(20);
  const [goalMessages, setGoalMessages] = useState(15);
  const [duration, setDuration] = useState(60);

  const timerRef = useRef(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    checkActiveSession();
    fetchStats();
  }, []);

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((t) => {
          if (t <= 1) {
            handleEndSession();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const checkActiveSession = async () => {
    try {
      const res = await fetch(`${API_URL}/api/power-hour/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.active && data.session) {
        setSession(data.session);
        setIsActive(true);
        setTimeRemaining((data.remaining_minutes || 0) * 60);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/power-hour/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = async () => {
    try {
      const res = await fetch(`${API_URL}/api/power-hour/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal_contacts: goalContacts,
          goal_messages: goalMessages,
          duration_minutes: duration,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSession(data.session);
        setIsActive(true);
        setTimeRemaining(duration * 60);
        setMotivation(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (field, increment = 1) => {
    if (!session) return;

    const newValue = (session[field] || 0) + increment;

    try {
      const res = await fetch(`${API_URL}/api/power-hour/update/${session.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: newValue,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSession((prev) => ({ ...prev, [field]: newValue }));
        setMotivation(data.motivation);

        if (data.goal_reached) {
          // Celebration animation could be triggered here
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    clearInterval(timerRef.current);

    try {
      const res = await fetch(`${API_URL}/api/power-hour/end/${session.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setCelebrationData(data);
        setShowCelebration(true);
        setIsActive(false);
        setSession(null);
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (current, goal) => {
    if (!goal) return 0;
    return Math.min(100, (current / goal) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
          <Flame className="w-10 h-10 text-orange-500" />
          Power Hour
        </h1>
        <p className="text-gray-400 mt-2">Fokussierter Sprint für maximale Ergebnisse</p>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total_sessions}</p>
            <p className="text-xs text-gray-500">Sessions</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.total_contacts}</p>
            <p className="text-xs text-gray-500">Kontakte</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.current_streak}🔥</p>
            <p className="text-xs text-gray-500">Streak</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-800">
            <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.best_session_contacts}</p>
            <p className="text-xs text-gray-500">Rekord</p>
          </div>
        </div>
      )}

      {/* Main Area */}
      {!isActive ? (
        /* Setup Screen */
        <div className="max-w-md mx-auto bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Session starten</h2>

          <div className="space-y-6">
            <div>
              <label className="text-gray-400 text-sm">Ziel: Kontakte</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={goalContacts}
                  onChange={(e) => setGoalContacts(parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-white w-12">{goalContacts}</span>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm">Ziel: Nachrichten</label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={goalMessages}
                  onChange={(e) => setGoalMessages(parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-white w-12">{goalMessages}</span>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm">Dauer (Minuten)</label>
              <div className="flex gap-2 mt-2">
                {[30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      duration === d ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {d} Min
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-xl font-bold text-xl text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all"
            >
              <Play className="w-6 h-6" />
              LOS GEHT'S!
            </button>
          </div>
        </div>
      ) : (
        /* Active Session */
        <div className="max-w-2xl mx-auto">
          {/* Timer */}
          <div className="text-center mb-8">
            <div className="text-8xl font-mono font-bold text-white mb-4">{formatTime(timeRemaining)}</div>
            <p className="text-orange-400 text-xl animate-pulse">{motivation}</p>
          </div>

          {/* Progress Cards */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Contacts */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-500" />
                  <span className="text-gray-400">Kontakte</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  {session?.contacts_made || 0}/{session?.goal_contacts}
                </span>
              </div>

              <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${getProgress(session?.contacts_made || 0, session?.goal_contacts)}%` }}
                />
              </div>

              <button
                onClick={() => handleUpdateProgress('contacts_made')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors"
              >
                <Zap className="w-5 h-5" />
                +1 Kontakt
              </button>
            </div>

            {/* Messages */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                  <span className="text-gray-400">Nachrichten</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  {session?.messages_sent || 0}/{session?.goal_messages}
                </span>
              </div>

              <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${getProgress(session?.messages_sent || 0, session?.goal_messages)}%` }}
                />
              </div>

              <button
                onClick={() => handleUpdateProgress('messages_sent')}
                className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors"
              >
                <Zap className="w-5 h-5" />
                +1 Nachricht
              </button>
            </div>
          </div>

          {/* End Button */}
          <button
            onClick={handleEndSession}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            <StopCircle className="w-5 h-5" />
            Session beenden
          </button>
        </div>
      )}

      {/* Celebration Modal */}
      {showCelebration && celebrationData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border border-gray-700">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Session beendet!</h2>
            <p className="text-xl text-orange-400 mb-6">{celebrationData.celebration}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-3xl font-bold text-blue-400">{celebrationData.contacts_made}</p>
                <p className="text-gray-500 text-sm">von {celebrationData.contacts_goal} Kontakten</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-3xl font-bold text-green-400">{celebrationData.messages_sent}</p>
                <p className="text-gray-500 text-sm">von {celebrationData.messages_goal} Nachrichten</p>
              </div>
            </div>

            <p className="text-gray-400 mb-6">Dauer: {celebrationData.duration_minutes} Minuten</p>

            <button
              onClick={() => setShowCelebration(false)}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 rounded-xl font-medium text-white"
            >
              Weiter so! 💪
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerHourPage;

