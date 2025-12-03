-- ============================================================================
-- PHOENIX MODULE - VOLLSTÄNDIGES AUSSENDIENST-REAKTIVIERUNGS-SYSTEM
-- GPS-basierte Lead-Vorschläge & Field Sales Intelligence
-- ============================================================================
--
-- Features:
-- 🔥 GPS-basierte Lead-Suche ("Bin zu früh, was kann ich machen?")
-- 📍 Proximity Alerts (Kunden in der Nähe vom Termin)
-- 🗺️ Territory Intelligence (Leads im Gebiet)
-- 🔄 Smart Reactivation (Alte Leads reaktivieren)
-- 📊 Field Activity Tracking
-- ============================================================================

-- ===================
-- LEAD LOCATIONS
-- ===================

-- Erweitere Leads um Geo-Daten
ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    latitude DECIMAL(10, 8);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    longitude DECIMAL(11, 8);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    address TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    city TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    postal_code TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    country TEXT DEFAULT 'DE';

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    geo_accuracy TEXT DEFAULT 'unknown';
    -- 'exact', 'approximate', 'city', 'unknown'

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    last_field_visit_at TIMESTAMPTZ;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    field_visit_count INTEGER DEFAULT 0;

-- ===================
-- FIELD VISITS (Besuchsprotokoll)
-- ===================

CREATE TABLE IF NOT EXISTS field_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    
    -- Visit Details
    visit_type TEXT NOT NULL,
    -- 'planned_meeting', 'spontaneous_visit', 'drive_by', 'phone_from_location', 'reactivation_attempt'
    
    outcome TEXT,
    -- 'successful', 'not_home', 'rescheduled', 'rejected', 'no_contact'
    
    notes TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- Source
    source TEXT DEFAULT 'manual',
    -- 'manual', 'phoenix_suggestion', 'proximity_alert', 'territory_sweep'
    
    -- Follow-up
    next_action_type TEXT,
    next_action_date DATE,
    next_action_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- PHOENIX SUGGESTIONS (Vorschläge)
-- ===================

CREATE TABLE IF NOT EXISTS phoenix_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Context
    trigger_type TEXT NOT NULL,
    -- 'early_for_meeting', 'extra_time', 'nearby_appointment', 'territory_sweep', 'reactivation_due'
    
    trigger_context JSONB,
    -- z.B. {"appointment_lead_id": "...", "time_available_minutes": 30}
    
    -- Location Context
    user_latitude DECIMAL(10, 8),
    user_longitude DECIMAL(11, 8),
    distance_meters INTEGER,
    estimated_travel_minutes INTEGER,
    
    -- Suggestion
    priority INTEGER DEFAULT 50,
    -- 0-100, höher = wichtiger
    
    reason TEXT NOT NULL,
    -- "Lead seit 45 Tagen nicht kontaktiert, nur 800m entfernt"
    
    suggested_action TEXT,
    -- 'visit', 'call_from_nearby', 'drive_by_check', 'leave_material'
    
    suggested_message TEXT,
    -- Konkrete Nachricht für Spontan-Kontakt
    
    -- Status
    status TEXT DEFAULT 'pending',
    -- 'pending', 'accepted', 'dismissed', 'expired', 'completed'
    
    dismissed_reason TEXT,
    completed_outcome TEXT,
    
    -- Timing
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- ===================
-- USER TERRITORIES (Gebiete)
-- ===================

CREATE TABLE IF NOT EXISTS user_territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Territory Definition
    name TEXT NOT NULL,
    description TEXT,
    
    -- Geo-Boundaries (Simple Rectangle for MVP)
    min_latitude DECIMAL(10, 8),
    max_latitude DECIMAL(10, 8),
    min_longitude DECIMAL(11, 8),
    max_longitude DECIMAL(11, 8),
    
    -- Or Center + Radius
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    radius_km DECIMAL(6, 2),
    
    -- Or Postal Codes
    postal_codes TEXT[],
    
    -- Stats
    lead_count INTEGER DEFAULT 0,
    active_lead_count INTEGER DEFAULT 0,
    last_sweep_at TIMESTAMPTZ,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- PHOENIX SESSIONS (Außendienst-Sessions)
-- ===================

CREATE TABLE IF NOT EXISTS phoenix_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Session
    session_type TEXT NOT NULL,
    -- 'field_day', 'territory_sweep', 'appointment_buffer', 'reactivation_blitz'
    
    -- Location Tracking
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMPTZ,
    
    -- Stats
    leads_suggested INTEGER DEFAULT 0,
    leads_visited INTEGER DEFAULT 0,
    leads_contacted INTEGER DEFAULT 0,
    leads_reactivated INTEGER DEFAULT 0,
    distance_traveled_km DECIMAL(8, 2) DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    -- z.B. {"max_radius_km": 5, "min_days_since_contact": 30, "include_cold_leads": false}
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- PHOENIX ALERTS (Proximity Alerts)
-- ===================

