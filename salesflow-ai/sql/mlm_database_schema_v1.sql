-- ====================================================================
-- NETWORK MARKETING INTELLIGENCE - SQL SCHEMA ERWEITERUNGEN
-- ====================================================================
-- Version: 1.0
-- Purpose: MLM-spezifische Datenbank-Strukturen für SalesFlow AI
-- Includes: Compensation Plans, Lead Attributes, Product Packages, 
--           Events, 3-Way Calls, and more
-- ====================================================================

-- ====================================================================
-- 1. MLM COMPANY COMPENSATION PLANS
-- ====================================================================
-- Speichert Details zum Vergütungsplan und Einstiegskosten jeder Firma
CREATE TABLE IF NOT EXISTS mlm_compensation_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL UNIQUE, -- Referenz zu network_marketing_companies.name
  plan_type TEXT CHECK (plan_type IN ('binary', 'unilevel', 'matrix', 'hybrid', 'breakaway')),
  entry_cost_min DECIMAL(10,2),
  entry_cost_max DECIMAL(10,2),
  monthly_pv_required INTEGER DEFAULT 0, -- Persönliches Volumen für Aktivstatus
  monthly_gv_required INTEGER DEFAULT 0, -- Gruppenvolumen für Rang
  average_retention_rate DECIMAL(5,2), -- Wie lange bleiben Partner? (0.00 - 1.00)
  top_earner_income_avg DECIMAL(12,2), -- Durchschnittseinkommen Top 1%
  starter_packages JSONB, -- Array von Starter-Paketen
  rank_structure JSONB, -- Array von Rängen mit Requirements
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Company-Lookups
CREATE INDEX idx_mlm_comp_plans_company ON mlm_compensation_plans(company_name);

COMMENT ON TABLE mlm_compensation_plans IS 'Vergütungsplan-Details für jede Network Marketing Firma';
COMMENT ON COLUMN mlm_compensation_plans.plan_type IS 'Art des Vergütungsplans (Binary, Unilevel, Matrix, Hybrid, Breakaway)';
COMMENT ON COLUMN mlm_compensation_plans.monthly_pv_required IS 'Persönliches Volumen (PV) für Aktivstatus pro Monat';
COMMENT ON COLUMN mlm_compensation_plans.monthly_gv_required IS 'Gruppenvolumen (GV) für Rang-Qualifikation';

-- ====================================================================
-- 2. LEAD ATTRIBUTES ERWEITERUNGEN (MLM-Spezifisch)
-- ====================================================================
-- Erweitert die Standard 'leads' Tabelle um MLM-Kriterien
-- ANNAHME: leads Tabelle existiert bereits

ALTER TABLE leads ADD COLUMN IF NOT EXISTS mlm_interest_type TEXT 
  CHECK (mlm_interest_type IN ('business', 'product', 'both', 'none')) DEFAULT 'none';

ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_network_status TEXT 
  CHECK (current_network_status IN ('open', 'happy', 'looking', 'anti_mlm')) DEFAULT 'open';

ALTER TABLE leads ADD COLUMN IF NOT EXISTS network_size_est INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS coachability_score INTEGER CHECK (coachability_score BETWEEN 1 AND 10);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS has_mlm_experience BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_followers INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS facebook_friends INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pain_point TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS watched_video BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_watch_date TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_objection TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS messages_sent_no_response INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS registered_but_no_show BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_tier TEXT 
  CHECK (lead_tier IN ('hot', 'warm', 'cold', 'disqualified'));

-- Indexes für Lead Scoring
CREATE INDEX idx_leads_mlm_interest ON leads(mlm_interest_type);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_tier ON leads(lead_tier);

COMMENT ON COLUMN leads.mlm_interest_type IS 'Business Opportunity, Produkt, beides oder kein Interesse';
COMMENT ON COLUMN leads.current_network_status IS 'Aktueller Status: offen, glücklich in anderem NM, aktiv suchend, oder anti-MLM';
COMMENT ON COLUMN leads.network_size_est IS 'Geschätzte Größe des persönlichen Netzwerks (Warm Market)';
COMMENT ON COLUMN leads.coachability_score IS 'Wie coachbar ist der Lead? 1=schwierig, 10=perfekt';
COMMENT ON COLUMN leads.lead_score IS 'Automatisch berechneter Lead Score (0-100)';

-- ====================================================================
-- 3. PRODUCT PACKAGES
-- ====================================================================
-- Starter-Sets und Produktpakete pro Firma
CREATE TABLE IF NOT EXISTS mlm_product_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL, -- Referenz zu network_marketing_companies.name
  package_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  pv_points INTEGER, -- Punktwert für den Plan
  gv_points INTEGER, -- Gruppenpunktwert
  commission_value DECIMAL(10,2), -- Verprovisionierbarer Wert
  is_starter_kit BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  included_products JSONB, -- Array von Produkten
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_name, package_name)
);

CREATE INDEX idx_product_packages_company ON mlm_product_packages(company_name);
CREATE INDEX idx_product_packages_starter ON mlm_product_packages(is_starter_kit);

COMMENT ON TABLE mlm_product_packages IS 'Produktpakete und Starter-Kits pro Network Marketing Firma';

