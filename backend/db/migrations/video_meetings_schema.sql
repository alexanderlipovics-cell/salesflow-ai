-- ═══════════════════════════════════════════════════════════════
-- VIDEO CONFERENCING SCHEMA
-- Zoom, Microsoft Teams, Google Meet Integration
-- ═══════════════════════════════════════════════════════════════

-- Drop existing tables (if re-running migration)
DROP TABLE IF EXISTS meeting_participants CASCADE;
DROP TABLE IF EXISTS meeting_transcripts CASCADE;
DROP TABLE IF EXISTS video_meetings CASCADE;
DROP TABLE IF EXISTS video_integrations CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- VIDEO MEETINGS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE video_meetings (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    lead_id VARCHAR(255),
    
    -- Platform info
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('zoom', 'teams', 'google_meet')),
    platform_meeting_id VARCHAR(255) NOT NULL,
    
    -- Meeting details
    title VARCHAR(500) NOT NULL,
    join_url TEXT NOT NULL,
    host_url TEXT,
    password VARCHAR(100),
    
    -- Scheduling
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    
    -- Recording & Transcript
    has_recording BOOLEAN DEFAULT FALSE,
    recording_url TEXT,
    recording_download_url TEXT,
    has_transcript BOOLEAN DEFAULT FALSE,
    
    -- AI Analysis Results
    ai_summary TEXT,
    key_topics JSONB,
    action_items JSONB,
    sentiment_analysis JSONB,
    
    -- Metadata
    duration_minutes INTEGER,
    participants_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_platform_meeting UNIQUE (platform, platform_meeting_id)
);

-- Indexes for video_meetings
CREATE INDEX idx_video_meetings_user_id ON video_meetings(user_id);
CREATE INDEX idx_video_meetings_lead_id ON video_meetings(lead_id);
CREATE INDEX idx_video_meetings_platform ON video_meetings(platform);
CREATE INDEX idx_video_meetings_scheduled_start ON video_meetings(scheduled_start);
CREATE INDEX idx_video_meetings_status ON video_meetings(status);
CREATE INDEX idx_video_meetings_platform_meeting_id ON video_meetings(platform, platform_meeting_id);


-- ═══════════════════════════════════════════════════════════════
-- MEETING TRANSCRIPTS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE meeting_transcripts (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    
    -- Transcript data
    transcript_text TEXT NOT NULL,
    transcript_vtt TEXT,
    language VARCHAR(10) DEFAULT 'de',
    
    -- Processing status
    is_processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for meeting_transcripts
CREATE INDEX idx_meeting_transcripts_meeting_id ON meeting_transcripts(meeting_id);
CREATE INDEX idx_meeting_transcripts_is_processed ON meeting_transcripts(is_processed);


-- ═══════════════════════════════════════════════════════════════
-- MEETING PARTICIPANTS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE meeting_participants (
    id VARCHAR(255) PRIMARY KEY,
    meeting_id VARCHAR(255) NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    
    -- Participant info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    user_id VARCHAR(255),
    
    -- Participation stats
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    duration_seconds INTEGER
);

-- Indexes for meeting_participants
CREATE INDEX idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_user_id ON meeting_participants(user_id);


-- ═══════════════════════════════════════════════════════════════
-- VIDEO INTEGRATIONS TABLE (OAuth Tokens)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE video_integrations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    
    -- Platform
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('zoom', 'teams', 'google_meet')),
    
    -- OAuth tokens (should be encrypted in production)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    
    -- Platform-specific data
    platform_user_id VARCHAR(255),
    platform_email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- Indexes for video_integrations
CREATE INDEX idx_video_integrations_user_id ON video_integrations(user_id);
CREATE INDEX idx_video_integrations_platform ON video_integrations(platform);
CREATE INDEX idx_video_integrations_is_active ON video_integrations(user_id, platform, is_active);


