import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://lncwvbhcafkdorypnpnz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3d2YmhjYWZrZG9yeXBucG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTk5MDAsImV4cCI6MjA3OTc3NTkwMH0.6sXqb76w5DXBRz1O4DREbGNNIOVPPynlv6YoixQcMBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});