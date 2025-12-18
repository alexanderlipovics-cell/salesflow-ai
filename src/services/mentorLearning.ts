/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MENTOR LEARNING SERVICE                                                    ║
 * ║  Tracking & Personalisierung für MENTOR Learning System                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from './supabase';

// Web-compatible storage adapter
const storage = {
  getItem: (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
};

export type ActionType = 
  | 'script_shown' 
  | 'script_copied' 
  | 'script_sent' 
  | 'lead_converted' 
  | 'lead_rejected'
  | 'follow_up_sent';

export type Outcome = 'positive' | 'negative' | 'neutral' | 'pending';

export interface TrackInteractionParams {
  actionType: ActionType;
  scriptId?: string;
  contactId?: string;
  messageText?: string;
  outcome?: Outcome;
}

export const MentorLearning = {
  /**
   * Track jede Interaktion
   */
  async trackInteraction(params: TrackInteractionParams): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[MentorLearning] No user, skipping tracking');
        return;
      }

      // RPC Call zu Supabase
      const { error } = await supabase.rpc('track_mentor_interaction', {
        p_user_id: user.id,
        p_action_type: params.actionType,
        p_script_id: params.scriptId || null,
        p_contact_id: params.contactId || null,
        p_message_text: params.messageText || null,
        p_outcome: params.outcome || 'pending',
      });

      if (error) {
        console.error('[MentorLearning] Error tracking interaction:', error);
        // Still im Hintergrund, keine UI-Fehler
      }
    } catch (error) {
      console.error('[MentorLearning] Exception tracking interaction:', error);
      // Still im Hintergrund, keine UI-Fehler
    }
  },

  /**
   * Hole personalisierte Scripts für User
   */
  async getPersonalizedScripts(category: string, vertical?: string): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Erst User's Top Scripts
      const { data: profile } = await supabase
        .from('user_learning_profile')
        .select('top_script_ids')
        .eq('user_id', user.id)
        .single();

      // Dann alle Scripts sortiert nach Performance
      let query = supabase
        .from('script_library')
        .select('*')
        .eq('category', category)
        .eq('is_active', true);

      // Vertical Filter
      if (vertical) {
        query = query.or(`vertical.eq.${vertical},vertical.eq.general`);
      } else {
        query = query.eq('vertical', 'general');
      }

      const { data: scripts, error } = await query.order('conversion_rate', { ascending: false });

      if (error) {
        console.error('[MentorLearning] Error fetching scripts:', error);
        return [];
      }

      if (!scripts) return [];

      // User's erfolgreiche Scripts zuerst
      if (profile?.top_script_ids && Array.isArray(profile.top_script_ids)) {
        const topIds = new Set(profile.top_script_ids);
        return scripts.sort((a, b) => {
          const aIsTop = topIds.has(a.id) ? 1 : 0;
          const bIsTop = topIds.has(b.id) ? 1 : 0;
          return bIsTop - aIsTop; // Top Scripts zuerst
        });
      }

      return scripts;
    } catch (error) {
      console.error('[MentorLearning] Exception fetching scripts:', error);
      return [];
    }
  },

  /**
   * Hole User Learning Profile
   */
  async getUserProfile(): Promise<any | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_learning_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[MentorLearning] Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[MentorLearning] Exception fetching profile:', error);
      return null;
    }
  },

  /**
   * Update Profile (täglich aufrufen)
   */
  async updateProfile(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('update_user_learning_profile', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('[MentorLearning] Error updating profile:', error);
      }
    } catch (error) {
      console.error('[MentorLearning] Exception updating profile:', error);
    }
  },

  /**
   * Hole Global Insights für Vertical
   */
  async getInsights(vertical: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('global_insights')
        .select('*')
        .or(`vertical.eq.${vertical},vertical.eq.general`)
        .gt('confidence', 0.5)
        .order('confidence', { ascending: false })
        .limit(5);

      if (error) {
        console.error('[MentorLearning] Error fetching insights:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[MentorLearning] Exception fetching insights:', error);
      return [];
    }
  },

  /**
   * Daily Profile Update (einmal pro Tag)
   */
  async updateProfileIfNeeded(): Promise<void> {
    try {
      const lastUpdate = await storage.getItem('lastProfileUpdate');
      const today = new Date().toDateString();

      if (lastUpdate !== today) {
        await this.updateProfile();
        await storage.setItem('lastProfileUpdate', today);
      }
    } catch (error) {
      console.error('[MentorLearning] Exception in updateProfileIfNeeded:', error);
    }
  },
};

