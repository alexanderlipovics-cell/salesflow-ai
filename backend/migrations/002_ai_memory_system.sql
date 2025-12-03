-- ═══════════════════════════════════════════════════════════════════════════
-- SALES FLOW AI - AI MEMORY SYSTEM MIGRATION
-- Version: 002
-- Datum: 2025-12-01
-- Beschreibung: Hybrid-KI-System mit RAG, Memory und Learning
-- ═══════════════════════════════════════════════════════════════════════════

-- 1.1 pgvector Extension für Vector Similarity Search
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.2 AI MEMORIES TABLE (Vector Memory)
-- Speichert alle Konversationen mit Embeddings für semantische Suche
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  conversation_id UUID,
  
  -- Memory Content
  content TEXT NOT NULL,
  summary TEXT,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  
  -- Vector Embedding (1536 dimensions for OpenAI text-embedding-3-small)
  embedding vector(1536),
  
  -- Metadata
  importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
  topic_tags TEXT[],
  emotion_detected TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector Search Index (IVFFlat für schnelle Suche)
CREATE INDEX IF NOT EXISTS idx_ai_memories_embedding 
  ON ai_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Regular Indexes für schnelle Filterung
CREATE INDEX IF NOT EXISTS idx_ai_memories_user ON ai_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_lead ON ai_memories(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_conversation ON ai_memories(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_memories_created ON ai_memories(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.3 LEARNED PATTERNS TABLE
-- Speichert gelernte Muster aus erfolgreichen Gesprächen
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('objection', 'closing', 'question', 'opener', 'followup', 'general')),
  
  -- Pattern Content
  trigger_phrase TEXT NOT NULL,
  best_response TEXT NOT NULL,
  context_tags TEXT[],
  
  -- Learning Metrics
  success_rate DECIMAL DEFAULT 0.5 CHECK (success_rate >= 0 AND success_rate <= 1),
  usage_count INTEGER DEFAULT 0,
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,
  
  -- Source
  learned_from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  learned_from_conversation_id UUID,
  
  -- Embedding for similarity search
  trigger_embedding vector(1536),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector Search Index für Patterns
CREATE INDEX IF NOT EXISTS idx_learned_patterns_embedding 
  ON learned_patterns USING ivfflat (trigger_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_learned_patterns_type ON learned_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_success ON learned_patterns(success_rate DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.4 AI STRATEGIC INSIGHTS (Meta-Learning)
-- Aggregierte Erkenntnisse aus vielen Gesprächen
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_strategic_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'winning_opener', 
    'best_followup_time', 
    'effective_objection_handler', 
    'closing_technique', 
    'engagement_pattern'
  )),
  
  -- Insight Content
  related_tags TEXT[],
  insight_score FLOAT NOT NULL CHECK (insight_score >= 0 AND insight_score <= 1),
  explanation TEXT NOT NULL,
  evidence_count INTEGER DEFAULT 1,
  
  -- User/Workspace Scope
  workspace_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_strategic_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_score ON ai_strategic_insights(insight_score DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.5 GPT PROMPT LOG (Audit/DSGVO)
-- Protokolliert alle KI-Interaktionen für Compliance
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gpt_prompt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Request
  model TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  context_used TEXT,
  
  -- Response
  completion TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  
  -- Security
  fingerprint TEXT, -- SHA256 hash für Integrität
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gpt_logs_user ON gpt_prompt_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gpt_logs_created ON gpt_prompt_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1.6 FOLLOW-UP TEMPLATES TABLE
-- Vorlagen für automatisierte Follow-ups
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS followup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  
  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'call', 'in_app')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'inactivity', 
    'after_meeting', 
    'after_demo', 
    'no_response', 
    'interest_shown', 
    'custom'
  )),
  
  -- Content
  subject TEXT, -- For emails
  body_template TEXT NOT NULL, -- Mit {{placeholders}}
  
  -- Timing
  delay_hours INTEGER DEFAULT 24,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'de',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_templates_channel ON followup_templates(channel);
