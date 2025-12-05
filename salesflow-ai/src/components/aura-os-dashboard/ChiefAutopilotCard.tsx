/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS Dashboard - CHIEF Autopilot Card (Cockpit Centerpiece)            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import type { ChiefAgent, ChiefMetric } from './types';

interface ChiefAutopilotCardProps {
  agents: ChiefAgent[];
  metrics: ChiefMetric[];
}

export const ChiefAutopilotCard: React.FC<ChiefAutopilotCardProps> = ({ agents, metrics }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-slate-950/90 border border-amber-400/30 backdrop-blur-2xl shadow-[0_0_60px_rgba(251,191,36,0.15)]">
      {/* Ambient Circuit Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Orbital Rings */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-80 h-80 border border-amber-400/10 rounded-full" />
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-64 h-64 border border-amber-400/15 rounded-full" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 h-48 border border-amber-400/20 rounded-full" />
        
        {/* Glowing Dots */}
        <div className="absolute left-24 top-1/4 w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
        <div className="absolute left-40 bottom-1/3 w-1.5 h-1.5 rounded-full bg-amber-300/50 animate-pulse delay-75" />
        <div className="absolute left-16 bottom-1/4 w-1 h-1 rounded-full bg-amber-500/70 animate-pulse delay-150" />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-950/20 to-slate-950/60" />
      </div>

      <div className="relative z-10 px-10 py-8 flex items-center justify-between">
        {/* Left Side - Title Section */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Glow Ring Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/40 blur-md rounded-full" />
              <div className="relative w-10 h-10 rounded-full border-2 border-amber-400/60 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse" />
              </div>
            </div>
            <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-amber-400/80">
              Autonomous System
            </span>
          </div>
          
          <h2 className="text-4xl font-bold tracking-tight text-amber-100 mb-1">
            CHIEF Autopilot
          </h2>
          <p className="text-amber-300/70 text-lg font-medium">
            System autonom
          </p>
          
          {/* Agent Pills */}
          <div className="flex items-center gap-3 mt-6">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                className="px-5 py-2 rounded-full border border-amber-400/50 bg-amber-500/10 backdrop-blur-sm text-xs font-semibold tracking-wider uppercase text-amber-200 hover:bg-amber-500/20 hover:border-amber-400/70 transition-all duration-200 cursor-pointer"
              >
                {agent.name}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Metrics */}
        <div className="flex flex-col gap-3 items-end">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-baseline gap-2 px-4 py-2 rounded-xl bg-slate-900/40 border border-slate-700/40">
              <span className="text-2xl font-bold text-amber-300">{metric.value}</span>
              <span className="text-sm text-slate-400">{metric.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Glow Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
    </div>
  );
};

export default ChiefAutopilotCard;

