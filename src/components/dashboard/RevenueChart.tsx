/**
 * Revenue Chart Component
 * 
 * Heavy component - lazy loaded for performance
 * Uses Recharts for visualization
 * 
 * @author Gemini 3 Ultra - Frontend Optimization
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartData } from '../../hooks/useDashboardData';

interface RevenueChartProps {
  data?: ChartData[];
  range: string;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, range }) => {
  // Mock data if not provided
  const chartData = data || [
    { date: '01.01', revenue: 4000, leads: 24 },
    { date: '02.01', revenue: 3000, leads: 18 },
    { date: '03.01', revenue: 5000, leads: 29 },
    { date: '04.01', revenue: 2780, leads: 19 },
    { date: '05.01', revenue: 4890, leads: 28 },
    { date: '06.01', revenue: 6390, leads: 35 },
    { date: '07.01', revenue: 5490, leads: 31 },
  ];

  return (
    <div className="h-full min-h-[320px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Umsatzentwicklung</h3>
          <p className="text-sm text-gray-400">Zeitraum: {range === '7d' ? 'Letzte 7 Tage' : 'Letzte 30 Tage'}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `€${value}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              backdropFilter: 'blur(12px)'
            }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color: '#10b981' }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#10b981" 
            strokeWidth={2}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;

