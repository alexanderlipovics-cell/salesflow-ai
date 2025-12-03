import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TooltipConfig {
  id: string;
  text: string;
  shown: boolean;
}

const defaultTooltips: TooltipConfig[] = [
  {
    id: 'add_lead_button',
    text: 'Tippe hier, um deinen ersten Lead hinzuzufügen!',
    shown: false,
  },
  {
    id: 'ai_chat',
    text: 'Probiere die KI-Chat-Funktion aus, um Lead-Daten automatisch zu erfassen.',
    shown: false,
  },
  {
    id: 'bant_score',
    text: 'Hier siehst du den BANT-Score deines Leads.',
    shown: false,
  },
  {
    id: 'follow_up',
    text: 'Die KI schlägt dir automatisch Follow-up-Termine vor.',
    shown: false,
  },
];

export function useOnboardingTooltips() {
  const [tooltips, setTooltips] = useState<TooltipConfig[]>(defaultTooltips);
  const [currentTooltip, setCurrentTooltip] = useState<TooltipConfig | null>(null);

  useEffect(() => {
    loadTooltipStatus();
  }, []);

  const loadTooltipStatus = async () => {
    try {
      const storedTooltips = await AsyncStorage.getItem('tooltips_shown');
      if (storedTooltips) {
        const shownIds = JSON.parse(storedTooltips);
        setTooltips(prev =>
          prev.map(tooltip => ({
            ...tooltip,
            shown: shownIds.includes(tooltip.id),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load tooltip status:', error);
    }
  };

  const showTooltip = (id: string) => {
    const tooltip = tooltips.find(t => t.id === id && !t.shown);
    if (tooltip) {
      setCurrentTooltip(tooltip);
    }
  };

  const dismissTooltip = async (id: string) => {
    try {
      const updatedTooltips = tooltips.map(tooltip =>
        tooltip.id === id ? { ...tooltip, shown: true } : tooltip
      );
      setTooltips(updatedTooltips);
      setCurrentTooltip(null);

      // Save to storage
      const shownIds = updatedTooltips.filter(t => t.shown).map(t => t.id);
      await AsyncStorage.setItem('tooltips_shown', JSON.stringify(shownIds));
    } catch (error) {
      console.error('Failed to save tooltip status:', error);
    }
  };

  const resetTooltips = async () => {
    try {
      await AsyncStorage.removeItem('tooltips_shown');
      setTooltips(defaultTooltips);
      setCurrentTooltip(null);
    } catch (error) {
      console.error('Failed to reset tooltips:', error);
    }
  };

  return {
    currentTooltip,
    showTooltip,
    dismissTooltip,
    resetTooltips,
    allTooltipsShown: tooltips.every(t => t.shown),
  };
}

