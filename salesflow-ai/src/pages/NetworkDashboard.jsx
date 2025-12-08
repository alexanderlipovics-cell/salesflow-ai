import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  Award,
  DollarSign,
  UserPlus,
  Activity,
  Zap,
} from 'lucide-react';

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000';

const NetworkDashboard = () => {
  const [stats, setStats] = useState(null);
  const [rankProgress, setRankProgress] = useState(null);
  const [compensation, setCompensation] = useState(null);
  const [team, setTeam] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [statsRes, rankRes, compRes, teamRes] = await Promise.all([
        fetch(`${API_URL}/api/network/team/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/network/rank-progress`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/network/compensation-estimate`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/network/team`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats(await statsRes.json());
      setRankProgress(await rankRes.json());
      setCompensation(await compRes.json());
      const teamData = await teamRes.json();
      setTeam(teamData.team || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-500" />
          Network Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Dein Team auf einen Blick</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Team Gesamt</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.total_team || 0}</p>
          <p className="text-xs text-green-400 mt-1">
            +{stats?.new_this_week || 0} diese Woche
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Direkte Partner</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.direct_partners || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Level 1</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Aktive</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.active_members || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{stats?.inactive_members || 0} inaktiv</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Group Volume</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {stats?.total_group_volume?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">PV diesen Monat</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Rang-Fortschritt
          </h2>

          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm">Aktueller Rang</p>
            <p className="text-2xl font-bold text-yellow-400">
              {rankProgress?.current_rank || 'Starter'}
            </p>
          </div>

          {rankProgress?.next_rank && (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Nächster Rang:</span>
                <span className="text-purple-400 font-medium">{rankProgress.next_rank}</span>
              </div>

              <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${rankProgress.progress_percent || 0}%` }}
                />
              </div>

              <p className="text-center text-sm text-gray-400 mb-4">
                {rankProgress.progress_percent?.toFixed(0)}% erreicht
              </p>

              <div className="space-y-3">
                {rankProgress.requirements?.map((req, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{req.name}</span>
                      <span className={req.met ? 'text-green-400' : 'text-gray-300'}>
                        {req.current?.toLocaleString()} / {req.required?.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${req.met ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${req.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {rankProgress?.message && (
            <p className="text-center text-green-400 mt-4">{rankProgress.message}</p>
          )}
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Provisions-Schätzung
          </h2>

          <div className="text-center mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/30">
            <p className="text-gray-400 text-sm">Geschätzte Provision</p>
            <p className="text-4xl font-bold text-green-400">
              {formatCurrency(compensation?.estimated_commission)}
            </p>
            <p className="text-xs text-gray-500 mt-1">diesen Monat</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-400">Personal Volume</span>
              <span className="text-white font-medium">
                {compensation?.personal_volume?.toLocaleString() || 0} PV
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-400">Team Volume</span>
              <span className="text-white font-medium">
                {compensation?.team_volume?.toLocaleString() || 0} GV
              </span>
            </div>

            <div className="border-t border-gray-800 pt-3 mt-3">
              <p className="text-xs text-gray-500 uppercase mb-2">Aufschlüsselung</p>
              {compensation?.breakdown?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">{item.name}</span>
                  <span className="text-green-400">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            Team Übersicht
          </h2>

          <button className="w-full mb-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <UserPlus className="w-5 h-5" />
            Neues Teammitglied
          </button>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {team.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Teammitglieder</p>
            ) : (
              team.slice(0, 10).map((member, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold">
                    {member.member_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{member.member_name}</p>
                    <p className="text-xs text-gray-500">
                      {member.rank} • Level {member.level}
                    </p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      member.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                </div>
              ))
            )}
          </div>

          {team.length > 10 && (
            <button className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm">
              Alle {team.length} anzeigen →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkDashboard;

