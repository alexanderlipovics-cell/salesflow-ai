/**
 * Best Send Time Chart Component
 * Shows optimal hours for sending messages based on reply rates
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BestSendTime } from '../../types/analytics-dashboard';

interface Props {
  data: BestSendTime[];
}

export const BestSendTimeChart: React.FC<Props> = ({ data }) => {
  const formattedData = data.map(d => ({
    ...d,
    hour_label: `${d.hour_of_day}:00`
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 dark:text-white">
        ⏰ Best Time to Send
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <XAxis dataKey="hour_label" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="reply_rate_pct"
            stroke="#FF9800"
            strokeWidth={3}
            dot={{ fill: '#FF9800', r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

