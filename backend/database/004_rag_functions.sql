-- ═════════════════════════════════════════════════════════════════
-- PHASE 2: RAG QUERY FUNCTIONS
-- ═════════════════════════════════════════════════════════════════
-- Semantische Suche und intelligente Empfehlungen
-- ═════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. FUNKTION: Semantische Suche in Knowledge Base
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_knowledge_base(
    p_query_embedding VECTOR(1536),
    p_category VARCHAR DEFAULT NULL,
    p_language VARCHAR DEFAULT 'de',
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    kb_id UUID,
    title VARCHAR,
    content TEXT,
    summary TEXT,
    similarity FLOAT,
    category VARCHAR,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        knowledge_base.title,
        knowledge_base.content,
        knowledge_base.summary,
        (1 - (embedding <=> p_query_embedding))::FLOAT as similarity,
        knowledge_base.category,
        knowledge_base.tags
    FROM knowledge_base
    WHERE is_active = TRUE
      AND (p_category IS NULL OR category = p_category)
      AND (p_language IS NULL OR language = p_language)
      AND embedding IS NOT NULL
    ORDER BY embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 2. FUNKTION: Finde passende Einwandbehandlung
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_objection_response(
    p_objection_text TEXT,
    p_personality_type VARCHAR DEFAULT NULL,
    p_industry TEXT DEFAULT NULL
)
RETURNS TABLE (
    objection_id UUID,
    objection_text TEXT,
    objection_category TEXT,
    response_script TEXT,
    adapted_response TEXT,
    success_rate FLOAT,
    usage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ol.id,
        ol.objection_text,
        ol.category,
        COALESCE(
            (SELECT response_script FROM objection_responses 
             WHERE objection_id = ol.id 
             ORDER BY success_rate DESC NULLS LAST 
             LIMIT 1),
            'Keine Response verfügbar'
        ) as response_script,
        CASE 
            WHEN p_personality_type IS NOT NULL AND ol.personality_adaptations IS NOT NULL
            THEN COALESCE(
                (ol.personality_adaptations->>p_personality_type)::TEXT,
                COALESCE(
                    (SELECT response_script FROM objection_responses 
                     WHERE objection_id = ol.id 
                     ORDER BY success_rate DESC NULLS LAST 
                     LIMIT 1),
                    'Keine Response verfügbar'
                )
            )
            ELSE COALESCE(
                (SELECT response_script FROM objection_responses 
                 WHERE objection_id = ol.id 
                 ORDER BY success_rate DESC NULLS LAST 
                 LIMIT 1),
                'Keine Response verfügbar'
            )
        END as adapted_response,
        ol.success_rate,
        ol.usage_count
    FROM objection_library ol
    WHERE 
        -- Text-basierte Suche
        (
            ol.objection_text ILIKE '%' || p_objection_text || '%'
            OR p_objection_text ILIKE '%' || ol.objection_text || '%'
            OR EXISTS (
                SELECT 1 FROM unnest(ol.similar_objections) so
                WHERE p_objection_text ILIKE '%' || so || '%'
            )
        )
        -- Industry Filter (wenn vorhanden)
        AND (p_industry IS NULL OR p_industry = ANY(ol.industry))
    ORDER BY 
        ol.success_rate DESC NULLS LAST,
        ol.usage_count DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 3. FUNKTION: Upsell-Empfehlungen basierend auf Kaufhistorie
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recommend_upsells(
    p_lead_id UUID,
    p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    product_price DECIMAL,
    recommendation_reason TEXT,
    recommendation_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH lead_purchases AS (
        SELECT DISTINCT product_id
        FROM lead_product_interactions
        WHERE lead_id = p_lead_id
          AND interaction_type = 'purchased'
    ),
    lead_interests AS (
        SELECT DISTINCT product_id
        FROM lead_product_interactions
        WHERE lead_id = p_lead_id
          AND interaction_type IN ('interested', 'demo_shown', 'wishlist')
    ),
    lead_personality AS (
        SELECT primary_type
        FROM personality_profiles
        WHERE lead_id = p_lead_id
        LIMIT 1
    )
    SELECT 
        p.id,
        p.name,
        p.price,
        CASE 
            WHEN p.upsell_from IN (SELECT product_id FROM lead_purchases)
            THEN 'Perfekter Upsell zu deinem gekauften Produkt'
            WHEN lp.primary_type IS NOT NULL AND lp.primary_type = ANY(p.target_personality_types)
            THEN 'Passt perfekt zu deiner Persönlichkeit (' || lp.primary_type || ')'
            WHEN p.id IN (SELECT product_id FROM lead_interests)
            THEN 'Du hast bereits Interesse gezeigt'
            ELSE 'Beliebte Wahl bei ähnlichen Kunden'
        END as reason,
        CASE 
            WHEN p.upsell_from IN (SELECT product_id FROM lead_purchases) THEN 1.0
            WHEN lp.primary_type IS NOT NULL AND lp.primary_type = ANY(p.target_personality_types) THEN 0.9
            WHEN p.id IN (SELECT product_id FROM lead_interests) THEN 0.85
            ELSE 0.5
        END::FLOAT as score
    FROM products p
    LEFT JOIN lead_personality lp ON TRUE
    WHERE p.active = TRUE
      AND p.id NOT IN (SELECT product_id FROM lead_purchases)
      AND (
          -- Upsell von gekauftem Produkt
          p.upsell_from IN (SELECT product_id FROM lead_purchases)
          -- Personality Match
          OR (lp.primary_type IS NOT NULL AND lp.primary_type = ANY(p.target_personality_types))
          -- Interest Match
          OR p.id IN (SELECT product_id FROM lead_interests)
          -- Popular Products
          OR p.sales_count > 10
      )
    ORDER BY score DESC, p.sales_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 4. FUNKTION: Cross-Sell Empfehlungen
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recommend_cross_sells(
    p_lead_id UUID,
    p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    product_price DECIMAL,
    synergy_reason TEXT,
    score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH lead_purchases AS (
        SELECT DISTINCT product_id
        FROM lead_product_interactions
        WHERE lead_id = p_lead_id
          AND interaction_type = 'purchased'
    )
    SELECT DISTINCT
        p.id,
        p.name,
        p.price,
        'Perfekte Ergänzung zu deinen bisherigen Produkten' as reason,
        0.95::FLOAT as score
    FROM products p
    INNER JOIN lead_purchases lp ON lp.product_id = ANY(
        SELECT unnest(cross_sell_products) FROM products WHERE id = lp.product_id
    )
    WHERE p.active = TRUE
      AND p.id NOT IN (SELECT product_id FROM lead_purchases)
    ORDER BY p.sales_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 5. FUNKTION: Relevante Success Stories finden
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_relevant_success_stories(
    p_user_id UUID DEFAULT NULL,
    p_story_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    story_id UUID,
    title VARCHAR,
    description TEXT,
    story_type VARCHAR,
    metrics JSONB,
    upvotes INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.id,
        ss.title,
        ss.description,
        ss.story_type,
        ss.metrics,
        ss.upvotes,
        ss.created_at
    FROM success_stories ss
    WHERE 
        (p_story_type IS NULL OR ss.story_type = p_story_type)
        AND (
            ss.visibility = 'public'
            OR (p_user_id IS NOT NULL AND ss.visibility IN ('squad', 'company'))
        )
    ORDER BY 
        ss.is_featured DESC,
        ss.upvotes DESC,
        ss.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 6. FUNKTION: Content Usage Tracking (für ML Learning)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION track_content_usage(
    p_content_id UUID,
    p_content_type VARCHAR,
    p_was_effective BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update usage count in knowledge_base
    IF p_content_type = 'knowledge_base' THEN
        UPDATE knowledge_base
        SET 
            usage_count = usage_count + 1,
            effectiveness_score = CASE
                WHEN p_was_effective IS NOT NULL THEN
                    COALESCE(effectiveness_score, 0.5) * 0.9 + 
                    (CASE WHEN p_was_effective THEN 1.0 ELSE 0.0 END) * 0.1
                ELSE effectiveness_score
            END,
            updated_at = NOW()
        WHERE id = p_content_id;
    
    -- Update usage in objection_library
    ELSIF p_content_type = 'objection' THEN
        UPDATE objection_library
        SET 
            usage_count = usage_count + 1,
            success_rate = CASE
                WHEN p_was_effective IS NOT NULL THEN
                    COALESCE(success_rate, 0.5) * 0.9 + 
                    (CASE WHEN p_was_effective THEN 1.0 ELSE 0.0 END) * 0.1
                ELSE success_rate
            END,
            updated_at = NOW()
        WHERE id = p_content_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 7. FUNKTION: Product Performance Metrics
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_product_performance(
    p_product_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    total_sales INTEGER,
    total_revenue DECIMAL,
    avg_conversion_rate FLOAT,
    avg_rating DECIMAL,
    review_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT lpi.id) FILTER (WHERE lpi.interaction_type = 'purchased')::INTEGER,
        SUM(lpi.amount) FILTER (WHERE lpi.interaction_type = 'purchased'),
        (COUNT(DISTINCT lpi.lead_id) FILTER (WHERE lpi.interaction_type = 'purchased')::FLOAT / 
         NULLIF(COUNT(DISTINCT lpi.lead_id) FILTER (WHERE lpi.interaction_type IN ('interested', 'demo_shown')), 0))::FLOAT,
        p.avg_rating,
        (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id)::INTEGER
    FROM products p
    LEFT JOIN lead_product_interactions lpi ON p.id = lpi.product_id
        AND lpi.interaction_date >= NOW() - (p_days_back || ' days')::INTERVAL
    WHERE p.id = p_product_id
    GROUP BY p.id, p.name, p.avg_rating;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 8. FUNKTION: Best Performing Content
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_top_performing_content(
    p_category VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    content_id UUID,
    title VARCHAR,
    category VARCHAR,
    usage_count INTEGER,
    effectiveness_score FLOAT,
    performance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.title,
        kb.category,
        kb.usage_count,
        kb.effectiveness_score,
        (kb.usage_count * COALESCE(kb.effectiveness_score, 0.5))::FLOAT as perf_score
    FROM knowledge_base kb
    WHERE 
        kb.is_active = TRUE
        AND (p_category IS NULL OR kb.category = p_category)
        AND kb.usage_count > 0
    ORDER BY perf_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION search_knowledge_base IS 'Semantische Vector-Suche in der Knowledge Base mit Similarity-Ranking';
COMMENT ON FUNCTION find_objection_response IS 'Findet beste Einwandbehandlung mit optionaler DISG-Anpassung';
COMMENT ON FUNCTION recommend_upsells IS 'Intelligente Upsell-Empfehlungen basierend auf Kaufhistorie und Persönlichkeit';
COMMENT ON FUNCTION recommend_cross_sells IS 'Cross-Selling Empfehlungen für komplementäre Produkte';
COMMENT ON FUNCTION get_relevant_success_stories IS 'Findet inspirerende Success Stories für Motivation';
COMMENT ON FUNCTION track_content_usage IS 'Trackt Content-Nutzung und lernt aus Effectiveness-Feedback';
COMMENT ON FUNCTION get_product_performance IS 'Liefert umfassende Performance-Metriken für Produkte';
COMMENT ON FUNCTION get_top_performing_content IS 'Identifiziert best-performing Content für Optimierung';

