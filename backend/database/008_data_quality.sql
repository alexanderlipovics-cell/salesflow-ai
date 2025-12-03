-- ═════════════════════════════════════════════════════════════════
-- PHASE 5: DATA QUALITY & DUPLICATE DETECTION
-- ═════════════════════════════════════════════════════════════════
-- Automatische Erkennung und Bereinigung von Dubletten
-- Datenqualitäts-Monitoring und Scoring
-- ═════════════════════════════════════════════════════════════════

-- Enable fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ─────────────────────────────────────────────────────────────────
-- 1. DATA QUALITY METRICS
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL, 
    -- Types: 'completeness', 'accuracy', 'duplicates', 'freshness', 'consistency'
    entity_type VARCHAR(50) NOT NULL, 
    -- Entities: 'leads', 'users', 'activities', 'products', 'knowledge_base'
    score FLOAT CHECK (score BETWEEN 0 AND 100) NOT NULL,
    total_records INTEGER,
    issues_found INTEGER,
    details JSONB DEFAULT '{}'::jsonb,
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    measured_by VARCHAR(100) DEFAULT 'system',
    
    CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_quality_type ON data_quality_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_quality_entity ON data_quality_metrics(entity_type);
CREATE INDEX IF NOT EXISTS idx_quality_date ON data_quality_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_score ON data_quality_metrics(score);

-- ─────────────────────────────────────────────────────────────────
-- 2. POTENTIAL DUPLICATES
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS potential_duplicates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, 
    -- Types: 'leads', 'users', 'products', 'social_accounts'
    entity1_id UUID NOT NULL,
    entity2_id UUID NOT NULL,
    similarity_score FLOAT CHECK (similarity_score BETWEEN 0 AND 1) NOT NULL,
    matching_fields TEXT[] DEFAULT ARRAY[]::TEXT[], 
    -- Fields: ['name', 'email', 'phone', 'company']
    confidence_level VARCHAR(50) DEFAULT 'medium', 
    -- Levels: 'low', 'medium', 'high', 'certain'
    status VARCHAR(50) DEFAULT 'pending', 
    -- Status: 'pending', 'confirmed_duplicate', 'not_duplicate', 'merged', 'ignored'
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    detected_by VARCHAR(100) DEFAULT 'system',
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    merge_details JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT no_self_duplicate CHECK (entity1_id != entity2_id),
    CONSTRAINT unique_duplicate_pair UNIQUE(entity_type, entity1_id, entity2_id),
    CONSTRAINT valid_similarity CHECK (similarity_score >= 0 AND similarity_score <= 1),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'confirmed_duplicate', 'not_duplicate', 'merged', 'ignored', 'auto_merged'
    ))
);

