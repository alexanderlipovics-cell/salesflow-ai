import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  showTutorial: boolean;
  currentTutorialStep: number;
  setOnboardingComplete: (value: boolean) => void;
  setShowTutorial: (value: boolean) => void;
  setCurrentTutorialStep: (step: number) => void;
  completeTutorial: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      const tutorialShown = await AsyncStorage.getItem('tutorial_shown');
      
      setIsOnboardingComplete(completed === 'true');
      setShowTutorial(tutorialShown !== 'true' && completed === 'true');
    } catch (error) {
      console.error('Failed to load onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const setOnboardingComplete = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('onboarding_completed', value.toString());
      setIsOnboardingComplete(value);
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
    }
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem('tutorial_shown', 'true');
      setShowTutorial(false);
    } catch (error) {
      console.error('Failed to save tutorial status:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.multiRemove([
        'onboarding_completed',
        'tutorial_shown',
        'checklist_progress'
      ]);
      setIsOnboardingComplete(false);
      setShowTutorial(false);
      setCurrentTutorialStep(0);
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  };

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        showTutorial,
        currentTutorialStep,
        setOnboardingComplete,
        setShowTutorial,
        setCurrentTutorialStep,
        completeTutorial,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

