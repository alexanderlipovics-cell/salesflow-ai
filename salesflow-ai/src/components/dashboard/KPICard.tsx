import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import React from "react";

type Tone = "cyan" | "green" | "red" | "yellow";

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: Tone;
  onClick?: () => void;
}

const toneClass: Record<Tone, string> = {
  cyan: "from-cyan-500/20 to-cyan-400/10 border-cyan-500/40",
  green: "from-emerald-500/20 to-emerald-400/10 border-emerald-500/40",
  red: "from-rose-500/20 to-rose-400/10 border-rose-500/40",
  yellow: "from-amber-500/20 to-amber-400/10 border-amber-500/40",
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  color = "cyan",
  onClick,
}) => {
  const TrendIcon = trend?.isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full flex-col gap-3 rounded-2xl border bg-gradient-to-br ${toneClass[color]} p-4 text-left shadow-[0_0_24px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-[0_10px_40px_rgba(34,211,238,0.25)]`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          {title}
        </div>
        <div className="rounded-xl bg-white/5 p-2 text-cyan-300">{icon}</div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="text-3xl font-bold text-white">{value}</div>
        {trend && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              trend.isPositive
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-rose-500/15 text-rose-300"
            }`}
          >
            <TrendIcon size={14} />
            {trend.value}%
          </div>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all group-hover:w-3/4" />
      </div>
    </button>
  );
};

export default KPICard;