-- ====================================================================
-- 4. EVENT MANAGEMENT
-- ====================================================================
-- MLM lebt von Events (Zoom, Hotel, Convention)
CREATE TABLE IF NOT EXISTS mlm_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('webinar', 'home_party', 'hotel_meeting', 'convention', 'training', 'product_launch')) NOT NULL,
  host_id UUID, -- REFERENCES auth.users(id) wenn vorhanden
  company_name TEXT, -- Optional: Firmen-spezifisches Event
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  timezone TEXT DEFAULT 'Europe/Berlin',
  location TEXT, -- Zoom Link oder physische Adresse
  registration_link TEXT,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  script_template_id UUID, -- Welches Skript wird genutzt?
  status TEXT CHECK (status IN ('draft', 'published', 'cancelled', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_start_time ON mlm_events(start_time);
CREATE INDEX idx_events_type ON mlm_events(type);
CREATE INDEX idx_events_company ON mlm_events(company_name);

COMMENT ON TABLE mlm_events IS 'Event Management für Webinare, Meetings, Conventions';

-- ====================================================================
-- 5. EVENT REGISTRATIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS mlm_event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES mlm_events(id) ON DELETE CASCADE,
  lead_id UUID, -- REFERENCES leads(id) wenn vorhanden
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN DEFAULT false,
  attended_at TIMESTAMPTZ,
  feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 10),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, lead_id)
);

CREATE INDEX idx_event_regs_event ON mlm_event_registrations(event_id);
CREATE INDEX idx_event_regs_lead ON mlm_event_registrations(lead_id);
CREATE INDEX idx_event_regs_attended ON mlm_event_registrations(attended);

COMMENT ON TABLE mlm_event_registrations IS 'Tracking von Event-Registrierungen und Teilnahme';

-- ====================================================================
-- 6. THREE-WAY CALLS TRACKING
-- ====================================================================
-- Das wichtigste Tool im MLM: Der 3er Call mit dem Sponsor
CREATE TABLE IF NOT EXISTS three_way_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID, -- REFERENCES leads(id)
  expert_id UUID, -- REFERENCES auth.users(id) - Der "Edifizierte" Experte
  scheduler_id UUID, -- REFERENCES auth.users(id) - Wer hat den Call organisiert
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'no_show', 'closed', 'rescheduled')) DEFAULT 'scheduled',
  outcome TEXT CHECK (outcome IN ('enrolled', 'follow_up_needed', 'not_interested', 'thinking')),
  notes TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_three_way_lead ON three_way_calls(lead_id);
CREATE INDEX idx_three_way_expert ON three_way_calls(expert_id);
CREATE INDEX idx_three_way_status ON three_way_calls(status);
CREATE INDEX idx_three_way_scheduled ON three_way_calls(scheduled_at);

COMMENT ON TABLE three_way_calls IS '3-Way Call Tracking - Kern-Tool für Network Marketing Rekrutierung';
COMMENT ON COLUMN three_way_calls.expert_id IS 'Der erfahrene Partner der den Call führt (Upline/Sponsor)';

-- ====================================================================
-- 7. DOWNLINE STRUCTURE (OPTIONAL - FÜR FORTGESCHRITTENE)
-- ====================================================================
-- Falls du die Downline-Struktur auch abbilden willst
CREATE TABLE IF NOT EXISTS mlm_downline_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- REFERENCES auth.users(id)
  company_name TEXT NOT NULL,
  sponsor_id UUID, -- REFERENCES auth.users(id) - Direkter Sponsor
  rank TEXT,
  rank_achieved_at TIMESTAMPTZ,
  monthly_pv INTEGER DEFAULT 0,
  monthly_gv INTEGER DEFAULT 0,
  total_downline_count INTEGER DEFAULT 0,
  active_downline_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_name)
);

CREATE INDEX idx_downline_user ON mlm_downline_structure(user_id);
CREATE INDEX idx_downline_sponsor ON mlm_downline_structure(sponsor_id);
CREATE INDEX idx_downline_company ON mlm_downline_structure(company_name);
CREATE INDEX idx_downline_rank ON mlm_downline_structure(rank);

COMMENT ON TABLE mlm_downline_structure IS 'Downline-Struktur und Rang-Tracking pro User und Firma';

