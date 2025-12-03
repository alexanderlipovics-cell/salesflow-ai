/**
 * Goal Progress Bar
 * 
 * Zeigt Fortschritt zum Monatsziel mit Farb-Kodierung:
 * - Grün: >80%
 * - Gelb: 50-80%
 * - Rot: <50%
 */

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface GoalProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showTrend?: boolean;
}

export const GoalProgressBar: React.FC<GoalProgressBarProps> = ({
  current,
  target,
  label = "Fortschritt",
  showTrend = true,
}) => {
  const percent = target > 0 ? Math.round((current / target) * 100) : 0;
  const cappedPercent = Math.min(100, percent);

  // Farb-Kodierung
  const getColor = () => {
    if (percent >= 80) return "emerald";
    if (percent >= 50) return "amber";
    return "red";
  };

  const color = getColor();

  const colorClasses = {
    emerald: {
      bar: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    amber: {
      bar: "bg-amber-500",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
    },
    red: {
      bar: "bg-red-500",
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/30",
    },
  };

  const classes = colorClasses[color];

  // Trend Icon
  const TrendIcon = percent >= 100 ? TrendingUp : percent >= 50 ? Minus : TrendingDown;

  return (
    <div className="space-y-2">
      {/* Label & Percent */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${classes.text}`}>{percent}%</span>
          {showTrend && <TrendIcon className={`h-4 w-4 ${classes.text}`} />}
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`h-3 w-full overflow-hidden rounded-full ${classes.bg}`}>
        <div
          className={`h-full transition-all duration-500 ${classes.bar}`}
          style={{ width: `${cappedPercent}%` }}
        />
      </div>

      {/* Values */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{current.toLocaleString("de-DE")} €</span>
        <span>{target.toLocaleString("de-DE")} €</span>
      </div>
    </div>
  );
};