CREATE TABLE IF NOT EXISTS phoenix_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Alert Type
    alert_type TEXT NOT NULL,
    -- 'nearby_cold_lead', 'nearby_old_customer', 'reactivation_opportunity', 'territory_untouched'
    
    -- Trigger
    triggered_by TEXT,
    -- 'location_update', 'appointment_proximity', 'scheduled_check', 'manual_scan'
    
    trigger_appointment_id UUID,
    
    -- Location
    user_latitude DECIMAL(10, 8),
    user_longitude DECIMAL(11, 8),
    lead_latitude DECIMAL(10, 8),
    lead_longitude DECIMAL(11, 8),
    distance_meters INTEGER,
    
    -- Alert Info
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    -- 'low', 'medium', 'high', 'urgent'
    
    -- Status
    status TEXT DEFAULT 'pending',
    -- 'pending', 'seen', 'acted', 'dismissed', 'expired'
    
    action_taken TEXT,
    action_outcome TEXT,
    
    -- Timing
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    seen_at TIMESTAMPTZ,
    acted_at TIMESTAMPTZ
);

-- ===================
-- APPOINTMENTS ERWEITERN
-- ===================

-- Falls appointments Tabelle existiert
DO $$ BEGIN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS travel_time_minutes INTEGER;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS buffer_before_minutes INTEGER DEFAULT 15;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS buffer_after_minutes INTEGER DEFAULT 15;
EXCEPTION
    WHEN undefined_table THEN
        -- Appointments table doesn't exist, create it
        CREATE TABLE appointments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id),
            lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
            
            title TEXT NOT NULL,
            description TEXT,
            
            -- Timing
            scheduled_at TIMESTAMPTZ NOT NULL,
            duration_minutes INTEGER DEFAULT 60,
            buffer_before_minutes INTEGER DEFAULT 15,
            buffer_after_minutes INTEGER DEFAULT 15,
            
            -- Location
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            address TEXT,
            travel_time_minutes INTEGER,
            
            -- Status
            status TEXT DEFAULT 'scheduled',
            -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
            
            outcome TEXT,
            notes TEXT,
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
END $$;

-- ===================
-- INDEXES
-- ===================

-- Geo-Indexes für Leads
CREATE INDEX IF NOT EXISTS idx_leads_geo ON leads(latitude, longitude) 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city) 
    WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_postal ON leads(postal_code) 
    WHERE postal_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads(last_contact_at);

CREATE INDEX IF NOT EXISTS idx_leads_field_visit ON leads(last_field_visit_at);

-- Field Visits
CREATE INDEX IF NOT EXISTS idx_field_visits_user ON field_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_field_visits_lead ON field_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_field_visits_date ON field_visits(started_at);
CREATE INDEX IF NOT EXISTS idx_field_visits_geo ON field_visits(latitude, longitude);

-- Phoenix Suggestions
CREATE INDEX IF NOT EXISTS idx_phoenix_suggestions_user ON phoenix_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_phoenix_suggestions_lead ON phoenix_suggestions(lead_id);
CREATE INDEX IF NOT EXISTS idx_phoenix_suggestions_status ON phoenix_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_phoenix_suggestions_pending ON phoenix_suggestions(user_id, status) 
    WHERE status = 'pending';

-- Phoenix Sessions
CREATE INDEX IF NOT EXISTS idx_phoenix_sessions_user ON phoenix_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_phoenix_sessions_active ON phoenix_sessions(user_id, is_active) 
    WHERE is_active = true;

-- Phoenix Alerts
CREATE INDEX IF NOT EXISTS idx_phoenix_alerts_user ON phoenix_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_phoenix_alerts_pending ON phoenix_alerts(user_id, status) 
    WHERE status = 'pending';

-- User Territories
CREATE INDEX IF NOT EXISTS idx_territories_user ON user_territories(user_id);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_geo ON appointments(latitude, longitude)
    WHERE latitude IS NOT NULL;

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE phoenix_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE phoenix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phoenix_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Field Visits
DROP POLICY IF EXISTS "Users can manage own field visits" ON field_visits;
CREATE POLICY "Users can manage own field visits" ON field_visits
    FOR ALL USING (user_id = auth.uid());

-- Phoenix Suggestions
DROP POLICY IF EXISTS "Users can manage own suggestions" ON phoenix_suggestions;
CREATE POLICY "Users can manage own suggestions" ON phoenix_suggestions
    FOR ALL USING (user_id = auth.uid());

