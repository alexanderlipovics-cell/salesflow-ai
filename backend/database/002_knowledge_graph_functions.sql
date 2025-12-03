-- ═════════════════════════════════════════════════════════════════
-- PHASE 1: KNOWLEDGE GRAPH QUERY FUNCTIONS
-- ═════════════════════════════════════════════════════════════════
-- Erweiterte Query-Funktionen für Graph-Traversal und Netzwerk-Analysen
-- ═════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. FUNKTION: Finde alle Beziehungen eines Leads (Graph Traversal)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_lead_network(
    p_lead_id UUID,
    p_max_depth INTEGER DEFAULT 2
)
RETURNS TABLE (
    lead_id UUID,
    lead_name VARCHAR,
    relationship_path TEXT[],
    connection_strength INTEGER,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE lead_graph AS (
        -- Startpunkt (Depth 0)
        SELECT 
            p_lead_id as lead_id,
            CAST('Self' AS VARCHAR(255)) as lead_name,
            ARRAY['self']::TEXT[] as relationship_path,
            100 as connection_strength,
            0 as depth
        
        UNION ALL
        
        -- Verbundene Leads (rekursiv)
        SELECT 
            lr.related_lead_id,
            CAST('Connected Lead' AS VARCHAR(255)),
            lg.relationship_path || lr.relationship_type::TEXT,
            lr.strength,
            lg.depth + 1
        FROM lead_graph lg
        INNER JOIN lead_relationships lr ON lg.lead_id = lr.lead_id
        WHERE lg.depth < p_max_depth
    )
    SELECT 
        lg.lead_id,
        lg.lead_name,
        lg.relationship_path,
        lg.connection_strength,
        lg.depth
    FROM lead_graph lg
    WHERE lg.depth > 0  -- Exclude self
    ORDER BY lg.depth, lg.connection_strength DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 2. FUNKTION: Finde gemeinsame Verbindungen (für Warm Intros)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_common_connections(
    p_lead1_id UUID,
    p_lead2_id UUID
)
RETURNS TABLE (
    common_lead_id UUID,
    relationship_to_lead1 VARCHAR,
    relationship_to_lead2 VARCHAR,
    combined_strength INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        lr1.related_lead_id as common_lead_id,
        lr1.relationship_type as relationship_to_lead1,
        lr2.relationship_type as relationship_to_lead2,
        LEAST(lr1.strength, lr2.strength) as combined_strength
    FROM lead_relationships lr1
    INNER JOIN lead_relationships lr2 
        ON lr1.related_lead_id = lr2.related_lead_id
    WHERE lr1.lead_id = p_lead1_id
      AND lr2.lead_id = p_lead2_id
      AND lr1.related_lead_id != p_lead1_id
      AND lr1.related_lead_id != p_lead2_id
    ORDER BY combined_strength DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 3. FUNKTION: Empfehle Leads aus erweiterten Netzwerk
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recommend_leads_from_network(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    recommended_lead_id UUID,
    connection_path TEXT,
    recommendation_score FLOAT,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_leads AS (
        -- Alle Leads des Users (Simplified - würde normalerweise auf leads table referenzieren)
        SELECT DISTINCT lr.lead_id
        FROM lead_relationships lr
        WHERE lr.lead_id IN (
            SELECT id FROM leads WHERE user_id = p_user_id
        )
    ),
    network_leads AS (
        -- 2nd Degree Connections
        SELECT DISTINCT
            lr2.related_lead_id as rec_lead_id,
            lr1.lead_id::TEXT || ' -> ' || lr2.related_lead_id::TEXT as path,
            ((lr1.strength * lr2.strength) / 100.0)::FLOAT as score,
            'Second-degree connection via ' || lr1.relationship_type as reason
        FROM user_leads ul
        INNER JOIN lead_relationships lr1 ON ul.lead_id = lr1.lead_id
        INNER JOIN lead_relationships lr2 ON lr1.related_lead_id = lr2.lead_id
        WHERE lr2.related_lead_id NOT IN (SELECT lead_id FROM user_leads)
          AND lr1.strength >= 50  -- Nur starke Connections
    )
    SELECT 
        rec_lead_id,
        path,
        score,
        reason
    FROM network_leads
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 4. FUNKTION: Berechne Netzwerk-Statistiken
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_network_stats(p_lead_id UUID)
RETURNS TABLE (
    total_connections INTEGER,
    strong_connections INTEGER,
    weak_connections INTEGER,
    most_common_relationship_type VARCHAR,
    avg_connection_strength FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_connections,
        COUNT(*) FILTER (WHERE strength >= 70)::INTEGER as strong_connections,
        COUNT(*) FILTER (WHERE strength < 50)::INTEGER as weak_connections,
        MODE() WITHIN GROUP (ORDER BY relationship_type) as most_common_relationship_type,
        AVG(strength)::FLOAT as avg_connection_strength
    FROM lead_relationships
    WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 5. FUNKTION: Finde Influencer im Netzwerk (Hub Detection)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_network_influencers(
    p_min_connections INTEGER DEFAULT 5
)
RETURNS TABLE (
    lead_id UUID,
    connection_count INTEGER,
    avg_connection_strength FLOAT,
    influencer_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.lead_id,
        COUNT(*)::INTEGER as connection_count,
        AVG(lr.strength)::FLOAT as avg_connection_strength,
        (COUNT(*) * AVG(lr.strength) / 100.0)::FLOAT as influencer_score
    FROM lead_relationships lr
    GROUP BY lr.lead_id
    HAVING COUNT(*) >= p_min_connections
    ORDER BY influencer_score DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 6. FUNKTION: Berechne Downline-Performance
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_downline_performance(
    p_user_id UUID
)
RETURNS TABLE (
    level INTEGER,
    team_members INTEGER,
    total_sales DECIMAL,
    avg_sales_per_member DECIMAL,
    active_members INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline AS (
        -- Start: Direkte Recruits
        SELECT 
            user_id,
            1 as level,
            lifetime_sales,
            status
        FROM squad_hierarchy
        WHERE parent_id = p_user_id
        
        UNION ALL
        
        -- Recursive: Weitere Levels
        SELECT 
            sh.user_id,
            d.level + 1,
            sh.lifetime_sales,
            sh.status
        FROM squad_hierarchy sh
        INNER JOIN downline d ON sh.parent_id = d.user_id
        WHERE d.level < 10
    )
    SELECT 
        d.level,
        COUNT(*)::INTEGER as team_members,
        SUM(d.lifetime_sales)::DECIMAL as total_sales,
        (SUM(d.lifetime_sales) / NULLIF(COUNT(*), 0))::DECIMAL as avg_sales_per_member,
        COUNT(*) FILTER (WHERE d.status = 'active')::INTEGER as active_members
    FROM downline d
    GROUP BY d.level
    ORDER BY d.level;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 7. FUNKTION: Finde Top-Performer in der Downline
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_top_performers(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    level INTEGER,
    lifetime_sales DECIMAL,
    team_size INTEGER,
    rank VARCHAR,
    performance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline AS (
        SELECT 
            sh.user_id,
            sh.level,
            sh.lifetime_sales,
            sh.team_size,
            sh.rank
        FROM squad_hierarchy sh
        WHERE sh.parent_id = p_user_id
        
        UNION ALL
        
        SELECT 
            sh.user_id,
            sh.level,
            sh.lifetime_sales,
            sh.team_size,
            sh.rank
        FROM squad_hierarchy sh
        INNER JOIN downline d ON sh.parent_id = d.user_id
        WHERE d.level < 10
    )
    SELECT 
        d.user_id,
        d.level,
        d.lifetime_sales,
        d.team_size,
        d.rank,
        (d.lifetime_sales + (d.team_size * 100))::FLOAT as performance_score
    FROM downline d
    WHERE d.lifetime_sales > 0
    ORDER BY performance_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION get_lead_network IS 'Graph-Traversal: Findet alle verbundenen Leads bis zu einer bestimmten Tiefe';
COMMENT ON FUNCTION find_common_connections IS 'Identifiziert gemeinsame Kontakte zwischen zwei Leads für Warm Intros';
COMMENT ON FUNCTION recommend_leads_from_network IS 'Empfiehlt neue Leads basierend auf bestehendem Netzwerk (2nd-degree)';
COMMENT ON FUNCTION get_network_stats IS 'Liefert Statistiken über das Beziehungsnetzwerk eines Leads';
COMMENT ON FUNCTION find_network_influencers IS 'Findet Hub-Leads mit vielen starken Verbindungen';
COMMENT ON FUNCTION get_downline_performance IS 'Analysiert Performance der Downline pro Level';
COMMENT ON FUNCTION get_top_performers IS 'Identifiziert Top-Performer in der gesamten Downline';

