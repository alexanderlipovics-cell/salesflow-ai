import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

interface SubscriptionContextType {
  isPro: boolean;
  leadCount: number;
  aiCallsToday: number;
  checkCanAddLead: () => boolean;
  checkCanUseAI: () => boolean;
  incrementLeadCount: () => void;
  incrementAICalls: () => void;
  upgradeToPro: () => void;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// FREE LIMITS
const FREE_LEAD_LIMIT = 5;
const FREE_AI_CALLS_PER_DAY = 0; // Free users get no AI

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const [aiCallsToday, setAICallsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      // Check local storage first
      const proStatus = await AsyncStorage.getItem('is_pro');
      const storedLeadCount = await AsyncStorage.getItem('lead_count');
      const storedAICalls = await AsyncStorage.getItem('ai_calls_today');
      const lastAIReset = await AsyncStorage.getItem('ai_calls_reset_date');

      setIsPro(proStatus === 'true');
      setLeadCount(parseInt(storedLeadCount || '0'));

      // Reset AI calls if new day
      const today = new Date().toDateString();
      if (lastAIReset !== today) {
        await AsyncStorage.setItem('ai_calls_today', '0');
        await AsyncStorage.setItem('ai_calls_reset_date', today);
        setAICallsToday(0);
      } else {
        setAICallsToday(parseInt(storedAICalls || '0'));
      }

      // Sync with Supabase if user logged in
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        const { data } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (data?.is_pro) {
          setIsPro(true);
          await AsyncStorage.setItem('is_pro', 'true');
        }
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanAddLead = (): boolean => {
    if (isPro) return true;
    return leadCount < FREE_LEAD_LIMIT;
  };

  const checkCanUseAI = (): boolean => {
    if (isPro) return true;
    return false; // Free users cannot use AI
  };

  const incrementLeadCount = async () => {
    const newCount = leadCount + 1;
    setLeadCount(newCount);
    await AsyncStorage.setItem('lead_count', newCount.toString());
  };

  const incrementAICalls = async () => {
    const newCount = aiCallsToday + 1;
    setAICallsToday(newCount);
    await AsyncStorage.setItem('ai_calls_today', newCount.toString());
  };

  const upgradeToPro = async () => {
    setIsPro(true);
    await AsyncStorage.setItem('is_pro', 'true');
    
    // Sync to Supabase
    const userId = await AsyncStorage.getItem('user_id');
    if (userId) {
      await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        is_pro: true,
        upgraded_at: new Date().toISOString(),
      });
    }
  };

  return (
    <SubscriptionContext.Provider value={{
      isPro,
      leadCount,
      aiCallsToday,
      checkCanAddLead,
      checkCanUseAI,
      incrementLeadCount,
      incrementAICalls,
      upgradeToPro,
      loading,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

