import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../constants/api';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  API_CONFIG.SUPABASE_URL,
  API_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Scripts laden
export async function getScripts(company?: string, category?: string) {
  try {
    let query = supabase.from('mlm_scripts').select('*');
    
    if (company) query = query.eq('company', company);
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query.limit(50);
    
    if (error) {
      console.error('Supabase error:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('getScripts error:', e);
    return [];
  }
}

// Einwände laden
export async function getObjections(searchTerm?: string) {
  try {
    let query = supabase.from('objection_responses').select('*');
    
    if (searchTerm) {
      query = query.ilike('objection', `%${searchTerm}%`);
    }
    
    const { data, error } = await query.limit(20);
    
    if (error) {
      console.error('Supabase error:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('getObjections error:', e);
    return [];
  }
}

// Leads laden
export async function getLeads(userId: string) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Supabase error:', error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('getLeads error:', e);
    return [];
  }
}
