-- ═══════════════════════════════════════════════════════════
-- WEEK 2: BACKGROUND SERVICES TABLES
-- ═══════════════════════════════════════════════════════════

-- Notification Queue
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    error TEXT
);

CREATE INDEX idx_notification_queue_user_status
ON notification_queue (user_id, status);

CREATE INDEX idx_notification_queue_created
ON notification_queue (created_at DESC);

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    daily_briefing BOOLEAN DEFAULT true,
    daily_briefing_time TIME DEFAULT '07:30',
    overdue_followups BOOLEAN DEFAULT true,
    hot_lead_alerts BOOLEAN DEFAULT true,
    churn_alerts BOOLEAN DEFAULT true,
    goal_updates BOOLEAN DEFAULT true,
    power_hour_enabled BOOLEAN DEFAULT true,
    power_hour_times INTEGER[] DEFAULT ARRAY[10, 15],
    location_alerts BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Background Job Logs
CREATE TABLE IF NOT EXISTS background_job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status TEXT DEFAULT 'running',
    records_processed INTEGER DEFAULT 0,
    error TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_job_logs_name_date
ON background_job_logs (job_name, started_at DESC);

-- Push Subscriptions (for Week 3)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    fcm_token TEXT,
    web_push_endpoint TEXT,
    web_push_keys JSONB,
    device_type TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, device_type)
);

-- ═══════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════

-- Function to clean up old notification_queue entries
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM notification_queue
    WHERE status = 'read'
    AND created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Function to clean up old job logs
CREATE OR REPLACE FUNCTION cleanup_old_job_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete job logs older than 90 days
    DELETE FROM background_job_logs
    WHERE started_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Notification Queue Policies
CREATE POLICY "Users can view their own notifications"
ON notification_queue FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notification_queue FOR UPDATE
USING (auth.uid() = user_id);

-- User Notification Preferences Policies
CREATE POLICY "Users can view their own preferences"
ON user_notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON user_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON user_notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Background Job Logs (admin only for now)
CREATE POLICY "Admins can view job logs"
ON background_job_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Push Subscriptions Policies
CREATE POLICY "Users can view their own push subscriptions"
ON push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions"
ON push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
ON push_subscriptions FOR DELETE
USING (auth.uid() = user_id);
