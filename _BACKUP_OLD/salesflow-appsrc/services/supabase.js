import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://incwvbhcafkdorppnpnz.supabase.co';
const supabaseAnonKey = 'sb_publishable_jCF8JiCuSj-cYmCfI6CDVw_qzJbImFu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});