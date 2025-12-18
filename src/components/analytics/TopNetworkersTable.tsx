/**
 * Top Networkers Table Component
 * Displays top performing team members with metrics
 */

import React from 'react';
import { TopNetworker } from '../../types/analytics-dashboard';

interface Props {
  data: TopNetworker[];
}

export const TopNetworkersTable: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 dark:text-white">
        🔥 Top Networkers (30 Days)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="text-left p-2 dark:text-gray-300">Rank</th>
              <th className="text-left p-2 dark:text-gray-300">Name</th>
              <th className="text-center p-2 dark:text-gray-300">Streak</th>
              <th className="text-center p-2 dark:text-gray-300">Contacts</th>
              <th className="text-center p-2 dark:text-gray-300">Conv.</th>
              <th className="text-center p-2 dark:text-gray-300">Rate %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((networker, index) => (
              <tr
                key={networker.user_id}
                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="p-2">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </td>
                <td className="p-2 font-medium dark:text-white">{networker.name}</td>
                <td className="p-2 text-center">
                  <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                    {networker.current_streak} 🔥
                  </span>
                </td>
                <td className="p-2 text-center dark:text-gray-300">{networker.contacts_30d}</td>
                <td className="p-2 text-center dark:text-gray-300">{networker.conversions_30d}</td>
                <td className="p-2 text-center">
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {networker.conversion_rate_30d_pct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

