-- =====================================================
-- LEAD ENRICHMENT SYSTEM
-- Clearbit, Hunter.io, LinkedIn integration
-- =====================================================

-- Lead Enrichment Jobs
CREATE TABLE IF NOT EXISTS lead_enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Job Details
    enrichment_type TEXT NOT NULL, -- 'email', 'company', 'social', 'full'
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    
    -- Results
    data_found BOOLEAN DEFAULT FALSE,
    sources_queried TEXT[], -- ['clearbit', 'hunter', 'linkedin']
    enriched_fields TEXT[], -- ['email', 'phone', 'linkedin_url']
    
    -- Error Handling
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    INDEX idx_enrichment_jobs_lead (lead_id),
    INDEX idx_enrichment_jobs_status (status),
    INDEX idx_enrichment_jobs_created_at (created_at DESC)
);

-- Enriched Data Cache
CREATE TABLE IF NOT EXISTS enriched_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Lookup Keys
    lookup_type TEXT NOT NULL, -- 'email', 'company', 'email_lookup', 'social'
    lookup_value TEXT NOT NULL, -- Actual value (email address, company name, etc.)
    source TEXT NOT NULL, -- 'clearbit', 'hunter', 'linkedin'
    
    -- Cached Data (JSONB for flexibility)
    data JSONB NOT NULL,
    
    -- Cache Metadata
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_accessed_at TIMESTAMPTZ,
    hit_count INTEGER DEFAULT 0,
    
    INDEX idx_enriched_cache_lookup (lookup_type, lookup_value, source),
    INDEX idx_enriched_cache_expires (expires_at)
);

-- API Usage Tracking (for monitoring API costs)
CREATE TABLE IF NOT EXISTS api_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- API Details
    api_provider TEXT NOT NULL, -- 'clearbit', 'hunter', 'linkedin'
    endpoint TEXT NOT NULL,
    
    -- Request Details
    request_params JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Cost Tracking
    credits_used DECIMAL(10,4),
    
    -- User Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_api_usage_provider (api_provider),
    INDEX idx_api_usage_user (user_id),
    INDEX idx_api_usage_created_at (created_at DESC)
);

-- Extend leads table with enrichment fields
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS company_domain TEXT,
ADD COLUMN IF NOT EXISTS company_size INTEGER,
ADD COLUMN IF NOT EXISTS company_industry TEXT,
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS company_revenue BIGINT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS company_location TEXT,
ADD COLUMN IF NOT EXISTS company_tech TEXT[],
ADD COLUMN IF NOT EXISTS email_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_validation_score INTEGER,
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrichment_sources TEXT[];

-- Auto-update last_enriched_at
CREATE OR REPLACE FUNCTION update_lead_last_enriched()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND 
        (NEW.bio IS DISTINCT FROM OLD.bio OR
         NEW.linkedin_url IS DISTINCT FROM OLD.linkedin_url OR
         NEW.company_size IS DISTINCT FROM OLD.company_size)) THEN
        NEW.last_enriched_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lead_last_enriched ON leads;
CREATE TRIGGER trigger_update_lead_last_enriched
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_last_enriched();

-- Clean up expired cache entries (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM enriched_data_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE lead_enrichment_jobs IS 'Tracks lead enrichment jobs and their results';
COMMENT ON TABLE enriched_data_cache IS 'Caches external API responses to reduce costs';
COMMENT ON TABLE api_usage_log IS 'Logs API usage for cost monitoring';
COMMENT ON COLUMN leads.last_enriched_at IS 'Timestamp when lead was last enriched';
COMMENT ON COLUMN leads.enrichment_sources IS 'List of sources used for enrichment';

