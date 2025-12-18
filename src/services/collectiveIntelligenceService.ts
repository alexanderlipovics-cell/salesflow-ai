/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COLLECTIVE INTELLIGENCE SERVICE                                           ║
 * ║  Frontend Integration für das Non Plus Ultra System                        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Dieses Service verbindet das Frontend mit der Collective Intelligence Engine.
 * 
 * Architektur-Formel:
 * Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)
 */

import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type InputType = 
  | 'objection_response' 
  | 'message_generation' 
  | 'follow_up' 
  | 'closing_script';

export type Outcome = 
  | 'converted' 
  | 'positive_reply' 
  | 'negative_reply' 
  | 'no_reply' 
  | 'unknown';

export type Tone = 
  | 'direct' 
  | 'soft' 
  | 'enthusiastic' 
  | 'professional' 
  | 'casual' 
  | 'formal';

export type SalesStyle = 
  | 'challenger' 
  | 'relationship' 
  | 'solution' 
  | 'consultative' 
  | 'balanced';

export interface UserLearningProfile {
  userId: string;
  preferredTone: Tone;
  avgMessageLength: number;
  emojiUsageLevel: number;
  formalityScore: number;
  salesStyle: SalesStyle;
  objectionHandlingStrength: number;
  closingAggressiveness: number;
  totalConversations: number;
  totalConversions: number;
  conversionRate: number;
  topScriptIds: string[];
  contributeToGlobalLearning: boolean;
  excludedContactIds: string[];
}

export interface GenerateRequest {
  prompt: string;
  inputType: InputType;
  context?: {
    vertical?: string;
    channel?: string;
    objectionCategory?: string;
    disgType?: string;
    leadName?: string;
    conversationTurn?: number;
  };
  useRag?: boolean;
  recordForRlhf?: boolean;
}

export interface GenerateResponse {
  response: string;
  modelUsed: string;
  latencyMs: number;
  ragContextUsed: boolean;
  userProfileApplied: boolean;
  rlhfSessionId: string | null;
}

export interface FeedbackRequest {
  rlhfSessionId: string;
  outcome: Outcome;
  userRating?: number;
  responseUsed?: boolean;
  editedResponse?: string;
}

export interface GlobalInsight {
  id: string;
  insightType: 'best_practice' | 'pattern' | 'correlation' | 'warning' | 'trend';
  vertical: string;
  title: string;
  description: string;
  insightData: Record<string, any>;
  sampleSize: number;
  confidence: number;
}

