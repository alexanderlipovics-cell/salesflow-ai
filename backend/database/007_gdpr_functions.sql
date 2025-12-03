-- ═════════════════════════════════════════════════════════════════
-- PHASE 4: GDPR COMPLIANCE FUNCTIONS
-- ═════════════════════════════════════════════════════════════════
-- Funktionen für DSGVO-konforme Operationen
-- ═════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. FUNKTION: Vollständiger Daten-Export (DSGVO Art. 20)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Log access
    INSERT INTO data_access_log (user_id, action, table_name, metadata)
    VALUES (p_user_id, 'export', 'users', jsonb_build_object('export_type', 'full_user_data'));
    
    -- Build complete export
    SELECT jsonb_build_object(
        'export_date', NOW(),
        'user_profile', (
            SELECT jsonb_build_object(
                'id', id,
                'email', email,
                'name', name,
                'created_at', created_at,
                'metadata', metadata
            )
            FROM users WHERE id = p_user_id
        ),
        'leads', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'name', name,
                    'email', email,
                    'phone', phone,
                    'status', status,
                    'source', source,
                    'created_at', created_at,
                    'notes', notes,
                    'metadata', metadata
                )
            ), '[]'::jsonb)
            FROM leads WHERE user_id = p_user_id
        ),
        'activities', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'type', type,
                    'description', description,
                    'created_at', created_at,
                    'lead_name', l.name
                )
            ), '[]'::jsonb)
            FROM activities a
            INNER JOIN leads l ON a.lead_id = l.id
            WHERE l.user_id = p_user_id
        ),
        'messages', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'content', content,
                    'channel', channel,
                    'direction', direction,
                    'created_at', created_at,
                    'lead_name', l.name
                )
            ), '[]'::jsonb)
            FROM messages m
            INNER JOIN leads l ON m.lead_id = l.id
            WHERE l.user_id = p_user_id
        ),
        'social_accounts', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'platform', platform,
                    'username', username,
                    'profile_url', profile_url,
                    'created_at', created_at
                )
            ), '[]'::jsonb)
            FROM social_accounts
            WHERE user_id = p_user_id
        ),
        'consents', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'consent_type', consent_type,
                    'consented', consented,
                    'granted_at', granted_at,
                    'consent_version', consent_version
                )
            ), '[]'::jsonb)
            FROM user_consents
            WHERE user_id = p_user_id AND is_active = TRUE
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 2. FUNKTION: Anonymisiere Lead-Daten (GDPR-konform)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION anonymize_lead(
    p_lead_id UUID,
    p_reason TEXT DEFAULT 'GDPR deletion request'
)
RETURNS VOID AS $$
DECLARE
    anonymized_id TEXT;
