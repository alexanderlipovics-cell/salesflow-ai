/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS Dashboard - Feature Card Component                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import type { FeatureCardData } from './types';

interface FeatureCardProps {
  data: FeatureCardData;
}

const IconOutreach: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const IconFinance: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
);

export const FeatureCard: React.FC<FeatureCardProps> = ({ data }) => {
  const isOutreach = data.type === 'outreach';
  const Icon = isOutreach ? IconOutreach : IconFinance;
  
  const glowColor = isOutreach 
    ? 'from-violet-500/10 to-violet-600/5' 
    : 'from-emerald-500/10 to-emerald-600/5';
  
  const accentColor = isOutreach ? 'violet' : 'emerald';
  const borderHover = isOutreach ? 'hover:border-violet-400/40' : 'hover:border-emerald-400/40';
  const iconBg = isOutreach 
    ? 'from-violet-400/20 to-violet-600/10 border-violet-400/30' 
    : 'from-emerald-400/20 to-emerald-600/10 border-emerald-400/30';
  const iconColor = isOutreach ? 'text-violet-300' : 'text-emerald-300';
  const metricColor = isOutreach ? 'text-violet-300' : 'text-emerald-300';
  const trendColor = data.trend?.startsWith('+') ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className={`group relative bg-slate-900/50 backdrop-blur-2xl border border-slate-700/60 rounded-2xl px-6 py-5 transition-all duration-300 ${borderHover} hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(139,92,246,0.1)]`}>
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} border flex items-center justify-center ${iconColor}`}>
              <Icon />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-slate-400">
              {data.title}
            </span>
          </div>
          {data.trend && (
            <span className={`text-xs font-semibold ${trendColor}`}>
              {data.trend}
            </span>
          )}
        </div>
        
        {/* Metric */}
        <div className="mb-4">
          <span className={`text-3xl font-bold ${metricColor}`}>
            {data.metric}
          </span>
        </div>
        
        {/* Mini Chart / Progress Bar */}
        <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${isOutreach ? 'bg-gradient-to-r from-violet-500 to-violet-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
            style={{ width: isOutreach ? '75%' : '62%' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-slate-500">0</span>
          <span className="text-[10px] text-slate-500">{isOutreach ? '500' : '€ 10.000'}</span>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;

