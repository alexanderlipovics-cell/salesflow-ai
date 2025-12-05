import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const FREE_LEAD_LIMIT = 5;

export const checkIsPro = async (): Promise<boolean> => {
  try {
    const proStatus = await AsyncStorage.getItem('is_pro');
    return proStatus === 'true';
  } catch {
    return false;
  }
};

export const getLeadCount = async (): Promise<number> => {
  try {
    const count = await AsyncStorage.getItem('lead_count');
    return parseInt(count || '0');
  } catch {
    return 0;
  }
};

export const canAddLead = async (): Promise<boolean> => {
  const isPro = await checkIsPro();
  if (isPro) return true;
  
  const count = await getLeadCount();
  return count < FREE_LEAD_LIMIT;
};

export const canUseAI = async (): Promise<boolean> => {
  return await checkIsPro();
};

