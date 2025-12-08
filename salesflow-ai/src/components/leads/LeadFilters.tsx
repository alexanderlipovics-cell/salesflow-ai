import React from 'react';
import { Clock, Flame, AlertTriangle, Users } from 'lucide-react';
import clsx from 'clsx';

interface LeadFiltersProps {
  activeFilter: 'today' | 'hot' | 'overdue' | 'all';
  onFilterChange: (filter: 'today' | 'hot' | 'overdue' | 'all') => void;
  leadCounts: {
    today: number;
    hot: number;
    overdue: number;
    all: number;
  };
}

const LeadFilters: React.FC<LeadFiltersProps> = ({
  activeFilter,
  onFilterChange,
  leadCounts
}) => {
  const filters = [
    {
      id: 'today' as const,
      label: 'Heute dran',
      icon: Clock,
      color: 'bg-blue-500',
      count: leadCounts.today,
      description: 'Follow-ups für heute'
    },
    {
      id: 'hot' as const,
      label: 'Hot',
      icon: Flame,
      color: 'bg-red-500',
      count: leadCounts.hot,
      description: 'Score ≥ 80'
    },
    {
      id: 'overdue' as const,
      label: 'Überfällig',
      icon: AlertTriangle,
      color: 'bg-orange-500',
      count: leadCounts.overdue,
      description: 'Überfällige Follow-ups'
    },
    {
      id: 'all' as const,
      label: 'Alle',
      icon: Users,
      color: 'bg-gray-500',
      count: leadCounts.all,
      description: 'Alle Leads'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Schnellfilter
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={clsx(
                'p-4 rounded-lg border-2 transition-all duration-200 text-left group',
                isActive
                  ? `${filter.color} border-current text-white shadow-lg`
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon
                  className={clsx(
                    'w-5 h-5',
                    isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                  )}
                />
                <span
                  className={clsx(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {filter.count}
                </span>
              </div>

              <div className="font-semibold text-sm mb-1">
                {filter.label}
              </div>

              <div
                className={clsx(
                  'text-xs',
                  isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {filter.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeadFilters;
