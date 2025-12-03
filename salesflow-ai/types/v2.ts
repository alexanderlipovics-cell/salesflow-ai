export interface PowerHourEvent {
  id: string
  created_at: string
  host_user_id: string
  event_name: string
  target_duration_minutes: number
  team_goal: number
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  started_at: string | null
  ended_at: string | null
  join_code: string
}

export interface PowerHourParticipant {
  id: string
  event_id: string
  user_id: string
  calls_made: number
  messages_sent: number
  appointments_booked: number
  points_earned: number
  current_streak: number
  last_activity_at: string | null
}

export interface ChurnPrediction {
  id: string
  created_at: string
  user_id: string
  upline_user_id: string
  churn_risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  inactivity_days: number
  signals: {
    red_flags: string[]
    protective_factors: string[]
  }
  recommended_actions: string[]
  motivation_script: string
  intervention_taken: boolean
  intervention_date: string | null
}

export interface CUREAssessment {
  id: string
  created_at: string
  lead_id: string
  coachability_score: number
  urgency_score: number
  resources_score: number
  energy_score: number
  overall_score: number
  partner_potential: 'low' | 'medium' | 'high' | 'superstar'
  signals: {
    red_flags: string[]
    protective_factors: string[]
  }
  assessment_reasoning: string
  next_steps: string[]
}

export interface LeadRelationship {
  id: string
  lead_a_id: string
  lead_b_id: string
  relationship_type: 'family' | 'colleague' | 'friend' | 'knows_from_event' | 'lives_nearby' | 'other'
  connection_strength: number
  evidence: Record<string, any>
}

export interface RoleplaySession {
  id: string
  created_at: string
  user_id: string
  scenario_type: string
  difficulty_level: 'easy' | 'medium' | 'hard' | 'expert'
  conversation_turns: Array<{
    role: 'user' | 'ai'
    content: string
    timestamp: string
  }>
  performance_score: number | null
  feedback: {
    strengths: string[]
    weaknesses: string[]
    tips: string[]
    tone_analysis?: {
      confidence: number
      empathy: number
      assertiveness: number
    }
  } | null
  status: 'in_progress' | 'completed' | 'abandoned'
}

export interface NetworkGraphData {
  center_lead: {
    id: string
    name: string
    status: 'hot' | 'warm' | 'cold'
  }
  connections: Array<{
    lead: {
      id: string
      name: string
      status: 'hot' | 'warm' | 'cold'
    }
    relationship_type: LeadRelationship['relationship_type']
    connection_strength: number
  }>
}

