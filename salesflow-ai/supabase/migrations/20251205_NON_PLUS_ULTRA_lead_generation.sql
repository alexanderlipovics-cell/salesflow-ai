-- ============================================================================
-- NON PLUS ULTRA LEAD GENERATION SYSTEM
-- Vollständiges Schema für Lead-Erfassung, Validierung, Anreicherung & Qualifizierung
-- ============================================================================

-- ============================================================================
-- EBENE 1: VERIFICATION (V-Score) - Echtheits-Prüfung
-- ============================================================================

-- Lead Verification Results
CREATE TABLE IF NOT EXISTS public.lead_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Composite V-Score (0-100)
    v_score DECIMAL(5,2) DEFAULT 0,
    v_score_updated_at TIMESTAMPTZ,
    
    -- E-Mail Validation
    email_valid BOOLEAN DEFAULT NULL,
    email_syntax_ok BOOLEAN DEFAULT NULL,
    email_domain_exists BOOLEAN DEFAULT NULL,
    email_mx_records BOOLEAN DEFAULT NULL,
    email_smtp_check BOOLEAN DEFAULT NULL,
    email_catch_all BOOLEAN DEFAULT NULL,
    email_disposable BOOLEAN DEFAULT NULL,
    email_role_based BOOLEAN DEFAULT NULL,  -- z.B. info@, support@
    email_score DECIMAL(5,2) DEFAULT 0,
    email_checked_at TIMESTAMPTZ,
    
    -- Telefon Validation
    phone_valid BOOLEAN DEFAULT NULL,
    phone_type VARCHAR(20),  -- mobile, landline, voip, unknown
    phone_carrier VARCHAR(100),
    phone_country_code VARCHAR(5),
    phone_formatted VARCHAR(30),
    phone_score DECIMAL(5,2) DEFAULT 0,
    phone_checked_at TIMESTAMPTZ,
    
    -- Domain/Company Authenticity
    domain_exists BOOLEAN DEFAULT NULL,
    domain_age_days INTEGER,
    domain_ssl_valid BOOLEAN DEFAULT NULL,
    domain_on_spam_list BOOLEAN DEFAULT NULL,
    domain_score DECIMAL(5,2) DEFAULT 0,
    domain_checked_at TIMESTAMPTZ,
    
    -- Social Profile Verification
    social_profiles_found INTEGER DEFAULT 0,
    linkedin_verified BOOLEAN DEFAULT NULL,
    linkedin_connections INTEGER,
    linkedin_activity_score DECIMAL(5,2),  -- Posts/Likes in 6 Monaten
    facebook_verified BOOLEAN DEFAULT NULL,
    instagram_verified BOOLEAN DEFAULT NULL,
    profile_image_authentic BOOLEAN DEFAULT NULL,  -- GAN-Detection
    social_score DECIMAL(5,2) DEFAULT 0,
    social_checked_at TIMESTAMPTZ,
    
    -- Behavioral Verification
    honeypot_triggered BOOLEAN DEFAULT FALSE,
    form_fill_time_seconds INTEGER,  -- Zu schnell = Bot
    mouse_movements_detected BOOLEAN,
    behavioral_score DECIMAL(5,2) DEFAULT 0,
    
    -- Duplicate Detection
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of_lead_id UUID REFERENCES public.leads(id),
    duplicate_confidence DECIMAL(5,2),
    
    -- Metadata
    verification_source VARCHAR(50),  -- api, manual, automated
    last_full_verification_at TIMESTAMPTZ,
    verification_attempts INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_lead_verifications_lead_id ON public.lead_verifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_verifications_v_score ON public.lead_verifications(v_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_verifications_duplicates ON public.lead_verifications(is_duplicate) WHERE is_duplicate = TRUE;

-- ============================================================================
-- EBENE 2: ENRICHMENT (E-Score) - Datenanreicherung
-- ============================================================================

-- Lead Enrichment Data
CREATE TABLE IF NOT EXISTS public.lead_enrichments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Composite E-Score (0-100)
    e_score DECIMAL(5,2) DEFAULT 0,
    e_score_updated_at TIMESTAMPTZ,
    
    -- Company Information
    company_name VARCHAR(200),
    company_domain VARCHAR(200),
    company_industry VARCHAR(100),
    company_sub_industry VARCHAR(100),
    company_size_range VARCHAR(50),  -- 1-10, 11-50, 51-200, 201-500, 500+
    company_employee_count INTEGER,
    company_founded_year INTEGER,
    company_revenue_range VARCHAR(50),  -- <1M, 1-10M, 10-50M, 50-100M, 100M+
    company_revenue_estimate DECIMAL(15,2),
    company_type VARCHAR(50),  -- Private, Public, Non-Profit
    company_description TEXT,
    company_logo_url VARCHAR(500),
    company_linkedin_url VARCHAR(500),
    company_facebook_url VARCHAR(500),
    company_twitter_url VARCHAR(500),
    
    -- Location Data
    company_country VARCHAR(100),
    company_state VARCHAR(100),
    company_city VARCHAR(100),
    company_postal_code VARCHAR(20),
    company_address TEXT,
    company_timezone VARCHAR(50),
    
    -- Contact Person Details
    person_title VARCHAR(200),
    person_seniority VARCHAR(50),  -- C-Level, VP, Director, Manager, Individual
    person_department VARCHAR(100),
    person_linkedin_url VARCHAR(500),
    person_photo_url VARCHAR(500),
    person_bio TEXT,
    
    -- Technology Stack (JSON Array)
    tech_stack JSONB DEFAULT '[]'::jsonb,
    /*
    Format: [
        {"name": "Salesforce", "category": "CRM", "confidence": 0.95},
        {"name": "HubSpot", "category": "Marketing", "confidence": 0.87}
    ]
    */
    tech_stack_score DECIMAL(5,2) DEFAULT 0,  -- Passt Tech zu unserem ICP?
    
    -- Ideal Customer Profile Match
    icp_match_score DECIMAL(5,2) DEFAULT 0,  -- 0-100 wie gut passt Lead zu ICP
    icp_match_reasons JSONB DEFAULT '[]'::jsonb,
    /*
    Format: [
        {"factor": "industry", "match": true, "weight": 0.3},
        {"factor": "company_size", "match": true, "weight": 0.25},
        {"factor": "tech_stack", "match": false, "weight": 0.2}
    ]
    */
    
    -- Financial Signals
    funding_total DECIMAL(15,2),
    funding_last_round VARCHAR(50),  -- Seed, Series A, B, C, etc.
    funding_last_date DATE,
    is_hiring BOOLEAN,
    job_openings_count INTEGER,
    
    -- Enrichment Metadata
    enrichment_source VARCHAR(50),  -- clearbit, apollo, manual, scraped
    enrichment_confidence DECIMAL(5,2),
    data_freshness_days INTEGER,
    last_enriched_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_lead_enrichments_lead_id ON public.lead_enrichments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichments_e_score ON public.lead_enrichments(e_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_enrichments_icp ON public.lead_enrichments(icp_match_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_enrichments_industry ON public.lead_enrichments(company_industry);

-- ============================================================================
-- EBENE 3: INTENT (I-Score) - Kaufabsicht & Verhalten
-- ============================================================================

-- Lead Intent Signals
CREATE TABLE IF NOT EXISTS public.lead_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Composite I-Score (0-100)
    i_score DECIMAL(5,2) DEFAULT 0,
    i_score_updated_at TIMESTAMPTZ,
    
    -- Web Behavioral Signals
    website_visits_30d INTEGER DEFAULT 0,
    website_visits_7d INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    unique_pages_viewed INTEGER DEFAULT 0,
    avg_time_on_site_seconds INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2),
    
    -- High-Intent Pages (JSON Array)
    high_intent_pages JSONB DEFAULT '[]'::jsonb,
    /*
    Format: [
        {"page": "/pricing", "visits": 5, "time_spent": 180},
        {"page": "/case-studies", "visits": 3, "time_spent": 240},
        {"page": "/demo", "visits": 2, "time_spent": 60}
    ]
    */
    pricing_page_visits INTEGER DEFAULT 0,
    demo_page_visits INTEGER DEFAULT 0,
    case_study_views INTEGER DEFAULT 0,
    
    -- Content Engagement
    content_downloads INTEGER DEFAULT 0,
    webinar_registrations INTEGER DEFAULT 0,
    email_opens_30d INTEGER DEFAULT 0,
    email_clicks_30d INTEGER DEFAULT 0,
    form_submissions INTEGER DEFAULT 0,
    
    -- Social Engagement (mit unserem Content)
    social_likes INTEGER DEFAULT 0,
    social_comments INTEGER DEFAULT 0,
    social_shares INTEGER DEFAULT 0,
    content_engagement_score DECIMAL(5,2) DEFAULT 0,
    
    -- Purchase Intent Keywords (aus Kommentaren/Messages)
    intent_keywords JSONB DEFAULT '[]'::jsonb,
    /*
    Format: [
        {"keyword": "pricing", "count": 3, "last_seen": "2024-12-05"},
        {"keyword": "how much", "count": 2, "last_seen": "2024-12-04"}
    ]
    */
    
    -- Direct Intent Signals
    requested_demo BOOLEAN DEFAULT FALSE,
    requested_quote BOOLEAN DEFAULT FALSE,
    asked_about_pricing BOOLEAN DEFAULT FALSE,
    mentioned_competitor BOOLEAN DEFAULT FALSE,
    competitor_mentioned VARCHAR(200),
    mentioned_budget BOOLEAN DEFAULT FALSE,
    mentioned_timeline BOOLEAN DEFAULT FALSE,
    
    -- Timing Signals
    last_activity_at TIMESTAMPTZ,
    days_since_last_activity INTEGER,
    activity_frequency VARCHAR(20),  -- daily, weekly, monthly, sporadic
    best_contact_time VARCHAR(50),  -- Wann ist Lead am aktivsten
    
    -- Recency/Frequency/Monetary (RFM-ähnlich)
    recency_score DECIMAL(5,2) DEFAULT 0,  -- Wie kürzlich aktiv
    frequency_score DECIMAL(5,2) DEFAULT 0,  -- Wie oft aktiv
    depth_score DECIMAL(5,2) DEFAULT 0,  -- Wie tief engaged
    
    -- Intent Classification
    intent_stage VARCHAR(30),  -- awareness, consideration, decision, purchase
    buying_committee_role VARCHAR(50),  -- Champion, Decision Maker, Influencer, Blocker
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_lead_intents_lead_id ON public.lead_intents(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_intents_i_score ON public.lead_intents(i_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_intents_activity ON public.lead_intents(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_intents_stage ON public.lead_intents(intent_stage);

-- ============================================================================
-- EBENE 4: LEAD ACQUISITION - Erfassung aus verschiedenen Kanälen
-- ============================================================================

-- Lead Sources - Wo kommen Leads her?
CREATE TABLE IF NOT EXISTS public.lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Source Channel
    source_type VARCHAR(50) NOT NULL,  -- linkedin, facebook, instagram, web_form, web_scrape, manual, import, referral
    source_platform VARCHAR(100),
    source_campaign VARCHAR(200),
    source_medium VARCHAR(50),  -- organic, paid, referral, direct
    
    -- Acquisition Details
    acquisition_url TEXT,
    referrer_url TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(200),
    utm_content VARCHAR(200),
    utm_term VARCHAR(200),
    
    -- Social Media Specific
    social_post_id VARCHAR(200),
    social_comment_id VARCHAR(200),
    social_ad_id VARCHAR(200),
    social_profile_url VARCHAR(500),
    
    -- Form/Scrape Specific
    form_id VARCHAR(100),
    form_name VARCHAR(200),
    scraped_from_url TEXT,
    scrape_method VARCHAR(50),  -- api, puppeteer, manual
    
    -- First Touch Attribution
    first_touch_at TIMESTAMPTZ DEFAULT NOW(),
    first_touch_content VARCHAR(500),  -- Was hat den Lead angezogen?
    
    -- Cost Data (für ROI)
    acquisition_cost DECIMAL(10,2),
    cost_per_lead DECIMAL(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_lead_sources_lead_id ON public.lead_sources(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_type ON public.lead_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_lead_sources_campaign ON public.lead_sources(source_campaign);

-- Web Tracking Events (für I-Score Berechnung)
CREATE TABLE IF NOT EXISTS public.web_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    visitor_id VARCHAR(100),  -- Cookie/Fingerprint basiert
    
    -- Event Data
    event_type VARCHAR(50) NOT NULL,  -- page_view, click, form_start, form_submit, download, video_play
    event_url TEXT,
    event_page_title VARCHAR(500),
    event_element VARCHAR(200),
    event_value TEXT,
    
    -- Page Categories
    page_category VARCHAR(50),  -- pricing, product, blog, case_study, demo, contact
    is_high_intent_page BOOLEAN DEFAULT FALSE,
    
    -- Session Data
    session_id VARCHAR(100),
    session_start_at TIMESTAMPTZ,
    time_on_page_seconds INTEGER,
    scroll_depth_percent INTEGER,
    
    -- Device/Browser
    device_type VARCHAR(20),  -- desktop, mobile, tablet
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    
    -- Location
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_web_tracking_lead_id ON public.web_tracking_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_web_tracking_visitor ON public.web_tracking_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_web_tracking_event ON public.web_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_web_tracking_created ON public.web_tracking_events(created_at DESC);

-- Social Media Comments/Messages für Intent Analyse
CREATE TABLE IF NOT EXISTS public.social_engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    
    -- Platform
    platform VARCHAR(30) NOT NULL,  -- linkedin, facebook, instagram, twitter
    platform_user_id VARCHAR(200),
    platform_username VARCHAR(200),
    
    -- Engagement Type
    engagement_type VARCHAR(30) NOT NULL,  -- comment, like, share, dm, mention, follow
    
    -- Content
    post_id VARCHAR(200),
    post_url TEXT,
    comment_text TEXT,
    
    -- Intent Analysis (KI-analysiert)
    contains_question BOOLEAN DEFAULT FALSE,
    contains_price_inquiry BOOLEAN DEFAULT FALSE,
    contains_interest_signal BOOLEAN DEFAULT FALSE,
    sentiment VARCHAR(20),  -- positive, negative, neutral
    intent_category VARCHAR(50),  -- purchase_intent, information_seeking, complaint, praise
    intent_confidence DECIMAL(5,2),
    
    -- Metadata
    engagement_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_social_engagement_lead_id ON public.social_engagement_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_social_engagement_platform ON public.social_engagement_events(platform);
CREATE INDEX IF NOT EXISTS idx_social_engagement_intent ON public.social_engagement_events(intent_category);

-- ============================================================================
-- EBENE 5: AUTO-ASSIGNMENT - Verkäufer-Zuweisung
-- ============================================================================

-- Sales Rep Profiles (für Matching)
CREATE TABLE IF NOT EXISTS public.sales_rep_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- Referenz zum auth.users
    
    -- Kapazität
    max_leads_per_day INTEGER DEFAULT 10,
    current_lead_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Spezialisierung
    specializations JSONB DEFAULT '[]'::jsonb,  -- Industries, Company Sizes, etc.
    /*
    Format: [
        {"type": "industry", "value": "Technology", "experience_level": "expert"},
        {"type": "company_size", "value": "enterprise", "experience_level": "intermediate"}
    ]
    */
    
    -- Sprachen
    languages JSONB DEFAULT '["de"]'::jsonb,
    
    -- Regionen
    regions JSONB DEFAULT '["DACH"]'::jsonb,
    
    -- Performance Metriken
    avg_conversion_rate DECIMAL(5,2),
    avg_response_time_hours DECIMAL(5,2),
    total_deals_closed INTEGER DEFAULT 0,
    total_revenue_generated DECIMAL(15,2) DEFAULT 0,
    
    -- Präferenzen
    preferred_lead_temperature VARCHAR(20),  -- hot, warm, cold, any
    preferred_channels JSONB DEFAULT '["whatsapp", "email", "phone"]'::jsonb,
    
    -- Zeitzone & Verfügbarkeit
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
    working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00"}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_sales_rep_available ON public.sales_rep_profiles(is_available) WHERE is_available = TRUE;

-- Lead Assignments
CREATE TABLE IF NOT EXISTS public.lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL,  -- User ID
    
    -- Assignment Reason
    assignment_method VARCHAR(30),  -- auto, manual, round_robin, score_based
    assignment_score DECIMAL(5,2),  -- Wie gut ist das Match
    assignment_reasons JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, rejected, transferred
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Transfer (falls weitergegeben)
    transferred_to UUID,
    transferred_at TIMESTAMPTZ,
    transfer_reason TEXT,
    
    -- SLA Tracking
    sla_first_contact_hours INTEGER DEFAULT 24,
    first_contact_at TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead ON public.lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_rep ON public.lead_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_status ON public.lead_assignments(status);

-- ============================================================================
-- EBENE 6: AUTO-OUTREACH - Personalisierte Erstansprache
-- ============================================================================

-- Outreach Templates
CREATE TABLE IF NOT EXISTS public.outreach_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Basics
    name VARCHAR(200) NOT NULL,
    description TEXT,
    channel VARCHAR(30) NOT NULL,  -- email, linkedin_dm, whatsapp, sms
    
    -- Content (mit Variablen)
    subject_template TEXT,  -- Für E-Mail
    body_template TEXT NOT NULL,
    /*
    Variablen: {{first_name}}, {{company}}, {{industry}}, {{pain_point}}, 
               {{competitor}}, {{recent_activity}}, {{mutual_connection}}
    */
    
    -- Targeting
    target_intent_stage VARCHAR(30),  -- awareness, consideration, decision
    target_p_score_min INTEGER,
    target_p_score_max INTEGER,
    target_industries JSONB DEFAULT '[]'::jsonb,
    
    -- Performance
    times_used INTEGER DEFAULT 0,
    avg_open_rate DECIMAL(5,2),
    avg_reply_rate DECIMAL(5,2),
    avg_conversion_rate DECIMAL(5,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Outreach
CREATE TABLE IF NOT EXISTS public.outreach_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.outreach_templates(id),
    assigned_to UUID,
    
    -- Outreach Details
    channel VARCHAR(30) NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    personalization_data JSONB DEFAULT '{}'::jsonb,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
    optimal_send_time BOOLEAN DEFAULT FALSE,  -- KI-optimierter Zeitpunkt
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed, cancelled
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Response Tracking
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_outreach_queue_lead ON public.outreach_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_queue_scheduled ON public.outreach_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outreach_queue_status ON public.outreach_queue(status);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Funktion: Berechne V-Score aus Einzelwerten
CREATE OR REPLACE FUNCTION calculate_v_score(p_lead_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_email DECIMAL := 0;
    v_phone DECIMAL := 0;
    v_domain DECIMAL := 0;
    v_social DECIMAL := 0;
    v_behavioral DECIMAL := 0;
    v_duplicate_penalty DECIMAL := 0;
    v_total DECIMAL := 0;
BEGIN
    SELECT 
        COALESCE(email_score, 0),
        COALESCE(phone_score, 0),
        COALESCE(domain_score, 0),
        COALESCE(social_score, 0),
        COALESCE(behavioral_score, 0),
        CASE WHEN is_duplicate THEN 50 ELSE 0 END
    INTO v_email, v_phone, v_domain, v_social, v_behavioral, v_duplicate_penalty
    FROM public.lead_verifications
    WHERE lead_id = p_lead_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Gewichtung: Email 30%, Phone 20%, Domain 15%, Social 25%, Behavioral 10%
    v_total := (v_email * 0.30) + (v_phone * 0.20) + (v_domain * 0.15) + 
               (v_social * 0.25) + (v_behavioral * 0.10) - v_duplicate_penalty;
    
    RETURN GREATEST(0, LEAST(100, v_total));
END;
$$ LANGUAGE plpgsql;

-- Funktion: Berechne E-Score aus Enrichment-Daten
CREATE OR REPLACE FUNCTION calculate_e_score(p_lead_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    e_company DECIMAL := 0;
    e_contact DECIMAL := 0;
    e_tech DECIMAL := 0;
    e_icp DECIMAL := 0;
    e_total DECIMAL := 0;
BEGIN
    SELECT 
        -- Company completeness (25%)
        (CASE WHEN company_name IS NOT NULL THEN 20 ELSE 0 END +
         CASE WHEN company_industry IS NOT NULL THEN 20 ELSE 0 END +
         CASE WHEN company_size_range IS NOT NULL THEN 20 ELSE 0 END +
         CASE WHEN company_revenue_range IS NOT NULL THEN 20 ELSE 0 END +
         CASE WHEN company_country IS NOT NULL THEN 20 ELSE 0 END) * 0.25,
        
        -- Contact completeness (25%)
        (CASE WHEN person_title IS NOT NULL THEN 25 ELSE 0 END +
         CASE WHEN person_seniority IS NOT NULL THEN 25 ELSE 0 END +
         CASE WHEN person_linkedin_url IS NOT NULL THEN 25 ELSE 0 END +
         CASE WHEN person_department IS NOT NULL THEN 25 ELSE 0 END) * 0.25,
        
        -- Tech Stack Match (20%)
        COALESCE(tech_stack_score, 0) * 0.20,
        
        -- ICP Match (30%)
        COALESCE(icp_match_score, 0) * 0.30
        
    INTO e_company, e_contact, e_tech, e_icp
    FROM public.lead_enrichments
    WHERE lead_id = p_lead_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    e_total := e_company + e_contact + e_tech + e_icp;
    
    RETURN GREATEST(0, LEAST(100, e_total));
END;
$$ LANGUAGE plpgsql;

-- Funktion: Berechne I-Score aus Intent-Daten
CREATE OR REPLACE FUNCTION calculate_i_score(p_lead_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    i_web DECIMAL := 0;
    i_engagement DECIMAL := 0;
    i_direct DECIMAL := 0;
    i_recency DECIMAL := 0;
    i_total DECIMAL := 0;
BEGIN
    SELECT 
        -- Web Activity (30%)
        LEAST(30, (
            COALESCE(website_visits_7d, 0) * 3 +
            COALESCE(pricing_page_visits, 0) * 10 +
            COALESCE(demo_page_visits, 0) * 15 +
            COALESCE(case_study_views, 0) * 5
        )),
        
        -- Content Engagement (25%)
        LEAST(25, (
            COALESCE(content_downloads, 0) * 10 +
            COALESCE(webinar_registrations, 0) * 15 +
            COALESCE(email_clicks_30d, 0) * 2 +
            COALESCE(social_comments, 0) * 5
        )),
        
        -- Direct Intent Signals (30%)
        (CASE WHEN requested_demo THEN 30 
              WHEN requested_quote THEN 25
              WHEN asked_about_pricing THEN 20
              WHEN mentioned_competitor THEN 15
              WHEN mentioned_budget THEN 10
              ELSE 0 END),
        
        -- Recency (15%)
        COALESCE(recency_score, 0) * 0.15
        
    INTO i_web, i_engagement, i_direct, i_recency
    FROM public.lead_intents
    WHERE lead_id = p_lead_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    i_total := i_web + i_engagement + i_direct + i_recency;
    
    RETURN GREATEST(0, LEAST(100, i_total));
END;
$$ LANGUAGE plpgsql;

-- Funktion: Berechne kombinierten P-Score (V + E + I)
CREATE OR REPLACE FUNCTION calculate_combined_p_score(p_lead_id UUID)
RETURNS TABLE(
    p_score DECIMAL(5,2),
    v_score DECIMAL(5,2),
    e_score DECIMAL(5,2),
    i_score DECIMAL(5,2)
) AS $$
DECLARE
    v DECIMAL := 0;
    e DECIMAL := 0;
    i DECIMAL := 0;
    p DECIMAL := 0;
BEGIN
    -- Einzelscores berechnen
    v := calculate_v_score(p_lead_id);
    e := calculate_e_score(p_lead_id);
    i := calculate_i_score(p_lead_id);
    
    -- Kombinierter P-Score mit Gewichtung
    -- V-Score: 25% (Echtheit als Basis)
    -- E-Score: 25% (Fit zum ICP)
    -- I-Score: 50% (Kaufabsicht ist am wichtigsten)
    p := (v * 0.25) + (e * 0.25) + (i * 0.50);
    
    RETURN QUERY SELECT p, v, e, i;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update Scores bei Änderungen
CREATE OR REPLACE FUNCTION trigger_update_lead_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Update P-Score in leads Tabelle
    UPDATE public.leads
    SET 
        p_score = (SELECT p_score FROM calculate_combined_p_score(NEW.lead_id)),
        updated_at = NOW()
    WHERE id = NEW.lead_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers für automatische Score-Updates
DROP TRIGGER IF EXISTS trg_verification_score_update ON public.lead_verifications;
CREATE TRIGGER trg_verification_score_update
    AFTER INSERT OR UPDATE ON public.lead_verifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_lead_scores();

DROP TRIGGER IF EXISTS trg_enrichment_score_update ON public.lead_enrichments;
CREATE TRIGGER trg_enrichment_score_update
    AFTER INSERT OR UPDATE ON public.lead_enrichments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_lead_scores();

DROP TRIGGER IF EXISTS trg_intent_score_update ON public.lead_intents;
CREATE TRIGGER trg_intent_score_update
    AFTER INSERT OR UPDATE ON public.lead_intents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_lead_scores();

-- ============================================================================
-- VIEWS für einfachen Zugriff
-- ============================================================================

-- Vollständige Lead-Ansicht mit allen Scores
CREATE OR REPLACE VIEW public.v_leads_with_scores AS
SELECT 
    l.*,
    lv.v_score,
    lv.email_valid,
    lv.phone_valid,
    lv.social_profiles_found,
    lv.is_duplicate,
    le.e_score,
    le.company_name,
    le.company_industry,
    le.company_size_range,
    le.icp_match_score,
    li.i_score,
    li.website_visits_7d,
    li.pricing_page_visits,
    li.intent_stage,
    li.last_activity_at,
    la.assigned_to,
    la.assignment_method,
    la.status as assignment_status,
    -- Klassifizierung
    CASE 
        WHEN l.p_score >= 80 AND lv.v_score >= 70 THEN 'hot_verified'
        WHEN l.p_score >= 80 THEN 'hot'
        WHEN l.p_score >= 60 THEN 'warm'
        WHEN l.p_score >= 40 THEN 'cool'
        ELSE 'cold'
    END as lead_temperature,
    -- Priorität (1-5)
    CASE 
        WHEN l.p_score >= 80 AND li.requested_demo THEN 5
        WHEN l.p_score >= 80 THEN 4
        WHEN l.p_score >= 60 THEN 3
        WHEN l.p_score >= 40 THEN 2
        ELSE 1
    END as priority
FROM public.leads l
LEFT JOIN public.lead_verifications lv ON l.id = lv.lead_id
LEFT JOIN public.lead_enrichments le ON l.id = le.lead_id
LEFT JOIN public.lead_intents li ON l.id = li.lead_id
LEFT JOIN public.lead_assignments la ON l.id = la.lead_id AND la.status = 'accepted';

-- Hot Leads View (für Dashboard)
CREATE OR REPLACE VIEW public.v_hot_leads AS
SELECT * FROM public.v_leads_with_scores
WHERE p_score >= 75 AND (v_score IS NULL OR v_score >= 60)
ORDER BY p_score DESC, i_score DESC;

-- Leads die Verifizierung brauchen
CREATE OR REPLACE VIEW public.v_leads_need_verification AS
SELECT l.* 
FROM public.leads l
LEFT JOIN public.lead_verifications lv ON l.id = lv.lead_id
WHERE lv.id IS NULL 
   OR lv.last_full_verification_at < NOW() - INTERVAL '30 days'
ORDER BY l.p_score DESC NULLS LAST;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.lead_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_rep_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_queue ENABLE ROW LEVEL SECURITY;

-- Policies (vereinfacht - in Production nach User/Team filtern)
CREATE POLICY "Allow all for authenticated" ON public.lead_verifications FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.lead_enrichments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.lead_intents FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.lead_sources FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.web_tracking_events FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.social_engagement_events FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.sales_rep_profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.lead_assignments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.outreach_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.outreach_queue FOR ALL TO authenticated USING (true);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Standard Outreach Templates
INSERT INTO public.outreach_templates (name, description, channel, subject_template, body_template, target_intent_stage, target_p_score_min)
VALUES 
(
    'Hot Lead - Demo Request Follow-up',
    'Für Leads die eine Demo angefragt haben',
    'email',
    'Ihre Demo-Anfrage bei {{company}} - Persönlicher Termin',
    E'Hallo {{first_name}},\n\nvielen Dank für Ihr Interesse an einer Demo! Ich bin {{sender_name}} und werde Sie persönlich durch unsere Lösung führen.\n\nWas mich an Ihrem Unternehmen {{company}} besonders interessiert: {{personalized_hook}}\n\nWann passt es Ihnen diese Woche für ein 30-minütiges Gespräch?\n\nBeste Grüße,\n{{sender_name}}',
    'decision',
    80
),
(
    'Warm Lead - Value First',
    'Für warme Leads mit mittlerem Score',
    'linkedin_dm',
    NULL,
    E'Hi {{first_name}},\n\nich bin auf Ihr Profil gestoßen und fand {{personalized_observation}} interessant.\n\nIch habe einen kurzen Artikel zu {{relevant_topic}} geschrieben, der vielleicht für {{company}} relevant sein könnte: {{content_link}}\n\nWürde mich über Ihr Feedback freuen!\n\n{{sender_name}}',
    'consideration',
    50
),
(
    'Cold Lead - Awareness',
    'Für kalte Leads - reiner Mehrwert',
    'email',
    'Quick Insight für {{industry}}-Profis',
    E'Hallo {{first_name}},\n\n3 Trends die {{company_size}} {{industry}}-Unternehmen gerade bewegen:\n\n1. {{trend_1}}\n2. {{trend_2}}\n3. {{trend_3}}\n\nMehr Details im vollständigen Report: {{report_link}}\n\nKein Sales-Pitch, nur Insights.\n\n{{sender_name}}',
    'awareness',
    20
);

-- Kommentar für Dokumentation
COMMENT ON TABLE public.lead_verifications IS 'Non Plus Ultra: Echtheits-Prüfung (V-Score) für Leads';
COMMENT ON TABLE public.lead_enrichments IS 'Non Plus Ultra: Datenanreicherung (E-Score) für Leads';
COMMENT ON TABLE public.lead_intents IS 'Non Plus Ultra: Kaufabsicht & Verhalten (I-Score) für Leads';
COMMENT ON TABLE public.lead_sources IS 'Non Plus Ultra: Lead-Quellen und Attribution';
COMMENT ON TABLE public.lead_assignments IS 'Non Plus Ultra: Automatische Verkäufer-Zuweisung';
COMMENT ON TABLE public.outreach_queue IS 'Non Plus Ultra: Geplante automatisierte Outreach-Nachrichten';

