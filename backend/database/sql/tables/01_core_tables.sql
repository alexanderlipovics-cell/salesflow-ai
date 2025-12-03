-- ╔════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - CORE TABLES                                   ║
-- ║  Complete Database Schema für Premium CRM System               ║
-- ╚════════════════════════════════════════════════════════════════╝

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- 1. USERS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  
  -- Tier & Limits
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
  lead_limit INTEGER DEFAULT 50,
  
  -- Team
  team_id UUID,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  
  -- Settings
  timezone TEXT DEFAULT 'Europe/Vienna',
  language TEXT DEFAULT 'de',
  
  -- Gamification
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- ═══════════════════════════════════════════════════════════════
-- 2. LEADS TABLE (Complete)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  
  -- Contact Preferences
  preferred_channel TEXT DEFAULT 'email' CHECK (preferred_channel IN ('email', 'whatsapp', 'in_app', 'phone')),
  last_active_channel TEXT,
  
  -- Status & Stage
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'qualified', 'meeting_scheduled', 
    'proposal_sent', 'negotiation', 'won', 'lost', 'nurture'
  )),
  stage INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- BANT Scoring
  budget_score INTEGER DEFAULT 0 CHECK (budget_score BETWEEN 0 AND 100),
  authority_score INTEGER DEFAULT 0 CHECK (authority_score BETWEEN 0 AND 100),
  need_score INTEGER DEFAULT 0 CHECK (need_score BETWEEN 0 AND 100),
  timing_score INTEGER DEFAULT 0 CHECK (timing_score BETWEEN 0 AND 100),
  bant_score INTEGER GENERATED ALWAYS AS (
    (budget_score + authority_score + need_score + timing_score) / 4
  ) STORED,
  
  -- DISG Personality
  personality_type TEXT CHECK (personality_type IN ('D', 'I', 'S', 'C')),
  personality_scores JSONB DEFAULT '{"D": 0, "I": 0, "S": 0, "C": 0}'::jsonb,
  
  -- AI Context
  context_summary TEXT,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  objections_raised TEXT[],
  pain_points TEXT[],
  
  -- Enrichment Data
  linkedin_url TEXT,
  company_size TEXT,
  industry TEXT,
  enrichment_data JSONB,
  
  -- Predictive AI
  win_probability DECIMAL(5,2),
  churn_risk DECIMAL(5,2),
  engagement_score INTEGER,
  
  -- Promised Actions
  promised_action TEXT,
  promised_action_date DATE,
  
  -- Financial
  estimated_value DECIMAL(12,2),
  actual_value DECIMAL(12,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  
  -- Source
  source TEXT,
  source_campaign TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_bant ON leads(bant_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 3. ACTIVITIES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Activity Details
  type TEXT NOT NULL CHECK (type IN (
    'note', 'call', 'email', 'meeting', 'task', 
    'whatsapp', 'proposal', 'follow_up'
  )),
  title TEXT,
  description TEXT,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled ON activities(scheduled_at);

-- ═══════════════════════════════════════════════════════════════
-- 4. FOLLOW-UPS TABLE (Automatic Follow-up System)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message Details
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'in_app')),
  message TEXT NOT NULL,
  subject TEXT,
  
  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  
  -- Metadata
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
  trigger_type TEXT,
  is_automated BOOLEAN DEFAULT TRUE,
  playbook_id TEXT,
  
  -- GPT Context
  gpt_generated BOOLEAN DEFAULT FALSE,
  gpt_prompt_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_lead ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_user ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_sent ON follow_ups(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_followups_channel ON follow_ups(channel);

-- ═══════════════════════════════════════════════════════════════
-- 5. MESSAGE TRACKING TABLE (Analytics)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS message_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message Info
  channel TEXT NOT NULL,
  message_type TEXT,
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  
  -- Analytics
  response_time_hours INTEGER,
  was_successful BOOLEAN,
  
  -- GPT Metadata
  gpt_generated BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_tracking_lead ON message_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_message_tracking_channel ON message_tracking(channel);
CREATE INDEX IF NOT EXISTS idx_message_tracking_sent ON message_tracking(sent_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 6. FOLLOW-UP PLAYBOOKS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS followup_playbooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger Conditions
  trigger_type TEXT NOT NULL,
  delay_days INTEGER DEFAULT 3,
  
  -- Channel Strategy
  preferred_channels TEXT[] DEFAULT ARRAY['whatsapp', 'email'],
  
  -- Message Template
  message_template TEXT NOT NULL,
  subject_template TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  category TEXT,
  priority INTEGER DEFAULT 5,
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbooks_active ON followup_playbooks(is_active);
CREATE INDEX IF NOT EXISTS idx_playbooks_trigger ON followup_playbooks(trigger_type);

-- ═══════════════════════════════════════════════════════════════
-- 7. FOLLOW-UP TEMPLATES TABLE (Advanced)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS followup_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Metadata
  name TEXT NOT NULL,
  trigger_key TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'in_app')),
  category TEXT,
  
  -- Multi-Field Templates
  subject_template TEXT,
  short_template TEXT,
  body_template TEXT NOT NULL,
  reminder_template TEXT,
  fallback_template TEXT,
  
  -- GPT Integration
  gpt_autocomplete_prompt TEXT,
  
  -- Testing & Preview
  preview_context JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(trigger_key, channel)
);

CREATE INDEX IF NOT EXISTS idx_templates_trigger ON followup_templates(trigger_key);
CREATE INDEX IF NOT EXISTS idx_templates_channel ON followup_templates(channel);
CREATE INDEX IF NOT EXISTS idx_templates_active ON followup_templates(is_active);

-- ═══════════════════════════════════════════════════════════════
-- 8. TEMPLATE VERSIONS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES followup_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Snapshot
  name TEXT,
  body_template TEXT,
  reminder_template TEXT,
  fallback_template TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  change_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_versions_template ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_versions_created ON template_versions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 9. AI PROMPTS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('objection_handling', 'upselling', 'coaching', 'followup', 'leadgen')),
  description TEXT,
  prompt_template TEXT NOT NULL,
  input_schema JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_autonomous BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 10. AI PROMPT EXECUTIONS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_prompt_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID REFERENCES ai_prompts(id),
  user_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  input_values JSONB NOT NULL,
  generated_output TEXT,
  execution_time_ms INTEGER,
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 11. GAMIFICATION TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  category TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,
  points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value INTEGER NOT NULL,
  period TEXT DEFAULT 'weekly' CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_metric ON leaderboard_entries(metric, period, rank);

-- ═══════════════════════════════════════════════════════════════
-- 12. ENRICHMENT LOGS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS enrichment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  enriched_data JSONB,
  cost DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_lead ON enrichment_logs(lead_id);

-- Comments
COMMENT ON TABLE leads IS 'Main leads table with BANT, DISG, AI context';
COMMENT ON TABLE follow_ups IS 'Automatic follow-up tracking';
COMMENT ON TABLE followup_playbooks IS 'Simple auto-trigger templates';
COMMENT ON TABLE followup_templates IS 'Advanced editable templates with GPT';

