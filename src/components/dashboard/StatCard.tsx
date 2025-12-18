/**
 * StatCard Component - Aura OS Design System
 * 
 * Glassmorphism card with smooth animations
 * Memoized for performance optimization
 * 
 * @author Gemini 3 Ultra - Frontend Optimization
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
}

// 1. Performance: React.memo verhindert Re-Renders, wenn Props gleich bleiben
export const StatCard = memo(({ title, value, trend, icon }: StatCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
      </div>
      <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
        {icon}
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2">
      <span className={`text-sm font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {trend > 0 ? '+' : ''}{trend}%
      </span>
      <span className="text-xs text-gray-500">vs. letzten Monat</span>
    </div>
    
    {/* Subtle gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
  </motion.div>
));

StatCard.displayName = 'StatCard';

