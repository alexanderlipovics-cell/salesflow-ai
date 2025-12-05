import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lncwvbhcafkdorypnpnz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3d2YmhjYWZrZG9yeXBucG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTk5MDAsImV4cCI6MjA3OTc3NTkwMH0.6sXqb76w5DXBRz1O4DREbGNNIOVPPynlv6YoixQcMBY';

// Web-compatible storage adapter using localStorage
const webStorage = {
  getItem: (key) => {
    if (typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key, value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable for web
  },
});