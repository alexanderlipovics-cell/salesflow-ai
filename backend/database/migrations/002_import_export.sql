-- =====================================================
-- IMPORT/EXPORT SYSTEM TABLES
-- CSV Import, Excel/JSON Export
-- =====================================================

-- Import Jobs
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Import Details
    import_type TEXT NOT NULL, -- 'csv', 'salesforce', 'hubspot', etc.
    file_name TEXT NOT NULL,
    file_size INTEGER,
    
    -- Field Mapping (JSON)
    field_mapping JSONB,
    
    -- Progress
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    
    -- Results
    created_leads INTEGER DEFAULT 0,
    updated_leads INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    errors JSONB, -- Array of error objects
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    INDEX idx_import_jobs_user (user_id),
    INDEX idx_import_jobs_status (status),
    INDEX idx_import_jobs_created_at (created_at DESC)
);

-- Export Jobs
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Export Details
    export_type TEXT NOT NULL, -- 'csv', 'excel', 'json'
    export_scope TEXT NOT NULL, -- 'all_leads', 'filtered_leads', 'selected_leads'
    filters JSONB, -- Export filters
    
    -- File Details
    file_path TEXT,
    file_size INTEGER,
    content_type TEXT,
    download_url TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    total_records INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Files expire after 24h
    
    INDEX idx_export_jobs_user (user_id),
    INDEX idx_export_jobs_status (status),
    INDEX idx_export_jobs_created_at (created_at DESC)
);

-- Duplicate Detection Cache
CREATE TABLE IF NOT EXISTS duplicate_detection_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    email TEXT,
    phone TEXT,
    
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_duplicate_cache_email (email),
    INDEX idx_duplicate_cache_phone (phone),
    INDEX idx_duplicate_cache_user (user_id)
);

-- Comments
COMMENT ON TABLE import_jobs IS 'CSV/Salesforce/HubSpot import jobs';
COMMENT ON TABLE export_jobs IS 'Lead export jobs (CSV, Excel, JSON)';
COMMENT ON TABLE duplicate_detection_cache IS 'Cache for duplicate detection during imports';