BEGIN
    anonymized_id := 'DELETED_' || SUBSTRING(p_lead_id::TEXT, 1, 8);
    
    -- Log deletion
    INSERT INTO data_access_log (lead_id, action, table_name, metadata)
    VALUES (
        p_lead_id, 
        'anonymize', 
        'leads', 
        jsonb_build_object('reason', p_reason, 'timestamp', NOW())
    );
    
    -- Anonymize personal data in leads
    UPDATE leads
    SET 
        name = anonymized_id,
        email = NULL,
        phone = NULL,
        notes = '[ANONYMIZED - GDPR]',
        metadata = jsonb_build_object('anonymized', true, 'date', NOW())
    WHERE id = p_lead_id;
    
    -- Anonymize messages content
    UPDATE messages
    SET content = '[DELETED - GDPR]'
    WHERE lead_id = p_lead_id;
    
    -- Keep activities but remove details
    UPDATE activities
    SET 
        description = '[ANONYMIZED]',
        metadata = jsonb_build_object('anonymized', true)
    WHERE lead_id = p_lead_id;
    
    -- Anonymize social accounts
    UPDATE social_accounts
    SET 
        username = NULL,
        display_name = 'Anonymized User',
        bio = NULL,
        profile_data = '{}'::jsonb
    WHERE lead_id = p_lead_id;
    
    -- Delete sensitive interactions
    DELETE FROM social_interactions WHERE lead_id = p_lead_id;
    
    -- Keep relationships but remove context
    UPDATE lead_relationships
    SET metadata = '{}'::jsonb
    WHERE lead_id = p_lead_id OR related_lead_id = p_lead_id;
    
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 3. FUNKTION: Harte Löschung (Vorsicht!)
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hard_delete_lead(
    p_lead_id UUID,
    p_authorized_by UUID,
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Verify authorization (könnte erweitert werden)
    IF p_authorized_by IS NULL THEN
        RAISE EXCEPTION 'Autorisierung erforderlich für Hard Delete';
    END IF;
    
    -- Log deletion before it happens
    INSERT INTO data_access_log (
        user_id, lead_id, action, table_name, metadata
    )
    VALUES (
        p_authorized_by,
        p_lead_id,
        'delete',
        'leads',
        jsonb_build_object(
            'deletion_type', 'hard_delete',
            'reason', p_reason,
            'timestamp', NOW()
        )
    );
    
    -- Delete all related data (CASCADE handles most)
    DELETE FROM lead_relationships WHERE lead_id = p_lead_id OR related_lead_id = p_lead_id;
    DELETE FROM lead_content_references WHERE lead_id = p_lead_id;
    DELETE FROM lead_product_interactions WHERE lead_id = p_lead_id;
    DELETE FROM social_interactions WHERE lead_id = p_lead_id;
    DELETE FROM social_accounts WHERE lead_id = p_lead_id;
    
    -- Finally delete lead (this triggers cascades)
    DELETE FROM leads WHERE id = p_lead_id;
    
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 4. FUNKTION: Check Data Retention Expiry
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_retention_expiry()
RETURNS TABLE (
    lead_id UUID,
    lead_name VARCHAR,
    days_since_last_activity INTEGER,
    retention_policy_days INTEGER,
    recommended_action VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH lead_activity AS (
        SELECT 
            l.id,
            l.name,
            l.created_at,
            MAX(GREATEST(
                COALESCE((SELECT MAX(created_at) FROM activities WHERE lead_id = l.id), l.created_at),
                COALESCE((SELECT MAX(created_at) FROM messages WHERE lead_id = l.id), l.created_at)
            )) as last_activity
        FROM leads l
        GROUP BY l.id, l.name, l.created_at
    ),
    retention_check AS (
        SELECT 
            la.id,
            la.name,
            EXTRACT(DAY FROM NOW() - la.last_activity)::INTEGER as days_inactive,
            COALESCE(
                (SELECT retention_days FROM data_retention_policies 
                 WHERE table_name = 'leads' AND is_active = TRUE LIMIT 1),
                730  -- Default: 2 Jahre
            ) as policy_days
        FROM lead_activity la
    )
    SELECT 
        rc.id,
        rc.name,
        rc.days_inactive,
        rc.policy_days,
        CASE 
            WHEN rc.days_inactive > rc.policy_days THEN 'DELETE_NOW'
            WHEN rc.days_inactive > (rc.policy_days - 30) THEN 'WARNING_EXPIRING_SOON'
            ELSE 'OK'
        END::VARCHAR as recommended_action
    FROM retention_check rc
    WHERE rc.days_inactive > (rc.policy_days - 30)
    ORDER BY rc.days_inactive DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 5. FUNKTION: Prüfe Consent Status
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_user_consent(
    p_user_id UUID,
    p_consent_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_consent BOOLEAN;
BEGIN
    SELECT COALESCE(
        (SELECT consented 
         FROM user_consents 
         WHERE user_id = p_user_id 
           AND consent_type = p_consent_type 
           AND is_active = TRUE
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC
         LIMIT 1),
        FALSE
    ) INTO has_consent;
    
    RETURN has_consent;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- 6. FUNKTION: Auto-Cleanup abgelaufener Exports
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark as expired
    UPDATE data_export_requests
    SET status = 'expired'
    WHERE status = 'completed'
      AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- TODO: Hier könnte man auch die Dateien physisch löschen
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 7. TRIGGER: Log alle wichtigen Datenzugriffe
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_data_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Nur bei relevanten Operationen loggen
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        INSERT INTO data_access_log (
            user_id,
            lead_id,
            action,
            table_name,
            record_id,
            created_at
        )
        VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            CASE 
                WHEN TG_TABLE_NAME = 'leads' THEN COALESCE(NEW.id, OLD.id)
                ELSE COALESCE(NEW.lead_id, OLD.lead_id)
            END,
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            NOW()
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to critical tables
DROP TRIGGER IF EXISTS trg_log_lead_access ON leads;
CREATE TRIGGER trg_log_lead_access
    AFTER UPDATE OR DELETE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_data_access();

-- ─────────────────────────────────────────────────────────────────
-- 8. FUNKTION: Generate Privacy Report
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_privacy_report(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'report_date', NOW(),
        'data_summary', jsonb_build_object(
            'total_leads', (SELECT COUNT(*) FROM leads WHERE user_id = p_user_id),
            'total_activities', (
                SELECT COUNT(*) FROM activities a
                INNER JOIN leads l ON a.lead_id = l.id
                WHERE l.user_id = p_user_id
            ),
            'total_messages', (
                SELECT COUNT(*) FROM messages m
                INNER JOIN leads l ON m.lead_id = l.id
                WHERE l.user_id = p_user_id
            )
        ),
        'consents', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'type', consent_type,
                    'status', consented,
                    'granted_at', granted_at
                )
            )
            FROM user_consents
            WHERE user_id = p_user_id AND is_active = TRUE
        ),
        'data_access_history', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'action', action,
                    'timestamp', created_at,
                    'table', table_name
                )
            )
            FROM (
                SELECT action, created_at, table_name
                FROM data_access_log
                WHERE user_id = p_user_id
                ORDER BY created_at DESC
                LIMIT 50
            ) recent_access
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION export_user_data IS 'DSGVO Art. 20 - Vollständiger Datenexport in maschinenlesbarem Format';
COMMENT ON FUNCTION anonymize_lead IS 'DSGVO Art. 17 - Anonymisiert Lead-Daten ohne vollständige Löschung';
COMMENT ON FUNCTION hard_delete_lead IS 'Vollständige Löschung mit Audit-Trail (nur mit Autorisierung)';
COMMENT ON FUNCTION check_retention_expiry IS 'Identifiziert Daten die gemäß Retention Policy gelöscht werden sollten';
COMMENT ON FUNCTION check_user_consent IS 'Prüft ob User-Einwilligung für bestimmten Zweck vorliegt';
COMMENT ON FUNCTION cleanup_expired_exports IS 'Bereinigt abgelaufene Export-Downloads';
COMMENT ON FUNCTION generate_privacy_report IS 'Erstellt Datenschutz-Übersichtsbericht für User';