-- Territories
DROP POLICY IF EXISTS "Users can manage own territories" ON user_territories;
CREATE POLICY "Users can manage own territories" ON user_territories
    FOR ALL USING (user_id = auth.uid());

-- Sessions
DROP POLICY IF EXISTS "Users can manage own sessions" ON phoenix_sessions;
CREATE POLICY "Users can manage own sessions" ON phoenix_sessions
    FOR ALL USING (user_id = auth.uid());

-- Alerts
DROP POLICY IF EXISTS "Users can manage own alerts" ON phoenix_alerts;
CREATE POLICY "Users can manage own alerts" ON phoenix_alerts
    FOR ALL USING (user_id = auth.uid());

-- Appointments
DROP POLICY IF EXISTS "Users can manage own appointments" ON appointments;
CREATE POLICY "Users can manage own appointments" ON appointments
    FOR ALL USING (user_id = auth.uid());

-- ===================
-- FUNCTIONS
-- ===================

-- Haversine Distance Calculation (in Meters)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS INTEGER AS $$
DECLARE
    R CONSTANT INTEGER := 6371000; -- Earth radius in meters
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;
    
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    
    a := SIN(dlat/2) * SIN(dlat/2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dlon/2) * SIN(dlon/2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN (R * c)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Find Leads Near Location
CREATE OR REPLACE FUNCTION find_leads_near_location(
    p_user_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_meters INTEGER DEFAULT 5000,
    p_min_days_since_contact INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    lead_status TEXT,
    lead_phone TEXT,
    lead_address TEXT,
    distance_meters INTEGER,
    days_since_contact INTEGER,
    last_contact_at TIMESTAMPTZ,
    priority_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as lead_id,
        COALESCE(l.first_name || ' ' || COALESCE(l.last_name, ''), l.first_name, 'Unbekannt') as lead_name,
        l.status as lead_status,
        l.phone as lead_phone,
        l.address as lead_address,
        calculate_distance_meters(p_latitude, p_longitude, l.latitude, l.longitude) as distance_meters,
        EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at))::INTEGER as days_since_contact,
        COALESCE(l.last_contact_at, l.created_at) as last_contact_at,
        -- Priority Score: Higher = more important
        (
            -- Base: Days since contact (max 50 points)
            LEAST(50, EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at))::INTEGER) +
            -- Closer = higher priority (max 30 points)
            (30 - LEAST(30, calculate_distance_meters(p_latitude, p_longitude, l.latitude, l.longitude) / 166)) +
            -- Hot leads bonus
            CASE WHEN l.status = 'hot' THEN 20 WHEN l.status = 'warm' THEN 10 ELSE 0 END
        )::INTEGER as priority_score
    FROM leads l
    WHERE l.user_id = p_user_id
      AND l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
      AND l.status NOT IN ('lost', 'customer')  -- Exclude lost and existing customers
      AND calculate_distance_meters(p_latitude, p_longitude, l.latitude, l.longitude) <= p_radius_meters
      AND EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at)) >= p_min_days_since_contact
    ORDER BY priority_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get Leads Near Today's Appointments