-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_meetings_updated_at
    BEFORE UPDATE ON video_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_integrations_updated_at
    BEFORE UPDATE ON video_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════
-- SAMPLE DATA (for testing)
-- ═══════════════════════════════════════════════════════════════

-- Insert sample video integration (Zoom)
INSERT INTO video_integrations (
    id, user_id, platform, 
    access_token, refresh_token,
    platform_email, is_active
) VALUES (
    'integration-sample-zoom',
    'user-123',
    'zoom',
    'sample_access_token',
    'sample_refresh_token',
    'user@example.com',
    TRUE
);

-- Insert sample meeting
INSERT INTO video_meetings (
    id, user_id, lead_id,
    platform, platform_meeting_id,
    title, join_url,
    scheduled_start, scheduled_end,
    status
) VALUES (
    'meeting-sample-1',
    'user-123',
    'lead-456',
    'zoom',
    '123456789',
    'Sales Demo Call',
    'https://zoom.us/j/123456789',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '1 day 1 hour',
    'scheduled'
);


-- ═══════════════════════════════════════════════════════════════
-- VIEWS (Optional - for easier querying)
-- ═══════════════════════════════════════════════════════════════

-- View: Upcoming meetings with transcript status
CREATE OR REPLACE VIEW upcoming_meetings_view AS
SELECT 
    vm.id,
    vm.user_id,
    vm.lead_id,
    vm.platform,
    vm.title,
    vm.join_url,
    vm.scheduled_start,
    vm.scheduled_end,
    vm.status,
    vm.has_recording,
    vm.has_transcript,
    CASE 
        WHEN mt.id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as transcript_exists
FROM video_meetings vm
LEFT JOIN meeting_transcripts mt ON vm.id = mt.meeting_id
WHERE vm.scheduled_start > CURRENT_TIMESTAMP
ORDER BY vm.scheduled_start ASC;


-- View: Past meetings with AI analysis
CREATE OR REPLACE VIEW past_meetings_with_analysis AS
SELECT 
    vm.id,
    vm.user_id,
    vm.lead_id,
    vm.platform,
    vm.title,
    vm.scheduled_start,
    vm.scheduled_end,
    vm.actual_start,
    vm.actual_end,
    vm.status,
    vm.has_recording,
    vm.has_transcript,
    vm.ai_summary,
    vm.key_topics,
    vm.action_items,
    vm.sentiment_analysis,
    vm.participants_count,
    mt.transcript_text,
    mt.is_processed as transcript_processed
FROM video_meetings vm
LEFT JOIN meeting_transcripts mt ON vm.id = mt.meeting_id
WHERE vm.scheduled_start < CURRENT_TIMESTAMP
ORDER BY vm.scheduled_start DESC;


-- ═══════════════════════════════════════════════════════════════
-- GRANTS (adjust based on your user setup)
-- ═══════════════════════════════════════════════════════════════

-- Grant permissions to application user
-- GRANT ALL PRIVILEGES ON video_meetings TO salesflow_app;
-- GRANT ALL PRIVILEGES ON meeting_transcripts TO salesflow_app;
-- GRANT ALL PRIVILEGES ON meeting_participants TO salesflow_app;
-- GRANT ALL PRIVILEGES ON video_integrations TO salesflow_app;


-- ═══════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════

-- Verify tables created
SELECT 
    table_name, 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('video_meetings', 'meeting_transcripts', 'meeting_participants', 'video_integrations')
ORDER BY table_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Video Conferencing Schema Migration Complete!';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - video_meetings';
    RAISE NOTICE '  - meeting_transcripts';
    RAISE NOTICE '  - meeting_participants';
    RAISE NOTICE '  - video_integrations';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure environment variables (see .env.video-conferencing.example)';
    RAISE NOTICE '2. Set up Zoom/Teams/Google Meet OAuth apps';
    RAISE NOTICE '3. Test with: POST /api/video-meetings/create';
END $$;

