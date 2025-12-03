/**
 * Template Winners Chart Component
 * Displays top performing templates by partner conversions
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TemplateWinner } from '../../types/analytics-dashboard';

interface Props {
  data: TemplateWinner[];
}

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];

export const TemplateWinnersChart: React.FC<Props> = ({ data }) => {
  const top5 = data.slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 dark:text-white">
        🏆 Top Templates (Partner Conversions - 30d)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={top5}>
          <XAxis
            dataKey="template_name"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="partner_conversions_30d" radius={[8, 8, 0, 0]}>
            {top5.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

