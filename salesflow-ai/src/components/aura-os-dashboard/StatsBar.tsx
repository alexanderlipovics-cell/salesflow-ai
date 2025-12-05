/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS Dashboard - Stats Bar Component                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import type { StatItem } from './types';

interface StatsBarProps {
  stats: StatItem[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  return (
    <div className="relative rounded-2xl bg-cyan-500/10 border border-cyan-400/30 backdrop-blur-2xl px-6 py-3 flex items-center justify-between shadow-[0_0_40px_rgba(34,211,238,0.1)]">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/5 via-transparent to-cyan-400/5" />
      
      {/* Stats */}
      <div className="relative z-10 flex items-center gap-8">
        {stats.map((stat, index) => (
          <React.Fragment key={stat.label}>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-cyan-300">{stat.value}</span>
              <span className="text-sm text-slate-400 font-medium">{stat.label}</span>
            </div>
            {index < stats.length - 1 && (
              <div className="w-px h-5 bg-cyan-400/30" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Live Indicator */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/40">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-aura-pulse" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
          Live
        </span>
      </div>
    </div>
  );
};

export default StatsBar;