CREATE OR REPLACE FUNCTION get_nearby_appointment_leads(
    p_user_id UUID,
    p_radius_meters INTEGER DEFAULT 3000,
    p_min_days_since_contact INTEGER DEFAULT 14
) RETURNS TABLE (
    appointment_id UUID,
    appointment_title TEXT,
    appointment_time TIMESTAMPTZ,
    appointment_address TEXT,
    lead_id UUID,
    lead_name TEXT,
    lead_status TEXT,
    lead_phone TEXT,
    distance_meters INTEGER,
    days_since_contact INTEGER,
    buffer_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as appointment_id,
        a.title as appointment_title,
        a.scheduled_at as appointment_time,
        a.address as appointment_address,
        l.id as lead_id,
        COALESCE(l.first_name || ' ' || COALESCE(l.last_name, ''), l.first_name) as lead_name,
        l.status as lead_status,
        l.phone as lead_phone,
        calculate_distance_meters(a.latitude, a.longitude, l.latitude, l.longitude) as distance_meters,
        EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at))::INTEGER as days_since_contact,
        COALESCE(a.buffer_before_minutes, 15) + COALESCE(a.buffer_after_minutes, 15) as buffer_minutes
    FROM appointments a
    CROSS JOIN LATERAL (
        SELECT * FROM leads 
        WHERE user_id = p_user_id
          AND latitude IS NOT NULL
          AND id != COALESCE(a.lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND status NOT IN ('lost', 'customer')
          AND calculate_distance_meters(a.latitude, a.longitude, latitude, longitude) <= p_radius_meters
          AND EXTRACT(DAY FROM NOW() - COALESCE(last_contact_at, created_at)) >= p_min_days_since_contact
    ) l
    WHERE a.user_id = p_user_id
      AND a.latitude IS NOT NULL
      AND a.scheduled_at::date = CURRENT_DATE
      AND a.status IN ('scheduled', 'confirmed')
    ORDER BY a.scheduled_at, distance_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get Reactivation Candidates in Territory
CREATE OR REPLACE FUNCTION get_territory_reactivation_candidates(
    p_user_id UUID,
    p_territory_id UUID DEFAULT NULL,
    p_min_days_inactive INTEGER DEFAULT 60,
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    lead_status TEXT,
    deal_state TEXT,
    lead_phone TEXT,
    lead_address TEXT,
    city TEXT,
    days_inactive INTEGER,
    last_contact_at TIMESTAMPTZ,
    field_visit_count INTEGER,
    reactivation_priority TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as lead_id,
        COALESCE(l.first_name || ' ' || COALESCE(l.last_name, ''), l.first_name) as lead_name,
        l.status as lead_status,
        l.deal_state,
        l.phone as lead_phone,
        l.address as lead_address,
        l.city,
        EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at))::INTEGER as days_inactive,
        COALESCE(l.last_contact_at, l.created_at) as last_contact_at,
        COALESCE(l.field_visit_count, 0) as field_visit_count,
        CASE 
            WHEN l.deal_state IN ('considering', 'pending_payment') THEN 'URGENT'
            WHEN l.status = 'hot' THEN 'HIGH'
            WHEN l.status = 'warm' AND EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at)) > 90 THEN 'HIGH'
            WHEN l.status = 'warm' THEN 'MEDIUM'
            ELSE 'LOW'
        END as reactivation_priority
    FROM leads l
    LEFT JOIN user_territories t ON t.user_id = l.user_id
    WHERE l.user_id = p_user_id
      AND l.status NOT IN ('lost', 'customer')
      AND EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at)) >= p_min_days_inactive
      AND (
          p_territory_id IS NULL 
          OR t.id = p_territory_id
          OR (
              l.latitude BETWEEN t.min_latitude AND t.max_latitude
              AND l.longitude BETWEEN t.min_longitude AND t.max_longitude
          )
          OR l.postal_code = ANY(t.postal_codes)
      )
    ORDER BY 
        CASE 
            WHEN l.deal_state IN ('considering', 'pending_payment') THEN 1
            WHEN l.status = 'hot' THEN 2
            WHEN l.status = 'warm' THEN 3
            ELSE 4
        END,
        EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact_at, l.created_at)) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update Field Visit Stats
CREATE OR REPLACE FUNCTION update_lead_field_visit_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lead_id IS NOT NULL THEN
        UPDATE leads SET
            last_field_visit_at = NEW.started_at,
            field_visit_count = COALESCE(field_visit_count, 0) + 1,
            last_contact_at = NEW.started_at,
            updated_at = NOW()
        WHERE id = NEW.lead_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_field_visit_stats ON field_visits;
CREATE TRIGGER trg_update_field_visit_stats
AFTER INSERT ON field_visits
FOR EACH ROW
EXECUTE FUNCTION update_lead_field_visit_stats();


-- ===================
-- XP EVENTS für Phoenix
-- ===================

-- Bonus XP für Außendienst-Aktivitäten
-- (nutzt bestehende xp_events Tabelle)

-- ===================
-- SUCCESS MESSAGE
-- ===================

DO $$
BEGIN
    RAISE NOTICE '🔥 PHOENIX MODULE Migration erfolgreich!';
    RAISE NOTICE '';
    RAISE NOTICE '   Neue Features:';
    RAISE NOTICE '   ├── leads: GPS-Felder (lat/lon, address, city)';
    RAISE NOTICE '   ├── field_visits: Besuchsprotokoll';
    RAISE NOTICE '   ├── phoenix_suggestions: KI-Vorschläge';
    RAISE NOTICE '   ├── phoenix_sessions: Außendienst-Sessions';
    RAISE NOTICE '   ├── phoenix_alerts: Proximity Alerts';
    RAISE NOTICE '   ├── user_territories: Gebiete definieren';
    RAISE NOTICE '   └── appointments: Mit GPS-Daten';
    RAISE NOTICE '';
    RAISE NOTICE '   Neue Functions:';
    RAISE NOTICE '   ├── calculate_distance_meters()';
    RAISE NOTICE '   ├── find_leads_near_location()';
    RAISE NOTICE '   ├── get_nearby_appointment_leads()';
    RAISE NOTICE '   └── get_territory_reactivation_candidates()';
    RAISE NOTICE '';
    RAISE NOTICE '   🔥 Phoenix is ready to rise!';
END $$;

