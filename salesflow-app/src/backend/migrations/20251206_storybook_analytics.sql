-- ============================================================================
-- STORYBOOK ANALYTICS
-- Tracking für Story-Nutzung und Compliance
-- Migration: 20251206_storybook_analytics.sql
-- ============================================================================

-- ===================
-- STORY USAGE TRACKING
-- ===================

CREATE TABLE IF NOT EXISTS story_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES company_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Kontext
    usage_type TEXT NOT NULL,
    -- 'copied': Story wurde kopiert
    -- 'used_in_chat': Story wurde in Chat verwendet
    -- 'sent_to_lead': Story wurde an Lead gesendet
    -- 'viewed': Story wurde angesehen
    
    -- Optional: Welcher Lead?
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Optional: Welcher Channel?
    channel TEXT,
    -- 'whatsapp', 'instagram', 'email', 'call', etc.
    
    -- Länge die verwendet wurde
    content_length TEXT,
    -- '30s', '1min', '2min', 'full'
    
    -- Outcome (falls später bekannt)
    outcome TEXT,
    -- 'reply', 'positive_reply', 'meeting', 'deal', 'no_response'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- COMPLIANCE VIOLATIONS LOG
-- ===================

CREATE TABLE IF NOT EXISTS compliance_violations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    
    -- Was wurde geprüft?
    checked_text TEXT NOT NULL,
    text_type TEXT,
    -- 'message', 'post', 'ad', 'bio', 'other'
    
    -- Ergebnis
    was_compliant BOOLEAN NOT NULL,
    violation_count INTEGER DEFAULT 0,
    had_blockers BOOLEAN DEFAULT false,
    
    -- Details
    violations JSONB,
    -- [{ "rule_name": "...", "severity": "...", "matched_pattern": "..." }]
    
    -- Wurde der Text trotzdem gesendet?
    was_sent BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- STORY PERFORMANCE AGGREGATES
-- ===================

CREATE TABLE IF NOT EXISTS story_performance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES company_stories(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Nutzungs-Metriken
    views INTEGER DEFAULT 0,
    copies INTEGER DEFAULT 0,
    uses_in_chat INTEGER DEFAULT 0,
    sends_to_lead INTEGER DEFAULT 0,
    
    -- Outcome-Metriken
    replies INTEGER DEFAULT 0,
    positive_replies INTEGER DEFAULT 0,
    meetings INTEGER DEFAULT 0,
    deals INTEGER DEFAULT 0,
    
    -- Berechnete Raten
    reply_rate NUMERIC(5,4),
    -- replies / sends_to_lead
    
    conversion_rate NUMERIC(5,4),
    -- deals / sends_to_lead
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(story_id, date)
);

-- ===================
-- PRODUCT USAGE TRACKING
-- ===================

CREATE TABLE IF NOT EXISTS product_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES company_products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Kontext
    usage_type TEXT NOT NULL,
    -- 'viewed', 'pitch_copied', 'mentioned_in_chat', 'objection_handled'
    
    -- Optional: Welcher Lead?
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Optional: Welcher Einwand wurde behandelt?
    objection_handled TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- GUARDRAIL TRIGGER LOG
-- ===================