CREATE INDEX IF NOT EXISTS idx_duplicates_status ON potential_duplicates(status);
CREATE INDEX IF NOT EXISTS idx_duplicates_score ON potential_duplicates(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_duplicates_entity1 ON potential_duplicates(entity1_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_entity2 ON potential_duplicates(entity2_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_entity_type ON potential_duplicates(entity_type);
CREATE INDEX IF NOT EXISTS idx_duplicates_confidence ON potential_duplicates(confidence_level);

-- ─────────────────────────────────────────────────────────────────
-- 3. DATA QUALITY ISSUES LOG
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_quality_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    issue_type VARCHAR(100) NOT NULL, 
    -- Types: 'missing_required_field', 'invalid_format', 'outdated_data', 
    --        'inconsistent_data', 'duplicate_suspected'
    severity VARCHAR(50) DEFAULT 'medium', 
    -- Severity: 'low', 'medium', 'high', 'critical'
    field_name VARCHAR(100),
    current_value TEXT,
    expected_value TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open', 
    -- Status: 'open', 'acknowledged', 'fixed', 'ignored'
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    fixed_at TIMESTAMPTZ,
    fixed_by UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_issue_status CHECK (status IN ('open', 'acknowledged', 'fixed', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_issues_entity ON data_quality_issues(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_issues_type ON data_quality_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON data_quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_status ON data_quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_date ON data_quality_issues(detected_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 4. LEAD COMPLETENESS SCORES (für Quick Access)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_quality_scores (
    lead_id UUID PRIMARY KEY,
    completeness_score INTEGER CHECK (completeness_score BETWEEN 0 AND 100),
    data_quality_score INTEGER CHECK (data_quality_score BETWEEN 0 AND 100),
    engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    missing_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
    quality_issues_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_completeness CHECK (completeness_score IS NULL OR (completeness_score >= 0 AND completeness_score <= 100)),
    CONSTRAINT valid_data_quality CHECK (data_quality_score IS NULL OR (data_quality_score >= 0 AND data_quality_score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_lead_quality_overall ON lead_quality_scores(overall_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_lead_quality_completeness ON lead_quality_scores(completeness_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_lead_quality_updated ON lead_quality_scores(last_calculated_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 5. FUNKTION: Finde Lead-Dubletten
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION detect_duplicate_leads(
    p_min_similarity FLOAT DEFAULT 0.8
)
RETURNS INTEGER AS $$
DECLARE
    duplicates_found INTEGER := 0;
BEGIN
    -- 1. Exact email + name match
    INSERT INTO potential_duplicates (
        entity_type, entity1_id, entity2_id, similarity_score, 
        matching_fields, confidence_level, status
    )
    SELECT DISTINCT
        'leads',
        l1.id,
        l2.id,
        1.0,
        ARRAY['name', 'email'],
        'certain',
        'pending'
    FROM leads l1
    INNER JOIN leads l2 ON 
        LOWER(l1.name) = LOWER(l2.name)
        AND LOWER(l1.email) = LOWER(l2.email)
        AND l1.id < l2.id
    WHERE l1.email IS NOT NULL 
      AND l1.email != ''
    ON CONFLICT (entity_type, entity1_id, entity2_id) DO NOTHING;
    
    GET DIAGNOSTICS duplicates_found = ROW_COUNT;
    
    -- 2. Same phone + similar name
    INSERT INTO potential_duplicates (
        entity_type, entity1_id, entity2_id, similarity_score,
        matching_fields, confidence_level, status
    )
    SELECT DISTINCT
        'leads',
        l1.id,
        l2.id,
        0.95,
        ARRAY['phone', 'name_similar'],
        'high',
        'pending'
    FROM leads l1
    INNER JOIN leads l2 ON 
        l1.phone = l2.phone 
        AND l1.id < l2.id
    WHERE l1.phone IS NOT NULL
      AND l1.phone != ''
      AND similarity(l1.name, l2.name) > 0.7
    ON CONFLICT (entity_type, entity1_id, entity2_id) DO NOTHING;
    
    GET DIAGNOSTICS duplicates_found = duplicates_found + ROW_COUNT;
    
    -- 3. Very similar names + same user (typos?)
    INSERT INTO potential_duplicates (
        entity_type, entity1_id, entity2_id, similarity_score,
        matching_fields, confidence_level, status
    )
    SELECT DISTINCT
        'leads',
        l1.id,
        l2.id,
        similarity(l1.name, l2.name)::FLOAT,
        ARRAY['name_similar', 'same_owner'],
        'medium',
        'pending'
    FROM leads l1
    INNER JOIN leads l2 ON 
        l1.user_id = l2.user_id
        AND l1.id < l2.id
    WHERE similarity(l1.name, l2.name) > p_min_similarity
      AND l1.name != l2.name
    ON CONFLICT (entity_type, entity1_id, entity2_id) DO NOTHING;
    
    GET DIAGNOSTICS duplicates_found = duplicates_found + ROW_COUNT;
    
    RETURN duplicates_found;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 6. FUNKTION: Merge Leads (Dubletten zusammenführen)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION merge_leads(
    p_keep_lead_id UUID,
    p_merge_lead_id UUID,
    p_merged_by UUID
)
RETURNS JSONB AS $$
DECLARE
    merge_result JSONB;
    activities_moved INTEGER;
    messages_moved INTEGER;
BEGIN
    -- Check if leads exist
    IF NOT EXISTS (SELECT 1 FROM leads WHERE id = p_keep_lead_id) THEN
        RAISE EXCEPTION 'Keep Lead ID nicht gefunden';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM leads WHERE id = p_merge_lead_id) THEN
        RAISE EXCEPTION 'Merge Lead ID nicht gefunden';
    END IF;
    
    -- 1. Move all activities
    UPDATE activities
    SET lead_id = p_keep_lead_id
    WHERE lead_id = p_merge_lead_id;
    GET DIAGNOSTICS activities_moved = ROW_COUNT;
    
    -- 2. Move all messages
    UPDATE messages
    SET lead_id = p_keep_lead_id
    WHERE lead_id = p_merge_lead_id;
    GET DIAGNOSTICS messages_moved = ROW_COUNT;
    
    -- 3. Move social accounts
    UPDATE social_accounts
    SET lead_id = p_keep_lead_id
    WHERE lead_id = p_merge_lead_id;
    
    -- 4. Move product interactions
    UPDATE lead_product_interactions
    SET lead_id = p_keep_lead_id
    WHERE lead_id = p_merge_lead_id;
    
    -- 5. Move relationships
    UPDATE lead_relationships
    SET lead_id = p_keep_lead_id
    WHERE lead_id = p_merge_lead_id;
    
    UPDATE lead_relationships
    SET related_lead_id = p_keep_lead_id
    WHERE related_lead_id = p_merge_lead_id;
    
    -- 6. Merge notes
    UPDATE leads
    SET 
        notes = COALESCE(notes, '') || E'\n\n--- MERGED FROM DUPLICATE ---\n' || 
                (SELECT COALESCE(notes, '') FROM leads WHERE id = p_merge_lead_id),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'merged_from', p_merge_lead_id,
            'merged_at', NOW(),
            'merged_by', p_merged_by
        )
    WHERE id = p_keep_lead_id;
    
    -- 7. Delete duplicate lead
    DELETE FROM leads WHERE id = p_merge_lead_id;
    
    -- 8. Update duplicate record
    UPDATE potential_duplicates
    SET 
        status = 'merged',
        reviewed_at = NOW(),
        reviewed_by = p_merged_by,
        merge_details = jsonb_build_object(
            'kept_lead', p_keep_lead_id,
            'deleted_lead', p_merge_lead_id,
            'activities_moved', activities_moved,
            'messages_moved', messages_moved
        )
    WHERE (entity1_id IN (p_keep_lead_id, p_merge_lead_id) 
           OR entity2_id IN (p_keep_lead_id, p_merge_lead_id))
      AND entity_type = 'leads';
    
    -- Build result
    merge_result := jsonb_build_object(
        'status', 'success',
        'kept_lead_id', p_keep_lead_id,
        'merged_lead_id', p_merge_lead_id,
        'activities_moved', activities_moved,
        'messages_moved', messages_moved
    );
    
    RETURN merge_result;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 7. FUNKTION: Berechne Lead Completeness Score
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_lead_completeness(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    lead_record RECORD;
    missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT * INTO lead_record FROM leads WHERE id = p_lead_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Required fields (20 points each)
    IF lead_record.name IS NOT NULL AND lead_record.name != '' THEN 
        score := score + 20; 
    ELSE
        missing_fields := array_append(missing_fields, 'name');
    END IF;
    
    IF lead_record.email IS NOT NULL OR lead_record.phone IS NOT NULL THEN 
        score := score + 20; 
    ELSE
        missing_fields := array_append(missing_fields, 'email_or_phone');
    END IF;
    
    IF lead_record.source IS NOT NULL THEN 
        score := score + 10; 
    ELSE
        missing_fields := array_append(missing_fields, 'source');
    END IF;
    
    -- Enrichment data (15 points each)
    IF EXISTS(SELECT 1 FROM bant_assessments WHERE lead_id = p_lead_id) THEN 
        score := score + 15; 
    ELSE
        missing_fields := array_append(missing_fields, 'bant_assessment');
    END IF;
    
    IF EXISTS(SELECT 1 FROM personality_profiles WHERE lead_id = p_lead_id) THEN 
        score := score + 15; 
    ELSE
        missing_fields := array_append(missing_fields, 'personality_profile');
    END IF;
    
    -- Activity data (10 points each)
    IF EXISTS(SELECT 1 FROM lead_context_summaries WHERE lead_id = p_lead_id) THEN 
        score := score + 10; 
    END IF;
    
    IF EXISTS(SELECT 1 FROM activities WHERE lead_id = p_lead_id LIMIT 1) THEN 
        score := score + 10; 
    END IF;
    
    -- Update scores table
    INSERT INTO lead_quality_scores (
        lead_id, completeness_score, missing_fields, last_calculated_at
    )
    VALUES (p_lead_id, score, missing_fields, NOW())
    ON CONFLICT (lead_id) 
    DO UPDATE SET 
        completeness_score = score,
        missing_fields = missing_fields,
        last_calculated_at = NOW();
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 8. FUNKTION: Batch Quality Check
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION run_quality_checks()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    completeness_score FLOAT;
    duplicate_count INTEGER;
    total_leads INTEGER;
BEGIN
    -- Count total leads
    SELECT COUNT(*) INTO total_leads FROM leads;
    
    -- Calculate average completeness
    SELECT AVG(calculate_lead_completeness(id))::FLOAT 
    INTO completeness_score
    FROM leads;
    
    -- Detect duplicates
    SELECT detect_duplicate_leads() INTO duplicate_count;
    
    -- Log metrics
    INSERT INTO data_quality_metrics (
        metric_type, entity_type, score, total_records, issues_found
    )
    VALUES 
        ('completeness', 'leads', completeness_score, total_leads, 0),
        ('duplicates', 'leads', 
         100 - (duplicate_count::FLOAT / NULLIF(total_leads, 0) * 100), 
         total_leads, duplicate_count);
    
    result := jsonb_build_object(
        'completeness_score', completeness_score,
        'duplicates_found', duplicate_count,
        'total_leads', total_leads,
        'timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON TABLE data_quality_metrics IS 'Trackt Datenqualitäts-Metriken über Zeit';
COMMENT ON TABLE potential_duplicates IS 'Identifizierte potenzielle Dubletten zur manuellen Review';
COMMENT ON TABLE data_quality_issues IS 'Log aller erkannten Datenqualitätsprobleme';
COMMENT ON TABLE lead_quality_scores IS 'Pre-calculated Quality Scores für Performance';
COMMENT ON FUNCTION detect_duplicate_leads IS 'Findet potenzielle Lead-Dubletten basierend auf Namen/Email/Phone';
COMMENT ON FUNCTION merge_leads IS 'Führt zwei Dubletten-Leads zusammen (Keep one, merge other)';
COMMENT ON FUNCTION calculate_lead_completeness IS 'Berechnet Vollständigkeits-Score eines Leads (0-100)';
COMMENT ON FUNCTION run_quality_checks IS 'Führt alle Quality Checks aus und liefert Report';

