-- ╔════════════════════════════════════════════════════════════════╗
-- ║  AI PROMPTS SYSTEM                                             ║
-- ║  Wiederverwendbare GPT-Prompts für Sales-Szenarien             ║
-- ╚════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AI Prompts Tabelle
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                         -- z.B. 'Objection: Preis'
  category TEXT NOT NULL,                     -- 'objection_handling', 'upselling', 'coaching', 'followup', 'leadgen'
  description TEXT,                           -- Kurze Beschreibung für UI
  prompt_template TEXT NOT NULL,              -- GPT-Prompt mit Platzhaltern {{variable}}
  input_schema JSONB NOT NULL,                -- {"variable": "type", ...}
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  is_autonomous BOOLEAN DEFAULT FALSE,        -- Darf GPT automatisch ausführen?
  requires_approval BOOLEAN DEFAULT TRUE,     -- Braucht User-Freigabe?
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),                  -- 0-100%
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);

-- Prompt Execution Log
CREATE TABLE IF NOT EXISTS ai_prompt_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES ai_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lead_id UUID,
  
  -- Input/Output
  input_values JSONB NOT NULL,                -- {"lead_name": "Anna", "objection": "zu teuer"}
  generated_output TEXT,                      -- GPT Response
  
  -- Execution
  executed_at TIMESTAMP DEFAULT NOW(),
  execution_time_ms INTEGER,
  status VARCHAR(50) DEFAULT 'success',       -- 'success', 'failed', 'pending'
  error_message TEXT,
  
  -- User Feedback
  user_rating INTEGER,                        -- 1-5 stars
  user_feedback TEXT
);

CREATE INDEX IF NOT EXISTS idx_prompt_executions_prompt ON ai_prompt_executions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_user ON ai_prompt_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_lead ON ai_prompt_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_date ON ai_prompt_executions(executed_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA: 12+ STANDARD PROMPTS
-- ═══════════════════════════════════════════════════════════════

-- 1. Preis-Einwand
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Objection: Preis',
  'objection_handling',
  'Antwort auf Preis-Einwand mit DISG-Anpassung',
  'Ein Lead sagt: "{{objection}}". Sein DISG-Typ ist "{{personality_type}}". Kontext:
{{context_summary}}

Erstelle eine empathische, überzeugende Antwort, die Vertrauen schafft, Wert betont und eine konkrete Lösung bietet.',
  '{"objection":"string","personality_type":"string","context_summary":"string"}'
);

-- 2. Zeit-Einwand
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Objection: Zeit',
  'objection_handling',
  'Antwort auf Zeitmangel mit flexibler Lösung',
  'Lead sagt: "{{objection}}". Persönlichkeit: "{{personality_type}}". Kontext:
{{context_summary}}

Schlage eine flexible Zeiteinteilung oder Mini-Start-Option vor, die zum DISG-Typ passt.',
  '{"objection":"string","personality_type":"string","context_summary":"string"}'
);

-- 3. Upsell nach Erfolg
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Upsell nach Erfolg',
  'upselling',
  'Lead hat erste Erfolge - generiere passenden Upsell',
  'Der Lead "{{lead_name}}" hat kürzlich {{recent_success}} erreicht. Persönlichkeits-Typ: {{personality_type}}. Erstelle eine positive, motivierende Upsell-Botschaft für das Produkt "{{upsell_product}}".',
  '{"lead_name":"string","recent_success":"string","personality_type":"string","upsell_product":"string"}'
);

-- 4. Meeting Vorbereitung
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Meeting Prep (DISG)',
  'coaching',
  'Erstelle Gesprächsstrategie basierend auf Persönlichkeit',
  'Lead: {{lead_name}}, DISG-Profil: {{personality_type}}. Kontext:
{{context_summary}}

Gib konkrete Empfehlungen für: Begrüßungston, Argumentationsrichtung, zu vermeidende Trigger, Call-to-Action.',
  '{"lead_name":"string","personality_type":"string","context_summary":"string"}'
);