CREATE TABLE IF NOT EXISTS guardrail_triggers_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardrail_id UUID NOT NULL REFERENCES company_guardrails(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    
    -- Was hat getriggert?
    matched_text TEXT NOT NULL,
    matched_pattern TEXT,
    
    -- Was wurde empfohlen?
    suggestion_shown TEXT,
    
    -- Hat User die Empfehlung befolgt?
    suggestion_accepted BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_story_usage_story ON story_usage_logs(story_id);
CREATE INDEX IF NOT EXISTS idx_story_usage_user ON story_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_story_usage_created ON story_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_story_usage_type ON story_usage_logs(usage_type);

CREATE INDEX IF NOT EXISTS idx_compliance_log_user ON compliance_violations_log(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_log_company ON compliance_violations_log(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_log_created ON compliance_violations_log(created_at);

CREATE INDEX IF NOT EXISTS idx_story_perf_story ON story_performance_daily(story_id);
CREATE INDEX IF NOT EXISTS idx_story_perf_date ON story_performance_daily(date);

CREATE INDEX IF NOT EXISTS idx_product_usage_product ON product_usage_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_usage_user ON product_usage_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_guardrail_triggers_guardrail ON guardrail_triggers_log(guardrail_id);
CREATE INDEX IF NOT EXISTS idx_guardrail_triggers_user ON guardrail_triggers_log(user_id);

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE story_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_violations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_performance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrail_triggers_log ENABLE ROW LEVEL SECURITY;

-- Users können eigene Logs sehen
CREATE POLICY "Users can view own story usage" ON story_usage_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own story usage" ON story_usage_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own compliance logs" ON compliance_violations_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own compliance logs" ON compliance_violations_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Company-weite Aggregates für alle Mitglieder sichtbar
CREATE POLICY "Company members can view story performance" ON story_performance_daily
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Admins können alles
CREATE POLICY "Admins manage all analytics" ON story_usage_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins manage compliance logs" ON compliance_violations_log
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ===================
-- UPDATE STORY TIMES_USED TRIGGER
-- ===================

CREATE OR REPLACE FUNCTION update_story_times_used()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE company_stories
    SET times_used = times_used + 1,
        updated_at = NOW()
    WHERE id = NEW.story_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_story_times_used ON story_usage_logs;
CREATE TRIGGER trigger_update_story_times_used
    AFTER INSERT ON story_usage_logs
    FOR EACH ROW
    WHEN (NEW.usage_type IN ('copied', 'used_in_chat', 'sent_to_lead'))
    EXECUTE FUNCTION update_story_times_used();

-- ===================
-- AGGREGATE FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION aggregate_story_performance(
    p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS void AS $$
BEGIN
    INSERT INTO story_performance_daily (
        story_id, company_id, date,
        views, copies, uses_in_chat, sends_to_lead,
        replies, positive_replies, meetings, deals,
        reply_rate, conversion_rate
    )
    SELECT 
        sul.story_id,
        sul.company_id,
        p_date,
        COUNT(*) FILTER (WHERE sul.usage_type = 'viewed'),
        COUNT(*) FILTER (WHERE sul.usage_type = 'copied'),
        COUNT(*) FILTER (WHERE sul.usage_type = 'used_in_chat'),
        COUNT(*) FILTER (WHERE sul.usage_type = 'sent_to_lead'),
        COUNT(*) FILTER (WHERE sul.outcome = 'reply'),
        COUNT(*) FILTER (WHERE sul.outcome = 'positive_reply'),
        COUNT(*) FILTER (WHERE sul.outcome = 'meeting'),
        COUNT(*) FILTER (WHERE sul.outcome = 'deal'),
        CASE 
            WHEN COUNT(*) FILTER (WHERE sul.usage_type = 'sent_to_lead') > 0 
            THEN COUNT(*) FILTER (WHERE sul.outcome IN ('reply', 'positive_reply'))::NUMERIC 
                 / COUNT(*) FILTER (WHERE sul.usage_type = 'sent_to_lead')
            ELSE NULL 
        END,
        CASE 
            WHEN COUNT(*) FILTER (WHERE sul.usage_type = 'sent_to_lead') > 0 
            THEN COUNT(*) FILTER (WHERE sul.outcome = 'deal')::NUMERIC 
                 / COUNT(*) FILTER (WHERE sul.usage_type = 'sent_to_lead')
            ELSE NULL 
        END
    FROM story_usage_logs sul
    WHERE sul.created_at::DATE = p_date
    GROUP BY sul.story_id, sul.company_id
    ON CONFLICT (story_id, date) DO UPDATE SET
        views = EXCLUDED.views,
        copies = EXCLUDED.copies,
        uses_in_chat = EXCLUDED.uses_in_chat,
        sends_to_lead = EXCLUDED.sends_to_lead,
        replies = EXCLUDED.replies,
        positive_replies = EXCLUDED.positive_replies,
        meetings = EXCLUDED.meetings,
        deals = EXCLUDED.deals,
        reply_rate = EXCLUDED.reply_rate,
        conversion_rate = EXCLUDED.conversion_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===================
-- ANALYTICS VIEWS
-- ===================

CREATE OR REPLACE VIEW story_performance_summary AS
SELECT 
    cs.id as story_id,
    cs.title,
    cs.story_type,
    cs.audience,
    cs.company_id,
    cs.times_used,
    -- Letzte 30 Tage
    COALESCE(SUM(spd.views), 0) as views_30d,
    COALESCE(SUM(spd.copies), 0) as copies_30d,
    COALESCE(SUM(spd.sends_to_lead), 0) as sends_30d,
    COALESCE(SUM(spd.replies), 0) as replies_30d,
    COALESCE(SUM(spd.deals), 0) as deals_30d,
    -- Raten
    CASE 
        WHEN SUM(spd.sends_to_lead) > 0 
        THEN ROUND(SUM(spd.replies)::NUMERIC / SUM(spd.sends_to_lead) * 100, 1)
        ELSE NULL 
    END as reply_rate_30d,
    CASE 
        WHEN SUM(spd.sends_to_lead) > 0 
        THEN ROUND(SUM(spd.deals)::NUMERIC / SUM(spd.sends_to_lead) * 100, 1)
        ELSE NULL 
    END as conversion_rate_30d
FROM company_stories cs
LEFT JOIN story_performance_daily spd 
    ON cs.id = spd.story_id 
    AND spd.date >= CURRENT_DATE - 30
WHERE cs.is_active = true
GROUP BY cs.id, cs.title, cs.story_type, cs.audience, cs.company_id, cs.times_used;

CREATE OR REPLACE VIEW compliance_summary AS
SELECT 
    company_id,
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_checks,
    SUM(CASE WHEN was_compliant THEN 1 ELSE 0 END) as compliant_count,
    SUM(CASE WHEN NOT was_compliant THEN 1 ELSE 0 END) as violation_count,
    SUM(CASE WHEN had_blockers THEN 1 ELSE 0 END) as blocker_count,
    ROUND(
        SUM(CASE WHEN was_compliant THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100, 
        1
    ) as compliance_rate
FROM compliance_violations_log
GROUP BY company_id, DATE_TRUNC('day', created_at);

-- ===================
-- COMMENTS
-- ===================

COMMENT ON TABLE story_usage_logs IS 'Tracking für Story-Nutzung';
COMMENT ON TABLE compliance_violations_log IS 'Log aller Compliance-Prüfungen';
COMMENT ON TABLE story_performance_daily IS 'Tägliche Performance-Aggregates pro Story';
COMMENT ON TABLE product_usage_logs IS 'Tracking für Produkt-Nutzung';
COMMENT ON TABLE guardrail_triggers_log IS 'Log wann welche Guardrails getriggert wurden';

-- ===================
-- SUCCESS MESSAGE
-- ===================

DO $$
BEGIN
    RAISE NOTICE '✅ Storybook Analytics erfolgreich installiert!';
    RAISE NOTICE '   - story_usage_logs Tabelle erstellt';
    RAISE NOTICE '   - compliance_violations_log Tabelle erstellt';
    RAISE NOTICE '   - story_performance_daily Tabelle erstellt';
    RAISE NOTICE '   - Analytics Views erstellt';
END $$;

