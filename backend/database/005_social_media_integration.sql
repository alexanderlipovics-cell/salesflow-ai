-- ═════════════════════════════════════════════════════════════════
-- PHASE 3: SOCIAL MEDIA INTEGRATION
-- ═════════════════════════════════════════════════════════════════
-- Automatischer Import und Tracking von Facebook, LinkedIn, Instagram
-- ═════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. SOCIAL MEDIA ACCOUNTS (verknüpft mit Leads)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID, -- Link zu existierendem Lead
    user_id UUID, -- Welcher User hat diesen Account connected
    platform VARCHAR(50) NOT NULL, 
    -- Platforms: 'facebook', 'linkedin', 'instagram', 'twitter', 'xing', 'tiktok'
    platform_user_id VARCHAR(255), -- Social Media User ID
    username VARCHAR(255),
    profile_url VARCHAR(500),
    display_name VARCHAR(255),
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    connection_type VARCHAR(50), 
    -- Types: 'friend', 'connection', 'follower', 'following', 'group_member', 'page_admin'
    profile_data JSONB DEFAULT '{}'::jsonb, -- Vollständige Profildaten
    last_synced_at TIMESTAMPTZ,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_platform_user UNIQUE(platform, platform_user_id),
    CONSTRAINT valid_platform CHECK (platform IN (
        'facebook', 'linkedin', 'instagram', 'twitter', 'xing', 'tiktok', 'youtube'
    ))
);

CREATE INDEX IF NOT EXISTS idx_social_lead ON social_accounts(lead_id);
CREATE INDEX IF NOT EXISTS idx_social_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_username ON social_accounts(username);
CREATE INDEX IF NOT EXISTS idx_social_sync_enabled ON social_accounts(sync_enabled) WHERE sync_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_social_last_sync ON social_accounts(last_synced_at DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────
-- 2. SOCIAL MEDIA POSTS & INTERACTIONS
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
    lead_id UUID, -- Direkte Lead-Verknüpfung
    user_id UUID, -- Welcher User ist involved
    interaction_type VARCHAR(50) NOT NULL, 
    -- Types: 'post', 'comment', 'like', 'message', 'story_reply', 'share', 'mention', 'tag'
    content TEXT,
    post_url VARCHAR(500),
    post_id VARCHAR(255), -- Platform-specific Post ID
    sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative' (AI-detected)
    engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
    media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
    mentions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    platform_created_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
        'post', 'comment', 'like', 'message', 'story_reply', 
        'share', 'mention', 'tag', 'reaction', 'dm'
    )),
    CONSTRAINT valid_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative', 'unknown'))
);

CREATE INDEX IF NOT EXISTS idx_social_int_account ON social_interactions(social_account_id);
CREATE INDEX IF NOT EXISTS idx_social_int_lead ON social_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_social_int_user ON social_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_social_int_type ON social_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_social_int_date ON social_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_int_sentiment ON social_interactions(sentiment);
CREATE INDEX IF NOT EXISTS idx_social_int_hashtags ON social_interactions USING GIN(hashtags);

-- ─────────────────────────────────────────────────────────────────
-- 3. AUTO-DETECTED LEADS FROM SOCIAL (Scraping Results)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_lead_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    display_name VARCHAR(255),
    profile_url VARCHAR(500),
    bio TEXT,
    signals JSONB DEFAULT '{}'::jsonb, 
    -- Signals: {'keywords': [...], 'job_title': '...', 'interests': [...], 'mutual_connections': 5}
    qualification_score INTEGER CHECK (qualification_score BETWEEN 0 AND 100),
    auto_created_lead_id UUID, -- Link wenn automatisch erstellt
    status VARCHAR(50) DEFAULT 'pending', 
    -- Status: 'pending', 'approved', 'imported', 'rejected', 'duplicate'
    rejection_reason TEXT,
    discovered_by UUID, -- Welcher User hat diesen Lead entdeckt
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT unique_platform_candidate UNIQUE(platform, platform_user_id),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'approved', 'imported', 'rejected', 'duplicate', 'expired'
    ))
);

CREATE INDEX IF NOT EXISTS idx_social_candidate_platform ON social_lead_candidates(platform);
CREATE INDEX IF NOT EXISTS idx_social_candidate_score ON social_lead_candidates(qualification_score DESC);
CREATE INDEX IF NOT EXISTS idx_social_candidate_status ON social_lead_candidates(status);
CREATE INDEX IF NOT EXISTS idx_social_candidate_created ON social_lead_candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_candidate_discovered_by ON social_lead_candidates(discovered_by);

-- ─────────────────────────────────────────────────────────────────
-- 4. SOCIAL MEDIA CAMPAIGNS (für Tracking)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    squad_id UUID,
    platform VARCHAR(50) NOT NULL,
    campaign_type VARCHAR(50), 
    -- Types: 'lead_generation', 'engagement', 'brand_awareness', 'recruitment'
    status VARCHAR(50) DEFAULT 'draft',
    -- Status: 'draft', 'active', 'paused', 'completed', 'cancelled'
    target_audience JSONB DEFAULT '{}'::jsonb,
    content_template TEXT,
    hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    leads_generated INTEGER DEFAULT 0,
    engagement_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_campaign_status CHECK (status IN (
        'draft', 'active', 'paused', 'completed', 'cancelled'
    ))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON social_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_squad ON social_campaigns(squad_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON social_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON social_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON social_campaigns(start_date, end_date);

-- ─────────────────────────────────────────────────────────────────
-- 5. SOCIAL LISTENING KEYWORDS (für Auto-Detection)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_listening_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL,
    category VARCHAR(100), 
    -- Categories: 'industry', 'pain_point', 'competitor', 'opportunity', 'qualification'
    weight FLOAT DEFAULT 1.0, -- Gewichtung für Scoring
    industry TEXT,
    created_by UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_keyword_category UNIQUE(keyword, category)
);

CREATE INDEX IF NOT EXISTS idx_keywords_category ON social_listening_keywords(category);
CREATE INDEX IF NOT EXISTS idx_keywords_industry ON social_listening_keywords(industry);
CREATE INDEX IF NOT EXISTS idx_keywords_active ON social_listening_keywords(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────
-- TRIGGER: Auto-Update Timestamps
-- ─────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_social_accounts_timestamp
    BEFORE UPDATE ON social_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_social_campaigns_timestamp
    BEFORE UPDATE ON social_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ═════════════════════════════════════════════════════════════════
-- KOMMENTARE FÜR DOKUMENTATION
-- ═════════════════════════════════════════════════════════════════

COMMENT ON TABLE social_accounts IS 'Social Media Profile-Daten verknüpft mit Leads für 360°-View';
COMMENT ON TABLE social_interactions IS 'Trackt alle Interaktionen auf Social Media Plattformen';
COMMENT ON TABLE social_lead_candidates IS 'Auto-erkannte potenzielle Leads von Social Media mit Scoring';
COMMENT ON TABLE social_campaigns IS 'Social Media Kampagnen für strukturiertes Lead-Gen Tracking';
COMMENT ON TABLE social_listening_keywords IS 'Keywords für automatische Lead-Qualifikation aus Social Posts';

