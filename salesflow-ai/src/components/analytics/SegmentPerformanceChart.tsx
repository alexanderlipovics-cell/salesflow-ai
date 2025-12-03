/**
 * Segment Performance Chart Component
 * Displays segment performance with leads and conversions
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SegmentPerformance } from '../../types/analytics-dashboard';

interface Props {
  data: SegmentPerformance[];
}

export const SegmentPerformanceChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 dark:text-white">
        🎯 Segment Performance
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="segment_name" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="leads_in_segment" fill="#2196F3" name="Total Leads" />
          <Bar dataKey="partner_conversions" fill="#4CAF50" name="Conversions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

