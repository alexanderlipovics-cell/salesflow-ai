import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIGURATION - salesflow-mobile
// ═══════════════════════════════════════════════════════════════════════════

const supabaseUrl = 'https://ydnlxqjblvtoemqbjcai.supabase.co';
// TODO: Anon Key aus Umgebungsvariablen oder sicherer Config holen
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'salesflow-mobile',
    },
  },
});

