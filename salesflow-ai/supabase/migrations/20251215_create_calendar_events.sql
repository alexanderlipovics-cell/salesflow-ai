-- Create calendar_events table for CHIEF meetings and appointments
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id ON calendar_events(lead_id);

-- RLS Policy (falls RLS aktiviert ist)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Events sehen
CREATE POLICY IF NOT EXISTS "Users can view own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users können nur ihre eigenen Events erstellen
CREATE POLICY IF NOT EXISTS "Users can insert own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users können nur ihre eigenen Events updaten
CREATE POLICY IF NOT EXISTS "Users can update own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users können nur ihre eigenen Events löschen
CREATE POLICY IF NOT EXISTS "Users can delete own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE calendar_events IS 'Calendar events and meetings created by CHIEF or users';
COMMENT ON COLUMN calendar_events.lead_id IS 'Optional reference to a lead if this is a meeting with a lead';

