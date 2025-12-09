import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAuth } from '@/context/AuthContext';

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="ai-chat"]',
    content:
      '💬 Dein AI Copilot - Frag mich alles! Ich kann Leads anlegen, Follow-ups planen und Nachrichten schreiben.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="leads"]',
    content: '👥 Hier sind alle deine Leads. Ich sortiere sie automatisch nach Priorität.',
    placement: 'right',
  },
  {
    target: '[data-tour="followups"]',
    content: '✅ Deine täglichen Aufgaben. Nie wieder ein Follow-up vergessen!',
    placement: 'right',
  },
  {
    target: '[data-tour="quick-actions"]',
    content: '⚡ Quick Actions - Ein Klick für häufige Aufgaben.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="chat-input"]',
    content: '✨ Probier es aus: Schreib "Zeig mir meine Top Leads" oder nutze /help für alle Commands.',
    placement: 'top',
  },
];

export const ProductTour: React.FC = () => {
  const { user } = useAuth();
  const [run, setRun] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem(`tour_completed_${user?.id}`);
    if (!tourCompleted && user?.id) {
      // leichte Verzögerung, damit das UI gerendert ist
      setTimeout(() => setRun(true), 1000);
    }
  }, [user?.id]);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      if (user?.id) {
        localStorage.setItem(`tour_completed_${user.id}`, 'true');
      }
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      locale={{
        back: 'Zurück',
        close: 'Schließen',
        last: 'Fertig!',
        next: 'Weiter',
        skip: 'Überspringen',
      }}
      styles={{
        options: {
          primaryColor: '#3B82F6',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
        },
      }}
    />
  );
};

export const resetTour = (userId: string) => {
  localStorage.removeItem(`tour_completed_${userId}`);
};

