import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CopyEvent {
  script_id: string;
  user_id: string | null;
  copied_at: string;
  final_text?: string;
}

// Tracking wenn Script kopiert wird
export const trackScriptCopy = async (scriptId: string, finalText?: string): Promise<void> => {
  try {
    // User ID holen (falls eingeloggt)
    const userId = await AsyncStorage.getItem('user_id');

    // 1. Insert in copy_events Tabelle
    await supabase.from('script_copy_events').insert({
      script_id: scriptId,
      user_id: userId,
      copied_at: new Date().toISOString(),
    });

    // 2. Update copied_count in mlm_scripts
    const { data: script } = await supabase
      .from('mlm_scripts')
      .select('copied_count')
      .eq('id', scriptId)
      .single();

    if (script) {
      await supabase
        .from('mlm_scripts')
        .update({ copied_count: (script.copied_count || 0) + 1 })
        .eq('id', scriptId);
    }

    console.log('Copy tracked:', scriptId);
  } catch (error) {
    console.error('Error tracking copy:', error);
    // Fail silently - don't break UX
  }
};

// Beliebteste Scripts holen
export const getPopularScripts = async (limit: number = 10): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('mlm_scripts')
      .select('*')
      .order('copied_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular scripts:', error);
    return [];
  }
};

// User's Copy History
export const getUserCopyHistory = async (limit: number = 20): Promise<any[]> => {
  try {
    const userId = await AsyncStorage.getItem('user_id');
    if (!userId) return [];

    const { data, error } = await supabase
      .from('script_copy_events')
      .select(`
        *,
        mlm_scripts (*)
      `)
      .eq('user_id', userId)
      .order('copied_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching copy history:', error);
    return [];
  }
};

