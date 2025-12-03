-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 2: INDEXES, RLS & FUNCTIONS                                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_templates_company ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_template_performance_template ON template_performance(template_id);
CREATE INDEX IF NOT EXISTS idx_template_performance_score ON template_performance(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_company ON learning_events(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_template ON learning_events(template_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_company ON learning_aggregates(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_company ON knowledge_items(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_domain ON knowledge_items(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_topic ON knowledge_items(topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_item ON knowledge_embeddings(knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Einfache Policies für Demo (alle können lesen)
DROP POLICY IF EXISTS "companies_read" ON companies;
CREATE POLICY "companies_read" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "templates_all" ON templates;
CREATE POLICY "templates_all" ON templates FOR ALL USING (true);

DROP POLICY IF EXISTS "template_performance_all" ON template_performance;
CREATE POLICY "template_performance_all" ON template_performance FOR ALL USING (true);

DROP POLICY IF EXISTS "learning_events_all" ON learning_events;
CREATE POLICY "learning_events_all" ON learning_events FOR ALL USING (true);

DROP POLICY IF EXISTS "learning_aggregates_all" ON learning_aggregates;
CREATE POLICY "learning_aggregates_all" ON learning_aggregates FOR ALL USING (true);

DROP POLICY IF EXISTS "knowledge_items_read" ON knowledge_items;
CREATE POLICY "knowledge_items_read" ON knowledge_items FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "knowledge_embeddings_read" ON knowledge_embeddings;
CREATE POLICY "knowledge_embeddings_read" ON knowledge_embeddings FOR SELECT USING (true);

DROP POLICY IF EXISTS "leads_all" ON leads;
CREATE POLICY "leads_all" ON leads FOR ALL USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_top_templates(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_template_performance();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Get Top Templates
CREATE OR REPLACE FUNCTION get_top_templates(
    p_company_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    category template_category,
    total_uses INTEGER,
    response_rate DECIMAL,
    conversion_rate DECIMAL,
    quality_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.category,
        COALESCE(tp.uses_last_30d, 0)::INTEGER,
        COALESCE(tp.response_rate_30d, 0),
        COALESCE(tp.conversion_rate_30d, 0),
        COALESCE(tp.quality_score, 50)
    FROM templates t
    LEFT JOIN template_performance tp ON tp.template_id = t.id
    WHERE t.company_id = p_company_id
        AND t.is_active = TRUE
    ORDER BY tp.quality_score DESC NULLS LAST, tp.uses_last_30d DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Template Performance Trigger Function
CREATE OR REPLACE FUNCTION update_template_performance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    INSERT INTO template_performance (template_id, company_id, total_uses, last_used_at)
    VALUES (NEW.template_id, NEW.company_id, 1, NOW())
    ON CONFLICT (template_id) DO UPDATE SET
        total_uses = template_performance.total_uses + 1,
        total_responses = template_performance.total_responses + 
            CASE WHEN NEW.response_received THEN 1 ELSE 0 END,
        total_conversions = template_performance.total_conversions + 
            CASE WHEN NEW.converted_to_next_stage THEN 1 ELSE 0 END,
        last_used_at = NOW(),
        updated_at = NOW();
    
    UPDATE template_performance SET
        response_rate = CASE 
            WHEN total_uses > 0 THEN (total_responses::DECIMAL / total_uses) * 100 
            ELSE 0 
        END,
        conversion_rate = CASE 
            WHEN total_uses > 0 THEN (total_conversions::DECIMAL / total_uses) * 100 
            ELSE 0 
        END
    WHERE template_id = NEW.template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_template_performance ON learning_events;
CREATE TRIGGER trigger_update_template_performance
    AFTER INSERT ON learning_events
    FOR EACH ROW
    EXECUTE FUNCTION update_template_performance();

SELECT '✅ PHASE 2 COMPLETE: Indexes, RLS & Functions erstellt!' as status;