export interface KnowledgeGraphNode {
  id: string;
  nodeType: string;
  nodeKey: string;
  label: string;
  description?: string;
  properties: Record<string, any>;
  similarity?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export const CollectiveIntelligenceService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EBENE 1: USER PROFILE (D_User)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lädt das User Learning Profile
   */
  async getUserProfile(): Promise<UserLearningProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_learning_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Profil existiert noch nicht - erstellen
        if (error.code === 'PGRST116') {
          const { data: newProfile } = await supabase
            .from('user_learning_profile')
            .insert({ user_id: user.id })
            .select()
            .single();

          return newProfile ? this._mapProfile(newProfile) : null;
        }
        console.error('[CI] Error fetching profile:', error);
        return null;
      }

      return this._mapProfile(data);
    } catch (error) {
      console.error('[CI] Exception fetching profile:', error);
      return null;
    }
  },

  /**
   * Aktualisiert das User Learning Profile
   */
  async updateUserProfile(updates: Partial<UserLearningProfile>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const dbUpdates: Record<string, any> = {};
      
      if (updates.preferredTone !== undefined) dbUpdates.preferred_tone = updates.preferredTone;
      if (updates.avgMessageLength !== undefined) dbUpdates.avg_message_length = updates.avgMessageLength;
      if (updates.emojiUsageLevel !== undefined) dbUpdates.emoji_usage_level = updates.emojiUsageLevel;
      if (updates.formalityScore !== undefined) dbUpdates.formality_score = updates.formalityScore;
      if (updates.salesStyle !== undefined) dbUpdates.sales_style = updates.salesStyle;
      if (updates.contributeToGlobalLearning !== undefined) {
        dbUpdates.contribute_to_global_learning = updates.contributeToGlobalLearning;
      }

      const { error } = await supabase
        .from('user_learning_profile')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (error) {
        console.error('[CI] Error updating profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[CI] Exception updating profile:', error);
      return false;
    }
  },

  /**
   * Setzt Opt-Out für kollektives Lernen
   */
  async setLearningOptOut(optOut: boolean, contactIds?: string[]): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Profile aktualisieren
      const updates: Record<string, any> = {
        contribute_to_global_learning: !optOut,
      };
      
      if (contactIds) {
        updates.excluded_contact_ids = contactIds;
      }

      const { error: profileError } = await supabase
        .from('user_learning_profile')
        .update(updates)
        .eq('user_id', user.id);

      if (profileError) {
        console.error('[CI] Error setting opt-out:', profileError);
        return false;
      }

      // Opt-Out Request loggen
      const { error: logError } = await supabase
        .from('learning_opt_out_requests')
        .insert({
          user_id: user.id,
          opt_out_type: optOut ? 'full' : 'contact_specific',
          target_id: contactIds?.[0] || null,
        });

      if (logError) {
        console.warn('[CI] Error logging opt-out:', logError);
      }

      return true;
    } catch (error) {
      console.error('[CI] Exception setting opt-out:', error);
      return false;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EBENE 4: GENERATION (via Backend API)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generiert eine KI-Antwort mit kollektivem Wissen
   * 
   * Formel: Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)
   */
  async generateResponse(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      const response = await fetch('/api/v2/collective-intelligence/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          input_type: request.inputType,
          context: {
            vertical: request.context?.vertical ?? 'network_marketing',
            channel: request.context?.channel ?? null,
            objection_category: request.context?.objectionCategory ?? null,
            disg_type: request.context?.disgType ?? null,
            lead_name: request.context?.leadName ?? null,
            conversation_turn: request.context?.conversationTurn ?? 1,
          },
          use_rag: request.useRag ?? true,
          record_for_rlhf: request.recordForRlhf ?? true,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Generation fehlgeschlagen (${response.status}): ${text}`);
      }

      const data = await response.json();
      
      return {
        response: data.response,
        modelUsed: data.model_used,
        latencyMs: data.latency_ms,
        ragContextUsed: data.rag_context_used,
        userProfileApplied: data.user_profile_applied,
        rlhfSessionId: data.rlhf_session_id,
      };
    } catch (error) {
      console.error('[CI] Generation error:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EBENE 2: RLHF FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Zeichnet Feedback für RLHF auf
   * 
   * Wird aufgerufen nach User-Interaktion:
   * - User verwendet Antwort → responseUsed: true
   * - User bewertet Antwort → userRating: 1-5
   * - Lead konvertiert → outcome: 'converted'
   */
  async recordFeedback(request: FeedbackRequest): Promise<boolean> {
    try {
      const response = await fetch('/api/v2/collective-intelligence/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rlhf_session_id: request.rlhfSessionId,
          outcome: request.outcome,
          user_rating: request.userRating ?? null,
          response_used: request.responseUsed ?? false,
          edited_response: request.editedResponse ?? null,
        }),
      });

      if (!response.ok) {
        console.error('[CI] Feedback recording failed:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[CI] Exception recording feedback:', error);
      return false;
    }
  },

  /**
   * Shortcut: Markiert Antwort als verwendet
   */
  async markResponseUsed(rlhfSessionId: string): Promise<boolean> {
    return this.recordFeedback({
      rlhfSessionId,
      outcome: 'unknown',
      responseUsed: true,
    });
  },

  /**
   * Shortcut: Bewertet Antwort
   */
  async rateResponse(rlhfSessionId: string, rating: number): Promise<boolean> {
    return this.recordFeedback({
      rlhfSessionId,
      outcome: 'unknown',
      userRating: Math.min(5, Math.max(1, rating)),
    });
  },

  /**
   * Shortcut: Zeichnet Conversion auf
   */
  async recordConversion(rlhfSessionId: string): Promise<boolean> {
    return this.recordFeedback({
      rlhfSessionId,
      outcome: 'converted',
      responseUsed: true,
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EBENE 3: KNOWLEDGE GRAPH & INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sucht im Knowledge Graph (semantisch)
   */
  async searchKnowledgeGraph(
    query: string,
    nodeTypes?: string[],
    limit: number = 10
  ): Promise<KnowledgeGraphNode[]> {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v2/collective-intelligence/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query,
          node_types: nodeTypes ?? null,
          limit,
        }),
      });

      if (!response.ok) {
        console.error('[CI] Knowledge search failed:', response.status);
        return [];
      }

      const data = await response.json();
      return data.nodes || [];
    } catch (error) {
      console.error('[CI] Exception searching knowledge:', error);
      return [];
    }
  },

  /**
   * Holt globale Insights für ein Vertical
   */
  async getGlobalInsights(
    vertical: string = 'network_marketing',
    limit: number = 5
  ): Promise<GlobalInsight[]> {
    try {
      const { data, error } = await supabase
        .from('global_insights')
        .select('*')
        .or(`vertical.eq.${vertical},vertical.eq.general`)
        .eq('is_active', true)
        .gt('confidence', 0.5)
        .order('confidence', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[CI] Error fetching insights:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        insightType: row.insight_type,
        vertical: row.vertical,
        title: row.title,
        description: row.description,
        insightData: row.insight_data,
        sampleSize: row.sample_size,
        confidence: row.confidence,
      }));
    } catch (error) {
      console.error('[CI] Exception fetching insights:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS & MONITORING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Holt das Global Learning Dashboard
   */
  async getLearningDashboard(days: number = 30): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('rlhf_feedback_sessions')
        .select('created_at, outcome, composite_reward, user_id')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('[CI] Error fetching dashboard:', error);
        return [];
      }

      // Aggregation im Frontend
      const byDate = new Map<string, any>();
      
      for (const row of data || []) {
        const date = row.created_at.split('T')[0];
        if (!byDate.has(date)) {
          byDate.set(date, {
            date,
            totalSessions: 0,
            conversions: 0,
            positiveReplies: 0,
            avgReward: 0,
            rewardSum: 0,
            activeUsers: new Set(),
          });
        }
        
        const entry = byDate.get(date)!;
        entry.totalSessions++;
        entry.activeUsers.add(row.user_id);
        
        if (row.outcome === 'converted') entry.conversions++;
        if (row.outcome === 'positive_reply') entry.positiveReplies++;
        if (row.composite_reward) entry.rewardSum += row.composite_reward;
      }

      return Array.from(byDate.values())
        .map(entry => ({
          ...entry,
          avgReward: entry.totalSessions > 0 ? entry.rewardSum / entry.totalSessions : 0,
          activeUsers: entry.activeUsers.size,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('[CI] Exception fetching dashboard:', error);
      return [];
    }
  },

  /**
   * Holt User-spezifische Performance-Metriken
   */
  async getUserPerformance(): Promise<{
    totalSessions: number;
    conversions: number;
    conversionRate: number;
    avgRating: number;
    topStrategies: string[];
  } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('rlhf_feedback_sessions')
        .select('outcome, user_rating, input_context')
        .eq('user_id', user.id)
        .not('outcome', 'is', null);

      if (error) {
        console.error('[CI] Error fetching user performance:', error);
        return null;
      }

      const sessions = data || [];
      const conversions = sessions.filter(s => s.outcome === 'converted').length;
      const ratings = sessions.filter(s => s.user_rating).map(s => s.user_rating);

      // Top Strategien zählen
      const strategyCounts = new Map<string, number>();
      for (const session of sessions.filter(s => s.outcome === 'converted')) {
        const strategy = session.input_context?.objection_category || 'general';
        strategyCounts.set(strategy, (strategyCounts.get(strategy) || 0) + 1);
      }

      const topStrategies = Array.from(strategyCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([strategy]) => strategy);

      return {
        totalSessions: sessions.length,
        conversions,
        conversionRate: sessions.length > 0 ? (conversions / sessions.length) * 100 : 0,
        avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        topStrategies,
      };
    } catch (error) {
      console.error('[CI] Exception fetching user performance:', error);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  _mapProfile(data: any): UserLearningProfile {
    return {
      userId: data.user_id,
      preferredTone: data.preferred_tone || 'professional',
      avgMessageLength: data.avg_message_length || 150,
      emojiUsageLevel: data.emoji_usage_level || 2,
      formalityScore: data.formality_score || 0.5,
      salesStyle: data.sales_style || 'balanced',
      objectionHandlingStrength: data.objection_handling_strength || 0.5,
      closingAggressiveness: data.closing_aggressiveness || 0.5,
      totalConversations: data.total_conversations || 0,
      totalConversions: data.total_conversions || 0,
      conversionRate: data.conversion_rate || 0,
      topScriptIds: data.top_script_ids || [],
      contributeToGlobalLearning: data.contribute_to_global_learning ?? true,
      excludedContactIds: data.excluded_contact_ids || [],
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * React Hook für Collective Intelligence
 * 
 * @example
 * ```tsx
 * const { generate, recordFeedback, profile, loading } = useCollectiveIntelligence();
 * 
 * const handleGenerate = async () => {
 *   const result = await generate({
 *     prompt: "Wie antworte ich auf 'zu teuer'?",
 *     inputType: 'objection_response',
 *     context: { disgType: 'D' },
 *   });
 *   
 *   // User verwendet Antwort
 *   await recordFeedback(result.rlhfSessionId, { responseUsed: true });
 * };
 * ```
 */
export function useCollectiveIntelligence() {
  // Dieser Hook würde mit React State implementiert werden
  // Hier nur Type-Definition für die API
  
  return {
    generate: CollectiveIntelligenceService.generateResponse,
    recordFeedback: CollectiveIntelligenceService.recordFeedback,
    markUsed: CollectiveIntelligenceService.markResponseUsed,
    rate: CollectiveIntelligenceService.rateResponse,
    recordConversion: CollectiveIntelligenceService.recordConversion,
    getProfile: CollectiveIntelligenceService.getUserProfile,
    updateProfile: CollectiveIntelligenceService.updateUserProfile,
    setOptOut: CollectiveIntelligenceService.setLearningOptOut,
    searchKnowledge: CollectiveIntelligenceService.searchKnowledgeGraph,
    getInsights: CollectiveIntelligenceService.getGlobalInsights,
    getDashboard: CollectiveIntelligenceService.getLearningDashboard,
    getPerformance: CollectiveIntelligenceService.getUserPerformance,
  };
}

export default CollectiveIntelligenceService;