-- 5. Follow-Up nach Proposal
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Proposal Follow-Up',
  'followup',
  'Freundlicher Reminder nach Angebot',
  'Lead: {{lead_name}}, Proposal wurde vor {{days_since_proposal}} Tagen gesendet. DISG-Typ: {{personality_type}}.

Erstelle eine freundliche Follow-Up-Nachricht mit klarem Call-to-Action.',
  '{"lead_name":"string","days_since_proposal":"number","personality_type":"string"}'
);

-- 6. Re-Engagement
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Lead Reaktivierung',
  'nurture',
  'Reaktiviere Lead nach Inaktivität',
  'Lead "{{lead_name}}" ist seit {{inactivity_days}} Tagen inaktiv. Kontext:
{{context_summary}}

Erstelle eine empathische Re-Engagement-Nachricht, die Neugier weckt.',
  '{"lead_name":"string","inactivity_days":"number","context_summary":"string"}'
);

-- 7. Demo Einladung
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Demo Einladung (BANT)',
  'lead_progression',
  'Einladung zur Demo für qualifizierten Lead',
  'Lead "{{lead_name}}" hat einen BANT-Score von {{bant_score}}. DISG-Typ: {{personality_type}}.

Erstelle Einladung zur Produkt-Demo mit konkretem Nutzenargument.',
  '{"lead_name":"string","bant_score":"number","personality_type":"string"}'
);

-- 8. Empfehlungs-Bitte
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Referral Request',
  'referral',
  'Bitte um Empfehlung nach erfolgreichem Deal',
  'Lead "{{lead_name}}" hat kürzlich gekauft. Erstelle eine charmante Bitte um Weiterempfehlung, angepasst an DISG-Typ {{personality_type}}.',
  '{"lead_name":"string","personality_type":"string"}'
);

-- 9. FAQ-Beantwortung
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'FAQ-Antwort',
  'playbook_response',
  'Beantworte häufige Frage auf Basis Playbook-Wissen',
  'Frage: "{{faq_question}}". Kontext: {{context_summary}}.

Erstelle eine faktenbasierte, vertrauensvolle Antwort.',
  '{"faq_question":"string","context_summary":"string"}'
);

-- 10. Tagesfokus
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Tagesfokus (Daily Check-in)',
  'coaching',
  'KI gibt Fokus-Empfehlung für den Tag',
  'Heute ist {{today}}. Nenne die Top 3 Aufgaben basierend auf folgenden Lead-Signalen:
{{lead_summary}}
DISG-Profil: {{personality_type}}.',
  '{"today":"string","lead_summary":"string","personality_type":"string"}'
);

-- 11. Social DM Lead-Gen
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Social DM Akquise',
  'leadgen',
  'Erstelle personalisierte DM für Social Media Lead-Gen',
  'Platform: {{platform}}, Lead: {{lead_name}}, Kontext: {{trigger_context}} (Story Reply, Kommentar, etc.).

Erstelle kurze, neugierig machende DM mit Value-First Ansatz.',
  '{"platform":"string","lead_name":"string","trigger_context":"string"}'
);

-- 12. Win Probability Analysis
INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema) VALUES (
  'Win Probability Analyse',
  'coaching',
  'Schätze Abschlusswahrscheinlichkeit und gib Empfehlung',
  'Lead: {{lead_name}}
BANT Score: {{bant_score}}
Personality: {{personality_type}}
Inaktivität: {{inactivity_days}} Tage
Channel: {{channel}}
Objections: {{objections}}

Schätze Win Probability (0-100%), gib 3 Gründe + konkrete Handlungsempfehlung.',
  '{"lead_name":"string","bant_score":"number","personality_type":"string","inactivity_days":"number","channel":"string","objections":"string"}'
);

COMMENT ON TABLE ai_prompts IS 'Wiederverwendbare GPT-Prompts für Sales-Szenarien';
COMMENT ON TABLE ai_prompt_executions IS 'Log aller Prompt-Ausführungen mit User-Feedback';