CREATE INDEX IF NOT EXISTS idx_followup_templates_trigger ON followup_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_followup_templates_active ON followup_templates(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS FÜR VECTOR SIMILARITY SEARCH
-- ═══════════════════════════════════════════════════════════════════════════

-- Function für Memory Similarity Search
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  content text,
  role text,
  lead_id uuid,
  conversation_id uuid,
  importance_score float,
  topic_tags text[],
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_memories.id,
    ai_memories.content,
    ai_memories.role,
    ai_memories.lead_id,
    ai_memories.conversation_id,
    ai_memories.importance_score,
    ai_memories.topic_tags,
    ai_memories.created_at,
    1 - (ai_memories.embedding <=> query_embedding) as similarity
  FROM ai_memories
  WHERE ai_memories.user_id = match_user_id
    AND ai_memories.embedding IS NOT NULL
    AND 1 - (ai_memories.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ai_memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function für Pattern Similarity Search
CREATE OR REPLACE FUNCTION match_patterns(
  query_embedding vector(1536),
  filter_type text DEFAULT NULL,
  match_count int DEFAULT 3,
  similarity_threshold float DEFAULT 0.6
)
RETURNS TABLE (
  id uuid,
  pattern_type text,
  trigger_phrase text,
  best_response text,
  context_tags text[],
  success_rate decimal,
  usage_count int,
  positive_feedback int,
  negative_feedback int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    learned_patterns.id,
    learned_patterns.pattern_type,
    learned_patterns.trigger_phrase,
    learned_patterns.best_response,
    learned_patterns.context_tags,
    learned_patterns.success_rate,
    learned_patterns.usage_count,
    learned_patterns.positive_feedback,
    learned_patterns.negative_feedback,
    1 - (learned_patterns.trigger_embedding <=> query_embedding) as similarity
  FROM learned_patterns
  WHERE (filter_type IS NULL OR learned_patterns.pattern_type = filter_type)
    AND learned_patterns.trigger_embedding IS NOT NULL
    AND 1 - (learned_patterns.trigger_embedding <=> query_embedding) > similarity_threshold
  ORDER BY learned_patterns.trigger_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_strategic_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpt_prompt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_templates ENABLE ROW LEVEL SECURITY;

-- AI Memories Policies
CREATE POLICY "Users can view own memories" ON ai_memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON ai_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON ai_memories
  FOR UPDATE USING (auth.uid() = user_id);

-- Learned Patterns Policies (shared across users but source tracked)
CREATE POLICY "Anyone can view patterns" ON learned_patterns
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert patterns" ON learned_patterns
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Pattern owners can update" ON learned_patterns
  FOR UPDATE USING (auth.uid() = learned_from_user_id);

-- GPT Prompt Logs Policies
CREATE POLICY "Users can view own logs" ON gpt_prompt_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON gpt_prompt_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS FÜR UPDATED_AT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_memories_updated_at
  BEFORE UPDATE ON ai_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learned_patterns_updated_at
  BEFORE UPDATE ON learned_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_strategic_insights_updated_at
  BEFORE UPDATE ON ai_strategic_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_followup_templates_updated_at
  BEFORE UPDATE ON followup_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA: Default Follow-up Templates
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO followup_templates (name, description, channel, trigger_type, subject, body_template, delay_hours, language) VALUES
(
  'Inaktivität Nachfassen',
  'Wird gesendet wenn ein Lead 7 Tage nicht reagiert hat',
  'email',
  'inactivity',
  'Kurze Frage, {{name}}',
  'Hallo {{name}},

ich wollte mich kurz melden – sind meine letzten Infos bei dir angekommen?

Falls du Fragen hast oder wir telefonieren sollen, meld dich gerne.

Beste Grüße
{{sender_name}}',
  168,
  'de'
),
(
  'Nach Meeting',
  'Danke-Mail nach einem Meeting',
  'email',
  'after_meeting',
  'Danke für das Gespräch, {{name}}! 🙏',
  'Hallo {{name}},

danke für das tolle Gespräch heute! 

Hier nochmal die wichtigsten Punkte:
- {{meeting_notes}}

Nächste Schritte:
{{next_steps}}

Bei Fragen melde dich jederzeit.

Beste Grüße
{{sender_name}}',
  1,
  'de'
),
(
  'Keine Antwort',
  'Wenn auf eine Nachricht nicht geantwortet wurde',
  'whatsapp',
  'no_response',
  NULL,
  'Hey {{name}} 👋

Hab meine letzte Nachricht bei dir angekommen? Falls du noch Fragen hast, schreib mir gerne!

LG {{sender_name}}',
  72,
  'de'
),
(
  'Interesse gezeigt',
  'Wenn ein Lead Interesse signalisiert hat',
  'email',
  'interest_shown',
  '{{name}}, hier sind die nächsten Schritte 🚀',
  'Hallo {{name}},

super, dass du interessiert bist! 

Hier sind deine nächsten Schritte:
1. Termin buchen: {{calendar_link}}
2. Kurzes Intro-Video: {{video_link}}
3. FAQ durchlesen: {{faq_link}}

Ich freu mich drauf!

{{sender_name}}',
  4,
  'de'
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT ALL ON ai_memories TO authenticated;
GRANT ALL ON learned_patterns TO authenticated;
GRANT ALL ON ai_strategic_insights TO authenticated;
GRANT ALL ON gpt_prompt_logs TO authenticated;
GRANT ALL ON followup_templates TO authenticated;

-- Für Service Role (Backend)
GRANT ALL ON ai_memories TO service_role;
GRANT ALL ON learned_patterns TO service_role;
GRANT ALL ON ai_strategic_insights TO service_role;
GRANT ALL ON gpt_prompt_logs TO service_role;
GRANT ALL ON followup_templates TO service_role;

