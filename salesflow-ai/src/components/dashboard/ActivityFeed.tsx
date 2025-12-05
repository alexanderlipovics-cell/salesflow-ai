/**
 * Activity Feed Component
 * 
 * Shows recent user activities
 * Lazy loaded for performance
 * 
 * @author Gemini 3 Ultra - Frontend Optimization
 */

import React from 'react';
import { Activity as ActivityType } from '../../hooks/useDashboardData';
import { MessageSquare, UserPlus, DollarSign, TrendingUp } from 'lucide-react';

interface ActivityFeedProps {
  activities?: ActivityType[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  // Mock data if not provided
  const items = activities || [
    {
      id: '1',
      type: 'message',
      message: 'Neue Nachricht von Max Mustermann',
      timestamp: '2 Min',
      user: 'Max M.'
    },
    {
      id: '2',
      type: 'lead',
      message: 'Neuer Lead erstellt',
      timestamp: '15 Min',
      user: 'Anna K.'
    },
    {
      id: '3',
      type: 'sale',
      message: 'Deal abgeschlossen: €5.000',
      timestamp: '1 Std',
      user: 'Tom S.'
    },
    {
      id: '4',
      type: 'ai',
      message: 'AI Copilot Suggestion angewendet',
      timestamp: '2 Std',
      user: 'Lisa M.'
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare size={16} className="text-blue-400" />;
      case 'lead':
        return <UserPlus size={16} className="text-green-400" />;
      case 'sale':
        return <DollarSign size={16} className="text-yellow-400" />;
      case 'ai':
        return <TrendingUp size={16} className="text-purple-400" />;
      default:
        return <Activity size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Letzte Aktivitäten</h3>
        <p className="text-sm text-gray-400">Echtzeit Updates</p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={item.id}
            className="group flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition-all hover:border-white/10 hover:bg-white/10"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="mt-0.5 rounded-md bg-white/10 p-2">
              {getIcon(item.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                {item.message}
              </p>
              {item.user && (
                <p className="mt-1 text-xs text-gray-500">
                  {item.user}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {item.timestamp}
            </span>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
        Alle anzeigen
      </button>
    </div>
  );
};

export default ActivityFeed;

