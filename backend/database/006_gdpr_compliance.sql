-- ═════════════════════════════════════════════════════════════════
-- PHASE 4: DSGVO-COMPLIANCE FEATURES
-- ═════════════════════════════════════════════════════════════════
-- Vollständige DSGVO-Konformität: Export, Löschung, Audit Trail
-- Artikel 15 (Auskunftsrecht), Art. 17 (Recht auf Vergessenwerden),
-- Art. 20 (Datenportabilität)
-- ═════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. DATA ACCESS AUDIT LOG (Art. 15 DSGVO)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Wer hat auf Daten zugegriffen
    lead_id UUID, -- Auf welchen Lead wurde zugegriffen
    action VARCHAR(50) NOT NULL, 
    -- Actions: 'view', 'edit', 'delete', 'export', 'create', 'anonymize'
    table_name VARCHAR(100), -- Welche Tabelle betroffen
    record_id UUID, -- Welcher Datensatz
    data_accessed TEXT, -- Welche Felder (komma-separiert)
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_path VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_action CHECK (action IN (
        'view', 'edit', 'delete', 'export', 'create', 'anonymize', 'bulk_export'
    ))
);

CREATE INDEX IF NOT EXISTS idx_access_log_user ON data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_log_lead ON data_access_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_access_log_action ON data_access_log(action);
CREATE INDEX IF NOT EXISTS idx_access_log_date ON data_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_table ON data_access_log(table_name);
CREATE INDEX IF NOT EXISTS idx_access_log_ip ON data_access_log(ip_address);

-- ─────────────────────────────────────────────────────────────────
-- 2. DATA DELETION REQUESTS (Art. 17 DSGVO - Recht auf Vergessenwerden)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL, -- Wer beantragt Löschung
    requester_type VARCHAR(50) DEFAULT 'user', 
    -- Types: 'user', 'lead_self', 'admin', 'automatic'
    reason TEXT NOT NULL,
    legal_basis VARCHAR(100), 
    -- Basis: 'art_17_dsgvo', 'consent_withdrawn', 'retention_expired', 'other'
    status VARCHAR(50) DEFAULT 'pending', 
    -- Status: 'pending', 'approved', 'processing', 'completed', 'rejected'
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processed_by UUID,
    approved_by UUID,
    deletion_method VARCHAR(50) DEFAULT 'anonymize', 
    -- Methods: 'anonymize', 'hard_delete', 'archive'
    affected_tables TEXT[] DEFAULT ARRAY[]::TEXT[],
    backup_reference VARCHAR(255), -- Falls Backup vor Löschung erstellt
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'
    )),
    CONSTRAINT valid_deletion_method CHECK (deletion_method IN (
        'anonymize', 'hard_delete', 'archive'
    ))
);

CREATE INDEX IF NOT EXISTS idx_deletion_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_lead ON data_deletion_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_deletion_user ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requested ON data_deletion_requests(requested_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 3. DATA EXPORT REQUESTS (Art. 20 DSGVO - Datenportabilität)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lead_id UUID, -- NULL = alle eigenen Daten exportieren
    export_scope VARCHAR(50) DEFAULT 'personal', 
    -- Scopes: 'personal', 'single_lead', 'all_leads', 'squad_data'
    export_format VARCHAR(50) DEFAULT 'json', 
    -- Formats: 'json', 'csv', 'pdf', 'xml'
    include_attachments BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'pending',
    -- Status: 'pending', 'processing', 'completed', 'failed', 'expired'
    file_path VARCHAR(500),
    download_url VARCHAR(500),
    file_size_bytes BIGINT,
    expires_at TIMESTAMPTZ, -- Download-Link läuft nach 7 Tagen ab
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    started_processing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_export_status CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'expired', 'cancelled'
    )),
    CONSTRAINT valid_export_format CHECK (export_format IN (
        'json', 'csv', 'pdf', 'xml', 'xlsx'
    ))
);

CREATE INDEX IF NOT EXISTS idx_export_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_export_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_export_lead ON data_export_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_export_expires ON data_export_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_export_requested ON data_export_requests(requested_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 4. USER CONSENTS (Einwilligungen-Management)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    consent_type VARCHAR(100) NOT NULL, 
    -- Types: 'data_processing', 'marketing', 'analytics', 'ai_training', 'third_party_sharing'
    consented BOOLEAN NOT NULL,
    consent_version VARCHAR(50), -- Version der Datenschutzerklärung
    consent_text TEXT, -- Volltext der Einwilligung
    ip_address INET,
    user_agent TEXT,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_consent_type UNIQUE(user_id, consent_type, is_active)
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_active ON user_consents(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_consent_expires ON user_consents(expires_at);

-- ─────────────────────────────────────────────────────────────────
-- 5. DATA RETENTION POLICIES
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    auto_delete_enabled BOOLEAN DEFAULT FALSE,
    deletion_method VARCHAR(50) DEFAULT 'anonymize',
    legal_basis TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_retention_days CHECK (retention_days > 0)
);

CREATE INDEX IF NOT EXISTS idx_retention_table ON data_retention_policies(table_name);
CREATE INDEX IF NOT EXISTS idx_retention_active ON data_retention_policies(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────
-- 6. PRIVACY SETTINGS (Pro User/Lead)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS privacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'user' oder 'lead'
    entity_id UUID NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_privacy_setting UNIQUE(entity_type, entity_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_privacy_entity ON privacy_settings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_privacy_key ON privacy_settings(setting_key);

-- ─────────────────────────────────────────────────────────────────
-- TRIGGER: Auto-Update Timestamps
-- ─────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_user_consents_timestamp
    BEFORE UPDATE ON user_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_data_retention_timestamp
    BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_privacy_settings_timestamp
    BEFORE UPDATE ON privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON TABLE data_access_log IS 'Audit Trail für alle Datenzugriffe (DSGVO Art. 15)';
COMMENT ON TABLE data_deletion_requests IS 'Verwaltung von Löschanträgen (DSGVO Art. 17 - Recht auf Vergessenwerden)';
COMMENT ON TABLE data_export_requests IS 'Verwaltung von Datenexport-Anfragen (DSGVO Art. 20 - Datenportabilität)';
COMMENT ON TABLE user_consents IS 'Verwaltung aller Einwilligungen für rechtskonforme Datenverarbeitung';
COMMENT ON TABLE data_retention_policies IS 'Definiert Aufbewahrungsfristen für verschiedene Datentypen';
COMMENT ON TABLE privacy_settings IS 'Individuelle Datenschutz-Einstellungen pro User/Lead';