-- ====================================================================
-- 8. MESSAGE TRACKING (FÜR FOLLOW-UPS)
-- ====================================================================
CREATE TABLE IF NOT EXISTS mlm_message_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID, -- REFERENCES leads(id)
  template_id TEXT, -- Referenz zu Message Template
  channel TEXT CHECK (channel IN ('whatsapp', 'email', 'sms', 'dm', 'messenger')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false,
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  reply_time_minutes INTEGER,
  message_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_msg_history_lead ON mlm_message_history(lead_id);
CREATE INDEX idx_msg_history_template ON mlm_message_history(template_id);
CREATE INDEX idx_msg_history_sent ON mlm_message_history(sent_at DESC);
CREATE INDEX idx_msg_history_replied ON mlm_message_history(replied);

COMMENT ON TABLE mlm_message_history IS 'Tracking aller gesendeten Messages für Follow-up Automation';

-- ====================================================================
-- 9. PLAYBOOK TRACKING
-- ====================================================================
-- Welcher Lead ist in welchem Playbook?
CREATE TABLE IF NOT EXISTS mlm_lead_playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL, -- REFERENCES leads(id)
  playbook_id TEXT NOT NULL, -- Referenz zu Playbook JSON
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_step INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_playbooks_lead ON mlm_lead_playbooks(lead_id);
CREATE INDEX idx_lead_playbooks_status ON mlm_lead_playbooks(status);

COMMENT ON TABLE mlm_lead_playbooks IS 'Tracking welcher Lead in welchem Playbook ist (Follow-up Automation)';

-- ====================================================================
-- 10. VIEWS FÜR REPORTING
-- ====================================================================

-- View: Hot Leads Dashboard
CREATE OR REPLACE VIEW v_hot_leads AS
SELECT 
  l.*,
  lp.playbook_id,
  lp.current_step,
  COUNT(mh.id) as messages_sent,
  MAX(mh.sent_at) as last_message_sent
FROM leads l
LEFT JOIN mlm_lead_playbooks lp ON l.id = lp.lead_id AND lp.status = 'active'
LEFT JOIN mlm_message_history mh ON l.id = mh.lead_id
WHERE l.lead_tier = 'hot' OR l.lead_score >= 70
GROUP BY l.id, lp.playbook_id, lp.current_step;

COMMENT ON VIEW v_hot_leads IS 'Dashboard für alle Hot Leads mit aktuellen Playbook Status';

-- View: Event Performance
CREATE OR REPLACE VIEW v_event_performance AS
SELECT 
  e.id,
  e.title,
  e.type,
  e.start_time,
  e.company_name,
  COUNT(er.id) as total_registrations,
  SUM(CASE WHEN er.attended THEN 1 ELSE 0 END) as total_attended,
  ROUND(
    SUM(CASE WHEN er.attended THEN 1 ELSE 0 END)::NUMERIC / 
    NULLIF(COUNT(er.id), 0) * 100, 
    2
  ) as show_up_rate,
  AVG(er.feedback_score) as avg_feedback_score
FROM mlm_events e
LEFT JOIN mlm_event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.type, e.start_time, e.company_name;

COMMENT ON VIEW v_event_performance IS 'Event Performance Metriken';

-- ====================================================================
-- 11. FUNCTIONS FÜR LEAD SCORING
-- ====================================================================

-- Function: Calculate Lead Score
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  lead_record RECORD;
BEGIN
  SELECT * INTO lead_record FROM leads WHERE id = lead_id_param;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Positive Punkte
  IF lead_record.has_mlm_experience THEN score := score + 20; END IF;
  IF lead_record.pain_point ILIKE '%hate_job%' THEN score := score + 15; END IF;
  IF lead_record.instagram_followers > 2000 THEN score := score + 10; END IF;
  IF lead_record.job_type IN ('self_employed', 'freelancer', 'sales') THEN score := score + 10; END IF;
  IF lead_record.response_time_minutes < 60 THEN score := score + 5; END IF;
  IF lead_record.network_size_est > 500 THEN score := score + 10; END IF;
  IF lead_record.mlm_interest_type IN ('business', 'both') THEN score := score + 15; END IF;
  IF lead_record.coachability_score >= 7 THEN score := score + 10; END IF;
  IF lead_record.current_network_status = 'looking' THEN score := score + 15; END IF;
  
  -- Negative Punkte
  IF NOT lead_record.watched_video THEN score := score - 10; END IF;
  IF lead_record.first_objection ILIKE '%no_money%' THEN score := score - 5; END IF;
  IF lead_record.current_network_status = 'anti_mlm' THEN score := score - 20; END IF;
  IF lead_record.first_objection ILIKE '%no_time%' THEN score := score - 5; END IF;
  IF lead_record.messages_sent_no_response > 3 THEN score := score - 15; END IF;
  IF lead_record.registered_but_no_show THEN score := score - 10; END IF;
  
  -- Sicherstellen dass Score zwischen 0 und 100 ist
  score := GREATEST(0, LEAST(100, score));
  
  -- Update Lead Score und Tier
  UPDATE leads 
  SET 
    lead_score = score,
    lead_tier = CASE
      WHEN score >= 70 THEN 'hot'
      WHEN score >= 40 THEN 'warm'
      WHEN score >= 20 THEN 'cold'
      ELSE 'disqualified'
    END
  WHERE id = lead_id_param;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_lead_score IS 'Berechnet Lead Score basierend auf Scoring Rules';

-- ====================================================================
-- 12. TRIGGERS
-- ====================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mlm_comp_plans_updated_at BEFORE UPDATE ON mlm_compensation_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mlm_events_updated_at BEFORE UPDATE ON mlm_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_three_way_calls_updated_at BEFORE UPDATE ON three_way_calls
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mlm_downline_updated_at BEFORE UPDATE ON mlm_downline_structure
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mlm_lead_playbooks_updated_at BEFORE UPDATE ON mlm_lead_playbooks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- END OF SCHEMA
-- ====================================================================
