/**
 * 📱 AURA FLOW MOBILE - Mobile Dashboard für Networker
 * 
 * Design von Gemini 3 Ultra
 * 
 * Philosophie: "Denk nicht nach. Mach einfach die 5 Dinge, die die App dir zeigt."
 * 
 * Core-Features:
 * - The Daily Ring (Apple Watch Style Fortschritt)
 * - Magic Import (Screenshot → Lead)
 * - Tinder-Style Tasks (Swipe für Erledigt/Snooze)
 * - Gamification (Streak, Score)
 */

import React, { useState, useEffect } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';

// ============================================
// TYPES
// ============================================

interface DailyStats {
  score: number;        // Gamification Score (0-100)
  streak: number;       // Tage in Folge
  tasks_done: number;
  tasks_total: number;
  daily_flow_percent: number;
  new_leads_today: number;
  pipeline_value: number;
}

interface UrgentTask {
  id: string;
  type: 'whatsapp' | 'instagram' | 'call' | 'email';
  name: string;
  action: string;
  intent: 'hot' | 'warm' | 'cold' | 'urgent';
  avatar?: string;
}

interface MobileDashboardProps {
  userName?: string;
  stats?: DailyStats;
  tasks?: UrgentTask[];
  onScreenshotImport?: () => void;
  onVoiceNote?: () => void;
  onQRScan?: () => void;
  onTaskAction?: (task: UrgentTask, action: 'go' | 'snooze' | 'done') => void;
  onAICoachAction?: () => void;
}

// ============================================
// MOCK DATA
// ============================================

const DEFAULT_STATS: DailyStats = {
  score: 72,
  streak: 14,
  tasks_done: 5,
  tasks_total: 8,
  daily_flow_percent: 85,
  new_leads_today: 12,
  pipeline_value: 450,
};

const DEFAULT_TASKS: UrgentTask[] = [
  { id: '1', type: 'whatsapp', name: 'Lisa Müller', action: 'Follow-up (Tag 3)', intent: 'hot' },
  { id: '2', type: 'instagram', name: 'Fitness Coach Tom', action: 'Antwort ausstehend', intent: 'warm' },
  { id: '3', type: 'call', name: 'Stefan Weber', action: 'Closing Call', intent: 'urgent' },
];

// ============================================
// HELPER COMPONENTS
// ============================================

const CircularProgress: React.FC<{ value: number; size?: number }> = ({ 
  value, 
  size = 120 
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{value}%</span>
        <span className="text-xs text-white/70">Daily Flow</span>
      </div>
    </div>
  );
};

// Icon Map
const PLATFORM_ICONS: Record<string, { icon: string; color: string }> = {
  whatsapp: { icon: '💬', color: '#25D366' },
  instagram: { icon: '📸', color: '#C13584' },
  call: { icon: '📞', color: '#3b82f6' },
  email: { icon: '📧', color: '#f59e0b' },
};

const INTENT_COLORS: Record<string, string> = {
  hot: 'bg-red-500',
  warm: 'bg-orange-500',
  cold: 'bg-blue-500',
  urgent: 'bg-purple-500',
};

// ============================================
// SWIPEABLE TASK CARD
// ============================================

