-- ═════════════════════════════════════════════════════════════════
-- PHASE 1: KNOWLEDGE GRAPH & BEZIEHUNGSNETZWERK
-- ═════════════════════════════════════════════════════════════════
-- Erweitert Sales Flow AI um ein vollständiges Beziehungsnetzwerk
-- für Leads, Users, Squads und deren Verbindungen
-- ═════════════════════════════════════════════════════════════════

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Für Text-Similarity

-- ─────────────────────────────────────────────────────────────────
-- 1. LEAD-TO-LEAD BEZIEHUNGEN (Referrals, Connections)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    related_lead_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL, 
    -- Types: 'referred_by', 'knows', 'works_with', 'family', 'friend', 'colleague'
    strength INTEGER CHECK (strength BETWEEN 0 AND 100) DEFAULT 50, 
    -- Connection strength: 0 = weak, 100 = sehr stark
    source VARCHAR(100), 
    -- Source: 'linkedin', 'facebook', 'manual', 'auto_detected', 'instagram'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_lead_relationship UNIQUE(lead_id, related_lead_id, relationship_type),
    CONSTRAINT no_self_reference CHECK (lead_id != related_lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_rel_lead ON lead_relationships(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_rel_related ON lead_relationships(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_rel_type ON lead_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_lead_rel_strength ON lead_relationships(strength DESC);
CREATE INDEX IF NOT EXISTS idx_lead_rel_source ON lead_relationships(source);

-- ─────────────────────────────────────────────────────────────────
-- 2. SQUAD DOWNLINE HIERARCHIE (Multi-Level Network)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squad_hierarchy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    parent_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Upline
    squad_id UUID NOT NULL,
    level INTEGER NOT NULL DEFAULT 1, 
    -- Level: 1 = direct recruit, 2 = second level, etc. (max 10)
    recruitment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'active', 
    -- Status: 'active', 'inactive', 'churned', 'paused'
    lifetime_sales DECIMAL(12,2) DEFAULT 0,
    team_size INTEGER DEFAULT 0, -- Total downline count
    personal_sales_current_month DECIMAL(10,2) DEFAULT 0,
    team_sales_current_month DECIMAL(10,2) DEFAULT 0,
    rank VARCHAR(100), -- z.B. 'Bronze', 'Silver', 'Gold', 'Platinum'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT level_range CHECK (level BETWEEN 1 AND 10),
    CONSTRAINT no_self_parent CHECK (user_id != parent_id)
);

CREATE INDEX IF NOT EXISTS idx_squad_hierarchy_user ON squad_hierarchy(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_hierarchy_parent ON squad_hierarchy(parent_id);
CREATE INDEX IF NOT EXISTS idx_squad_hierarchy_squad ON squad_hierarchy(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_hierarchy_level ON squad_hierarchy(level);
CREATE INDEX IF NOT EXISTS idx_squad_hierarchy_status ON squad_hierarchy(status);
CREATE INDEX IF NOT EXISTS idx_squad_hierarchy_rank ON squad_hierarchy(rank);

-- ─────────────────────────────────────────────────────────────────
-- 3. CONTENT-TO-LEAD VERKNÜPFUNGEN (für RAG)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_content_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    content_type VARCHAR(50) NOT NULL, 
    -- Types: 'objection_response', 'product_info', 'playbook', 'article', 'script'
    content_id UUID, -- Reference to knowledge_base entry
    content_title VARCHAR(255),
    relevance_score FLOAT CHECK (relevance_score BETWEEN 0 AND 1),
    used_in_conversation BOOLEAN DEFAULT FALSE,
    conversation_id UUID, -- Optional: Link zu spezifischem Chat
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5), -- User Feedback
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_relevance CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1))
);

CREATE INDEX IF NOT EXISTS idx_content_ref_lead ON lead_content_references(lead_id);
CREATE INDEX IF NOT EXISTS idx_content_ref_type ON lead_content_references(content_type);
CREATE INDEX IF NOT EXISTS idx_content_ref_content ON lead_content_references(content_id);
CREATE INDEX IF NOT EXISTS idx_content_ref_relevance ON lead_content_references(relevance_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_content_ref_used ON lead_content_references(used_in_conversation);

-- ─────────────────────────────────────────────────────────────────
-- 4. FUNKTION: Berechne Team-Größe rekursiv
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_team_size(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_team_size INTEGER;
BEGIN
    WITH RECURSIVE downline AS (
        -- Direkte Recruits (Level 1)
        SELECT user_id, 1 as depth
        FROM squad_hierarchy
        WHERE parent_id = p_user_id AND status = 'active'
        
        UNION ALL
        
        -- Indirekte Recruits (rekursiv bis Level 10)
        SELECT sh.user_id, d.depth + 1
        FROM squad_hierarchy sh
        INNER JOIN downline d ON sh.parent_id = d.user_id
        WHERE d.depth < 10 AND sh.status = 'active'
    )
    SELECT COUNT(*) INTO total_team_size
    FROM downline;
    
    RETURN COALESCE(total_team_size, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 5. AUTO-UPDATE TEAM SIZE TRIGGER
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_team_sizes()
RETURNS TRIGGER AS $$
DECLARE
    affected_parent_id UUID;
BEGIN
    -- Bestimme betroffene Parent ID
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        affected_parent_id := NEW.parent_id;
    ELSIF TG_OP = 'DELETE' THEN
        affected_parent_id := OLD.parent_id;
    END IF;
    
    -- Update parent's team_size wenn Parent existiert
    IF affected_parent_id IS NOT NULL THEN
        UPDATE squad_hierarchy
        SET 
            team_size = calculate_team_size(user_id),
            updated_at = NOW()
        WHERE user_id = affected_parent_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_team_sizes
    AFTER INSERT OR UPDATE OR DELETE ON squad_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION update_team_sizes();

-- ─────────────────────────────────────────────────────────────────
-- 6. AUTO-UPDATE TIMESTAMP TRIGGER
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_relationships_timestamp
    BEFORE UPDATE ON lead_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_squad_hierarchy_timestamp
    BEFORE UPDATE ON squad_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON TABLE lead_relationships IS 'Speichert Beziehungen zwischen Leads für Social Graph und Warm Intros';
COMMENT ON TABLE squad_hierarchy IS 'Multi-Level Network Hierarchie für Team-Tracking und Provisionsberechnung';
COMMENT ON TABLE lead_content_references IS 'Verknüpft Leads mit genutzten Content-Pieces für RAG-Optimierung';
COMMENT ON FUNCTION calculate_team_size IS 'Berechnet rekursiv die Größe der gesamten Downline (bis Level 10)';

