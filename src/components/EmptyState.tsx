// components/EmptyState.tsx

import React from 'react';
import { Brain, TrendingUp, Users } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-squad' | 'no-challenge' | 'no-data';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  const config = {
    'no-squad': {
      icon: Users,
      title: 'Kein Squad gefunden',
      description: 'Du bist derzeit in keinem Squad. Tritt einem Squad bei oder erstelle ein neues.',
      action: 'Squad beitreten'
    },
    'no-challenge': {
      icon: TrendingUp,
      title: 'Keine aktive Challenge',
      description: 'Dein Squad hat momentan keine laufende Challenge. Starte eine neue Challenge, um loszulegen.',
      action: 'Challenge erstellen'
    },
    'no-data': {
      icon: Brain,
      title: 'Noch keine Daten vorhanden',
      description: 'Sobald dein Squad aktiv ist, erscheinen hier Coaching-Insights und Empfehlungen.',
      action: null
    }
  };
  
  const { icon: Icon, title, description, action } = config[type];
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
        <Icon className="h-12 w-12 text-gray-400 dark:text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-4">
        {description}
      </p>
      {action && (
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
          {action}
        </button>
      )}
    </div>
  );
};