const SwipeableTaskCard: React.FC<{
  task: UrgentTask;
  onAction: (action: 'go' | 'snooze' | 'done') => void;
}> = ({ task, onAction }) => {
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = async (e: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > 100) {
      // Swipe Right → Done
      await controls.start({ x: 300, opacity: 0 });
      onAction('done');
    } else if (info.offset.x < -100) {
      // Swipe Left → Snooze
      await controls.start({ x: -300, opacity: 0 });
      onAction('snooze');
    } else {
      // Snap back
      controls.start({ x: 0 });
    }
  };

  const platform = PLATFORM_ICONS[task.type] || { icon: '📱', color: '#666' };

  return (
    <div className="relative overflow-hidden rounded-xl mb-3">
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-green-500 flex items-center pl-4">
          <span className="text-white font-bold">✓ Erledigt</span>
        </div>
        <div className="flex-1 bg-orange-500 flex items-center justify-end pr-4">
          <span className="text-white font-bold">⏰ Snooze</span>
        </div>
      </div>
      
      {/* Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="bg-white relative p-4 flex items-center gap-4 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Platform Icon */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ backgroundColor: platform.color + '20' }}
        >
          {platform.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 truncate">{task.name}</span>
            <span className={`w-2 h-2 rounded-full ${INTENT_COLORS[task.intent]}`} />
          </div>
          <p className="text-gray-500 text-sm truncate">{task.action}</p>
        </div>
        
        {/* GO Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) onAction('go');
          }}
          className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 font-bold rounded-lg transition-colors"
        >
          GO
        </button>
      </motion.div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  userName = 'Alex',
  stats = DEFAULT_STATS,
  tasks = DEFAULT_TASKS,
  onScreenshotImport,
  onVoiceNote,
  onQRScan,
  onTaskAction,
  onAICoachAction,
}) => {
  const [greeting, setGreeting] = useState('Guten Morgen');
  const [removedTasks, setRemovedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Guten Tag');
    else if (hour >= 17) setGreeting('Guten Abend');
    else setGreeting('Guten Morgen');
  }, []);

  const handleTaskAction = (task: UrgentTask, action: 'go' | 'snooze' | 'done') => {
    if (action === 'done' || action === 'snooze') {
      setRemovedTasks(prev => new Set([...prev, task.id]));
    }
    onTaskAction?.(task, action);
  };

  const visibleTasks = tasks.filter(t => !removedTasks.has(t.id));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER mit Gradient */}
      <div 
        className="px-5 pt-12 pb-8 rounded-b-[30px]"
        style={{
          background: 'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 50%, #fdbb2d 100%)',
        }}
      >
        {/* Top Row */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{greeting}, {userName}!</h1>
            <p className="text-white/80 text-sm">
              Lass uns heute {Math.max(0, stats.tasks_total - stats.tasks_done)} Tasks erledigen.
            </p>
          </div>
          
          {/* Avatar mit Streak */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-2xl">
              👤
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gray-900 px-2 py-0.5 rounded-full">
              <span className="text-xs font-bold text-white">🔥 {stats.streak}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-around bg-white/15 backdrop-blur rounded-2xl p-4">
          <div className="text-center">
            <div className="text-white text-xl font-bold">{stats.daily_flow_percent}%</div>
            <div className="text-white/70 text-xs">Daily Flow</div>
          </div>
          <div className="w-px bg-white/30" />
          <div className="text-center">
            <div className="text-white text-xl font-bold">{stats.new_leads_today}</div>
            <div className="text-white/70 text-xs">Neue Leads</div>
          </div>
          <div className="w-px bg-white/30" />
          <div className="text-center">
            <div className="text-white text-xl font-bold">€{stats.pipeline_value}</div>
            <div className="text-white/70 text-xs">Pipeline</div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-5 -mt-4">
        {/* MAGIC ACTIONS - Zero Input */}
        <h2 className="text-lg font-bold text-gray-800 mb-4 mt-6">Schnell-Start 🚀</h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onScreenshotImport}
            className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl mb-2">
              📱
            </div>
            <span className="text-xs font-semibold text-gray-600 text-center">Screenshot Import</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onVoiceNote}
            className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl mb-2">
              🎤
            </div>
            <span className="text-xs font-semibold text-gray-600 text-center">Sprach-Notiz</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onQRScan}
            className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl mb-2">
              📷
            </div>
            <span className="text-xs font-semibold text-gray-600 text-center">Kontakt Scan</span>
          </motion.button>
        </div>

        {/* DAILY FLOW TASKS */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Dein Daily Flow</h2>
          <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
            {visibleTasks.length} offen
          </span>
        </div>

        {visibleTasks.length > 0 ? (
          visibleTasks.map(task => (
            <SwipeableTaskCard
              key={task.id}
              task={task}
              onAction={(action) => handleTaskAction(task, action)}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 text-center shadow-sm"
          >
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="font-bold text-gray-800 mb-1">Alle Tasks erledigt!</h3>
            <p className="text-gray-500 text-sm">Du bist ein Rockstar. Genieß deinen Tag!</p>
          </motion.div>
        )}

        {/* AI COACH WIDGET */}
        <div className="bg-white rounded-2xl p-5 mt-6 border-l-4 border-purple-500 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-purple-600">SalesFlow Coach</span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            "Hey {userName}! Lisa Müller hat seit 3 Tagen nicht reagiert. 
            Soll ich dir eine freche Sprachnachricht skripten, um das Eis zu brechen?"
          </p>
          <button
            onClick={onAICoachAction}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-bold transition-colors"
          >
            Ja, zeig mir das Skript
          </button>
        </div>

        {/* Spacer for Bottom Nav */}
        <div className="h-24" />
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pb-6 pt-2 flex justify-around items-center">
        <button className="flex flex-col items-center text-blue-500">
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">👥</span>
          <span className="text-xs">Kontakte</span>
        </button>
        
        {/* FAB */}
        <div className="-mt-8">
          <button className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-3xl text-white">+</span>
          </button>
        </div>
        
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">💬</span>
          <span className="text-xs">Chat</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">📊</span>
          <span className="text-xs">Stats</span>
        </button>
      </div>
    </div>
  );
};

export default MobileDashboard;

