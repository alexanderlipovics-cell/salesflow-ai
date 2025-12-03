/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS Dashboard - Header Bar Component                                  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { AuraOsLogo } from './AuraOsLogo';

export const HeaderBar: React.FC = () => {
  return (
    <header className="flex items-center justify-between mb-8">
      {/* Logo & Wordmark */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {/* Glow Effect Behind Logo */}
          <div className="absolute inset-0 bg-cyan-400/30 blur-xl rounded-full animate-pulse" />
          <AuraOsLogo size={40} className="relative z-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
        </div>
        <span className="text-slate-50 text-2xl font-semibold tracking-[0.25em] uppercase">
          AURA OS
        </span>
      </div>

      {/* Meta Items */}
      <div className="flex items-center gap-6">
        {/* Version Pill */}
        <div className="px-4 py-1.5 rounded-full bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 text-slate-400 text-xs font-medium tracking-wide">
          Version 1.0 • Stable
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>
          <span className="text-slate-400 text-xs font-medium tracking-wide">
            System active
          </span>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;

