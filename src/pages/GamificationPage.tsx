import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Flame, 
  Target, 
  Star, 
  CheckSquare, 
  Medal,
  Crown,
  Zap,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useApi, useMutation } from '@/hooks/useApi';

// --- Types ---

interface Achievement {
  id: string;
  achievement_name: string;
  achievement_icon: string;
  achievement_description?: string;
  progress_current: number;
  progress_target: number;
  is_completed: boolean;
  points_awarded: number;
}

interface DailyActivity {
  id: string;
  activity_date: string;
  new_contacts: number;
  followups_sent: number;
  calls_made: number;
  meetings_booked: number;
  deals_closed: number;
  current_streak_days: number;
  longest_streak_days: number;
  daily_goal_met: boolean;
}

interface LeaderboardEntry {
  user_id: string;
  user_name?: string;
  total_points: number;
  achievements_count: number;
  current_streak: number;
  deals_closed: number;
  rank: number;
}

// --- Components ---

const ProgressBar = ({ current, target, completed }: { current: number, target: number, completed: boolean }) => {
  const percentage = Math.min(100, (current / target) * 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 overflow-hidden">
      <motion.div 
        className={clsx("h-2.5 rounded-full", completed ? "bg-green-500" : "bg-blue-600")}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
};

export default function GamificationPage() {
  const [showConfetti, setShowConfetti] = useState(false);

  // API Hooks
  const achievementsQuery = useApi<Achievement[]>(
    '/api/gamification/achievements',
    { immediate: true }
  );

  const dailyActivitiesQuery = useApi<DailyActivity[]>(
    '/api/gamification/daily-activities?days=7',
    { immediate: true }
  );

  const leaderboardQuery = useApi<LeaderboardEntry[]>(
    '/api/gamification/leaderboard',
    { immediate: true }
  );

  const trackActivityMutation = useMutation<DailyActivity>(
    'post',
    '/api/gamification/daily-activities/track',
    {
      onSuccess: () => {
        dailyActivitiesQuery.refetch();
        achievementsQuery.refetch();
      }
    }
  );

  const achievements = achievementsQuery.data || [];
  const dailyActivities = dailyActivitiesQuery.data || [];
  const leaderboard = leaderboardQuery.data || [];

  const loading = achievementsQuery.isLoading || dailyActivitiesQuery.isLoading || leaderboardQuery.isLoading;
  const error = achievementsQuery.error || dailyActivitiesQuery.error || leaderboardQuery.error;

  // Current streak from latest daily activity
  const currentStreak = dailyActivities.length > 0 
    ? dailyActivities[0].current_streak_days 
    : 0;

  // Daily tasks (vereinfacht - könnte aus API kommen)
  const [tasks, setTasks] = useState([
    { id: 'd1', title: '20 Cold Calls durchführen', points: 50, completed: false },
    { id: 'd2', title: 'CRM Daten pflegen', points: 20, completed: false },
    { id: 'd3', title: '1 Follow-Up Meeting buchen', points: 100, completed: false },
  ]);

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (newCompleted) triggerConfetti();
        return { ...t, completed: newCompleted };
      }
      return t;
    }));

    // Track activity in backend
    if (newCompleted) {
      await trackActivityMutation.mutate({
        new_contacts: id === 'd1' ? 1 : 0,
        calls_made: id === 'd1' ? 1 : 0,
        followups_sent: id === 'd2' ? 1 : 0,
        meetings_booked: id === 'd3' ? 1 : 0,
        deals_closed: 0,
      });
    }
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="font-bold text-lg text-red-800">Fehler beim Laden</h3>
          <p className="text-red-600">{error.message || "Konnte Gamification-Daten nicht laden."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative overflow-hidden">
      {/* Confetti Placeholder */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-6xl animate-bounce">🎉</div>
        </div>
      )}

      {/* Hero Section: Streak */}
      <div className="mb-8">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 text-white shadow-lg flex items-center justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold mb-1">Du bist on fire! 🔥</h2>
            <p className="text-orange-100">Halte den Streak am Leben, indem du deine Daily Tasks erledigst.</p>
          </div>
          <div className="text-center bg-white/20 p-4 rounded-xl backdrop-blur-sm">
            <div className="text-4xl font-black">{currentStreak}</div>
            <div className="text-xs uppercase tracking-wider font-bold">Tage Streak</div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Achievements & Dailies */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Daily Tracker */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-500" />
              Daily Mission
            </h3>
            <div className="space-y-3">
              {tasks.map((task) => (
                <motion.div 
                  key={task.id}
                  layout
                  className={clsx(
                    "flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer",
                    task.completed ? "bg-green-50 border-green-200" : "bg-white border-slate-200 hover:border-blue-300"
                  )}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                      task.completed ? "bg-green-500 border-green-500" : "border-slate-300"
                    )}>
                      {task.completed && <Zap className="w-3 h-3 text-white" />}
                    </div>
                    <span className={clsx("font-medium", task.completed && "text-slate-400 line-through")}>
                      {task.title}
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
                    +{task.points} XP
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Achievements Grid */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.length > 0 ? (
                achievements.map((ach) => (
                  <motion.div 
                    key={ach.id}
                    whileHover={{ scale: 1.02 }}
                    className={clsx(
                      "p-4 rounded-xl border relative overflow-hidden",
                      ach.is_completed ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-3xl bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
                        {ach.achievement_icon || '🏅'}
                      </div>
                      {ach.is_completed && <Medal className="w-6 h-6 text-yellow-500" />}
                    </div>
                    <h4 className="font-bold text-slate-800">{ach.achievement_name}</h4>
                    <p className="text-xs text-slate-500 mb-3">{ach.achievement_description || "Erreiche das Ziel!"}</p>
                    
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>{ach.progress_current} / {ach.progress_target}</span>
                      <span>{Math.round((ach.progress_current / ach.progress_target) * 100)}%</span>
                    </div>
                    <ProgressBar current={ach.progress_current} target={ach.progress_target} completed={ach.is_completed} />
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-slate-500 col-span-2">Noch keine Achievements. Starte mit deinen ersten Aktivitäten! 🚀</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              Top Performer
            </h3>
            <span className="text-xs text-slate-400">Diese Woche</span>
          </div>
          
          <div className="space-y-4">
            {leaderboard.length > 0 ? (
              leaderboard.map((user, idx) => (
                <div key={user.user_id || idx} className="flex items-center gap-4">
                  <div className={clsx(
                    "w-8 h-8 flex items-center justify-center font-bold rounded-lg text-sm",
                    user.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                    user.rank === 2 ? "bg-slate-100 text-slate-700" :
                    user.rank === 3 ? "bg-orange-100 text-orange-800" : "text-slate-400"
                  )}>
                    {user.rank}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {user.user_name ? user.user_name.substring(0, 2).toUpperCase() : 'U'}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      {user.user_name || 'Unbekannt'}
                    </div>
                    <div className="text-xs text-slate-400">{user.total_points.toLocaleString()} XP</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Noch kein Leaderboard verfügbar.</p>
            )}
          </div>
          
          <button className="w-full mt-6 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Vollständiges Ranking anzeigen
          </button>
        </div>

      </div>
    </div>
  );
}

