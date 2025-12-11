/**
 * DailyFlowWidget - "Was muss ich HEUTE tun?"
 * 
 * Das wichtigste Widget für Networker:
 * - Zeigt tägliche Aufgaben basierend auf Zielen
 * - Priorisiert Hot Leads
 * - Motiviert mit Fortschritt
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface DailyTask {
  id: string;
  type: 'followup' | 'new_contact' | 'reactivation' | 'call' | 'event';
  title: string;
  subtitle: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  completed: boolean;
  lead?: {
    id: string;
    name: string;
    avatar?: string;
    sentiment?: string;
  };
  dueTime?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface DailyFlowStats {
  followups_due: number;
  followups_done: number;
  new_contacts_target: number;
  new_contacts_done: number;
  reactivations_target: number;
  reactivations_done: number;
  calls_scheduled: number;
  calls_done: number;
}

interface DailyFlowWidgetProps {
  tasks?: DailyTask[];
  stats?: DailyFlowStats;
  goalProgress?: number; // 0-100
  onTaskComplete?: (taskId: string) => void;
  onTaskClick?: (task: DailyTask) => void;
  onQuickAction?: (action: string) => void;
  compact?: boolean;
}

// Default Stats für Demo
const DEFAULT_STATS: DailyFlowStats = {
  followups_due: 5,
  followups_done: 2,
  new_contacts_target: 8,
  new_contacts_done: 3,
  reactivations_target: 2,
  reactivations_done: 0,
  calls_scheduled: 2,
  calls_done: 1,
};

// Demo Tasks
const DEMO_TASKS: DailyTask[] = [
  {
    id: '1',
    type: 'followup',
    title: 'Max Mustermann',
    subtitle: 'Follow-up seit 2 Tagen fällig',
    priority: 'urgent',
    completed: false,
    lead: { id: 'l1', name: 'Max Mustermann', sentiment: 'hot' },
    action: { label: '💬 Nachricht', onClick: () => {} },
  },
  {
    id: '2',
    type: 'followup',
    title: 'Lisa Schmidt',
    subtitle: 'Hat Video angeschaut',
    priority: 'high',
    completed: false,
    lead: { id: 'l2', name: 'Lisa Schmidt', sentiment: 'warm' },
    action: { label: '📞 Anrufen', onClick: () => {} },
  },
  {
    id: '3',
    type: 'new_contact',
    title: '5 neue Kontakte machen',
    subtitle: '3 von 8 erledigt',
    priority: 'normal',
    completed: false,
    action: { label: '➕ Hinzufügen', onClick: () => {} },
  },
  {
    id: '4',
    type: 'reactivation',
    title: 'Thomas Weber reaktivieren',
    subtitle: 'Seit 14 Tagen keine Antwort',
    priority: 'normal',
    completed: false,
    lead: { id: 'l3', name: 'Thomas Weber', sentiment: 'ghost' },
    action: { label: '🔄 Phoenix', onClick: () => {} },
  },
];

// Icon Map
const TYPE_ICONS: Record<string, string> = {
  followup: '🔔',
  new_contact: '👋',
  reactivation: '🔄',
  call: '📞',
  event: '📅',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-red-500 bg-red-500/10',
  high: 'border-orange-500 bg-orange-500/10',
  normal: 'border-blue-500 bg-blue-500/10',
  low: 'border-gray-500 bg-gray-500/10',
};

const SENTIMENT_BADGES: Record<string, { label: string; color: string }> = {
  hot: { label: '🔥 Hot', color: 'bg-red-500' },
  warm: { label: '☀️ Warm', color: 'bg-orange-500' },
  neutral: { label: '😐', color: 'bg-gray-500' },
  cold: { label: '❄️', color: 'bg-blue-500' },
  ghost: { label: '👻', color: 'bg-purple-500' },
};

export const DailyFlowWidget: React.FC<DailyFlowWidgetProps> = ({
  tasks = [],
  stats = {
    followups_due: 0,
    followups_done: 0,
    new_contacts_target: 0,
    new_contacts_done: 0,
    reactivations_target: 0,
    reactivations_done: 0,
    calls_scheduled: 0,
    calls_done: 0,
  },
  goalProgress = 0,
  onTaskComplete,
  onTaskClick,
  onQuickAction,
  compact = false,
}) => {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // Berechne Gesamtfortschritt
  const totalTasks = stats.followups_due + stats.new_contacts_target + stats.reactivations_target;
  const totalDone = stats.followups_done + stats.new_contacts_done + stats.reactivations_done;
  const dayProgress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  // Task Completion Handler
  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTasks(prev => new Set([...prev, taskId]));
    onTaskComplete?.(taskId);
  };

  // Filtere nicht erledigte Tasks
  const pendingTasks = tasks.filter(t => !t.completed && !completedTasks.has(t.id));
  const urgentCount = pendingTasks.filter(t => t.priority === 'urgent').length;

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-white/10 overflow-hidden ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🔥 Dein Tag
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                {urgentCount} dringend
              </span>
            )}
          </h2>
          <p className="text-gray-400 text-sm">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        
        {/* Mini Progress Ring */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-700"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={2 * Math.PI * 28}
              strokeDashoffset={2 * Math.PI * 28 * (1 - dayProgress / 100)}
              strokeLinecap="round"
              className="text-green-500"
              initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - dayProgress / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{dayProgress}%</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {stats.followups_done}/{stats.followups_due}
          </div>
          <div className="text-xs text-gray-400">Follow-ups</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {stats.new_contacts_done}/{stats.new_contacts_target}
          </div>
          <div className="text-xs text-gray-400">Neue Kontakte</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {stats.reactivations_done}/{stats.reactivations_target}
          </div>
          <div className="text-xs text-gray-400">Reaktivierungen</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {stats.calls_done}/{stats.calls_scheduled}
          </div>
          <div className="text-xs text-gray-400">Calls</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => onQuickAction?.('import')}
          className="flex-1 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl text-purple-300 text-sm font-medium transition-all"
        >
          📥 Chat Import
        </button>
        <button
          onClick={() => onQuickAction?.('new_lead')}
          className="flex-1 py-2 px-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-300 text-sm font-medium transition-all"
        >
          ➕ Neuer Lead
        </button>
        <button
          onClick={() => onQuickAction?.('ai_message')}
          className="flex-1 py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-300 text-sm font-medium transition-all"
        >
          ✨ AI Nachricht
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Anstehende Aufgaben</span>
          <span className="text-gray-500">{pendingTasks.length} offen</span>
        </div>

        <AnimatePresence>
          {pendingTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onTaskClick?.(task)}
              className={`relative p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:scale-[1.02] ${PRIORITY_COLORS[task.priority]}`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={(e) => handleComplete(task.id, e)}
                  className="w-6 h-6 rounded-full border-2 border-gray-500 hover:border-green-500 hover:bg-green-500/20 flex items-center justify-center transition-all flex-shrink-0 mt-0.5"
                >
                  {completedTasks.has(task.id) && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-500"
                    >
                      ✓
                    </motion.span>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICONS[task.type]}</span>
                    <span className="text-white font-medium truncate">{task.title}</span>
                    {task.lead?.sentiment && SENTIMENT_BADGES[task.lead.sentiment] && (
                      <span className={`px-1.5 py-0.5 text-xs rounded ${SENTIMENT_BADGES[task.lead.sentiment].color} text-white`}>
                        {SENTIMENT_BADGES[task.lead.sentiment].label}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm truncate">{task.subtitle}</p>
                </div>

                {/* Action Button */}
                {task.action && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      task.action?.onClick();
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-all flex-shrink-0"
                  >
                    {task.action.label}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {pendingTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="text-4xl mb-2">📝</div>
            <p className="text-white font-medium">
              Noch keine Aktivitäten.{" "}
              <button
                type="button"
                onClick={() => onQuickAction?.('new_lead')}
                className="text-emerald-400 hover:text-emerald-300 underline"
              >
                Erstelle deinen ersten Lead!
              </button>
            </p>
            <p className="text-gray-400 text-sm">Leads oder Follow-ups erscheinen hier, sobald sie verfügbar sind.</p>
          </motion.div>
        )}
      </div>

      {/* Goal Progress Footer */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Monatsfortschritt</span>
          <span className="text-white font-bold">{goalProgress}%</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${goalProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-1 text-center">
          🎯 Noch {Math.round((100 - goalProgress) / 3.33)} Tage bis zum Ziel
        </p>
      </div>
    </div>
  );
};

export default DailyFlowWidget;

