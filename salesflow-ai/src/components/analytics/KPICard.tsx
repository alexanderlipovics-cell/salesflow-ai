/**
 * KPI Card Component
 * Displays key performance indicators
 */

import React from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const KPICard: React.FC<Props> = ({ title, value, subtitle, icon, trend }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h4>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold dark:text-white mb-1">{value}</div>
      {subtitle && (
        <div className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>
      )}
      {trend && (
        <div className="mt-2">
          {trend === 'up' && <span className="text-green-600">↑ Trending up</span>}
          {trend === 'down' && <span className="text-red-600">↓ Trending down</span>}
          {trend === 'neutral' && <span className="text-gray-600">→ Stable</span>}
        </div>
      )}
    </div>
  );
};

