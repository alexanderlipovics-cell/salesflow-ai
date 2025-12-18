/**
 * Daily Target Card
 * 
 * Zeigt die täglichen Soll-Werte mit Fortschritt:
 * - Erstkontakte
 * - Follow-ups
 * - Meetings
 */

import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { DailyPlan } from "@/hooks/useGoalEngine";

interface DailyTargetCardProps {
  dailyPlan: DailyPlan;
}

export const DailyTargetCard: React.FC<DailyTargetCardProps> = ({ dailyPlan }) => {
  const tasks = [
    {
      label: "Erstkontakte",
      completed: dailyPlan.completed_new_contacts,
      target: dailyPlan.target_new_contacts,
      color: "emerald",
    },
    {
      label: "Follow-ups",
      completed: dailyPlan.completed_followups,
      target: dailyPlan.target_followups,
      color: "blue",
    },
    {
      label: "Closing-Calls",
      completed: dailyPlan.completed_meetings,
      target: dailyPlan.target_meetings,
      color: "purple",
    },
  ];

  const totalCompleted = tasks.reduce((sum, task) => sum + task.completed, 0);
  const totalTarget = tasks.reduce((sum, task) => sum + task.target, 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Heute - Dein Weg zum Ziel</h3>
          <p className="text-xs text-slate-400">Arbeite diese Liste ab, um dein Monatsziel zu erreichen</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-emerald-400">{overallPercent}%</p>
          <p className="text-xs text-slate-500">Gesamt</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isComplete = task.completed >= task.target;
          const percent = task.target > 0 ? Math.round((task.completed / task.target) * 100) : 0;

          return (
            <div key={task.label} className="space-y-2">
              {/* Task Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-600" />
                  )}
                  <span className="text-sm font-medium text-slate-200">{task.label}</span>
                </div>
                <span className="text-sm text-slate-400">
                  {task.completed} / {task.target}
                </span>
              </div>

              {/* Mini Progress Bar */}
              <div className="ml-8 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className={`h-full transition-all duration-300 ${
                    isComplete
                      ? "bg-emerald-500"
                      : task.color === "blue"
                      ? "bg-blue-500"
                      : task.color === "purple"
                      ? "bg-purple-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

